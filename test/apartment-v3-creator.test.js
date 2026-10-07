import test from 'node:test';
import assert from 'node:assert/strict';
const creator=await import('../src/apartment-v3-creator.js').catch(()=>({}));

test('category selection frames the corresponding body zone and full body is recoverable',()=>{
  assert.equal(typeof creator.CreatorSelection,'function','creator selection controller must exist');
  const ui=new creator.CreatorSelection();
  ui.category('mustache');assert.equal(ui.zone,'head');
  ui.category('footwear');assert.equal(ui.zone,'footwear');
  ui.frame('body');assert.equal(ui.zone,'body');
  ui.frame('unknown');assert.equal(ui.zone,'body');
});
test('independent swatches survive category changes in selection state',()=>{
  assert.equal(typeof creator.CreatorSelection,'function');
  const ui=new creator.CreatorSelection();
  ui.category('top');ui.select('top','hoodie');ui.select('topColor','red');
  ui.category('bottom');ui.select('bottomColor','yellow');ui.category('top');
  assert.equal(ui.appearance.topColor,'red');assert.equal(ui.appearance.bottomColor,'yellow');
  assert.equal(ui.options().find(x=>x.id==='hoodie').pressed,true);
  assert.deepEqual(ui.swatches().find(x=>x.id==='red'),{id:'red',label:'Красный',pressed:true,color:'#b73535'});
  ui.select('top','invalid');assert.equal(ui.appearance.top,'hoodie');
  ui.reset();assert.equal(ui.appearance.top,'tee');assert.equal(ui.appearance.topColor,'white');
});

// Node has no document. This small DOM boundary adapter implements only the
// element/event/focus semantics used by mountCreator; the mounted UI and its
// handlers are production code. Layout/native keyboard behavior is browser QA.
function creatorDocument(){
  const document={activeElement:null,createElement(tag){return new Element(tag);}};
  class Element extends EventTarget{
    constructor(tag){
      super();this.tagName=tag.toUpperCase();this.ownerDocument=document;
      this.children=[];this.parentElement=null;this.dataset={};this.attributes=new Map();
      this.style={setProperty:(key,value)=>this.attributes.set('style:'+key,value)};
    }
    setAttribute(key,value){this.attributes.set(key,String(value));}
    getAttribute(key){return this.attributes.get(key)??null;}
    append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
    contains(node){return node===this||this.children.some(child=>child.contains(node));}
    replaceChildren(...children){
      if(this.children.some(child=>child.contains(document.activeElement)))document.activeElement=null;
      for(const child of this.children)child.parentElement=null;
      this.children=[];this.append(...children);
    }
    focus(){document.activeElement=this;}
    click(){this.dispatchEvent(new Event('click'));}
  }
  return document;
}

test('mounted creator activates labeled buttons, retains focused controls and restores selections after category rerender',()=>{
  const doc=creatorDocument(),root=doc.createElement('section'),changes=[];
  creator.mountCreator(root,appearance=>changes.push({...appearance}));
  const byClass=name=>root.children.find(child=>child.className===name);
  const tabs=byClass('look-categories'),choices=byClass('look-options'),palette=byClass('look-palette'),current=byClass('look-current');
  const category=id=>tabs.children.find(button=>button.dataset.category===id);
  const option=id=>choices.children.find(button=>button.dataset.option===id);
  const swatch=id=>palette.children.find(button=>button.dataset.color===id);
  const pressed=element=>element.getAttribute('aria-pressed');

  assert.equal(tabs.getAttribute('aria-label'),'Категория внешности');
  assert.equal(choices.getAttribute('role'),'group');
  assert.equal(palette.getAttribute('role'),'group');
  assert.equal(current.getAttribute('aria-live'),'polite');
  for(const button of tabs.children){assert.equal(button.tagName,'BUTTON');assert.equal(button.type,'button');assert.ok(button.textContent.length>0);}

  category('hair').click();
  assert.equal(palette.hidden,true);
  category('top').focus();category('top').click();
  assert.equal(doc.activeElement,category('top'));
  assert.equal(pressed(category('top')),'true');assert.equal(pressed(category('hair')),'false');
  assert.equal(choices.getAttribute('aria-label'),'Верх');
  assert.equal(palette.getAttribute('aria-label'),'Цвет: Верх');assert.equal(palette.hidden,false);

  const hoodie=option('hoodie');
  assert.equal(hoodie.tagName,'BUTTON');assert.equal(hoodie.type,'button');assert.equal(hoodie.textContent,'Худи');
  hoodie.focus();hoodie.click();
  assert.equal(doc.activeElement,hoodie,'option update must retain focus');
  assert.equal(option('hoodie'),hoodie,'option update must retain its DOM node');
  assert.equal(pressed(hoodie),'true');assert.equal(pressed(option('tee')),'false');
  assert.equal(current.textContent,'Верх / Худи');assert.equal(changes.at(-1).top,'hoodie');

  const red=swatch('red');
  assert.equal(red.type,'button');assert.equal(red.textContent,'Красный');assert.equal(red.getAttribute('aria-label'),'Цвет: Красный');
  red.focus();red.click();
  assert.equal(doc.activeElement,red,'swatch update must retain focus');
  assert.equal(swatch('red'),red,'swatch update must retain its DOM node');
  assert.equal(pressed(red),'true');assert.equal(pressed(swatch('white')),'false');
  assert.equal(changes.at(-1).topColor,'red');

  category('bottom').click();
  assert.equal(pressed(category('top')),'false');assert.equal(pressed(category('bottom')),'true');
  assert.equal(choices.getAttribute('aria-label'),'Низ');assert.equal(palette.getAttribute('aria-label'),'Цвет: Низ');
  option('shorts').click();swatch('yellow').click();
  category('top').click();
  assert.notEqual(option('hoodie'),hoodie,'category return mounts fresh category contents');
  assert.equal(pressed(option('hoodie')),'true');assert.equal(pressed(swatch('red')),'true');
  assert.equal(current.textContent,'Верх / Худи');
  category('bottom').click();
  assert.equal(pressed(option('shorts')),'true');assert.equal(pressed(swatch('yellow')),'true');
  assert.equal(changes.length,4,'category navigation must not change the live appearance');
  assert.equal(changes.at(-1).topColor,'red');assert.equal(changes.at(-1).bottomColor,'yellow');
});
test('zoom clamps to a usable framing range',()=>{
  assert.equal(typeof creator.CreatorSelection,'function');
  const ui=new creator.CreatorSelection();
  ui.setZoom(999);assert.equal(ui.zoom,1.5);
  ui.setZoom(-10);assert.equal(ui.zoom,.8);
});
