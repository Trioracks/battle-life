import {PC_IDENTITY} from './pc-identity.js?rev=58';
import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=58';
import {createPcIcon} from './virtual-pc-icons.js?rev=58';

export function mountPcMenu(root,{onDismiss=()=>{}}={}) {
  const d=root.ownerDocument,host=root.parentElement??root;let stack=[],origin=null,disposed=false;
  function close(restore=true){
    if(!stack.length)return;stack=[];root.replaceChildren();
    if(restore&&origin?.isConnected)origin.focus?.();onDismiss();
  }
  function place(node,x,y){
    const bounds=root.getBoundingClientRect(),r=node.getBoundingClientRect();
    node.style.setProperty('left',Math.max(0,Math.min(x,bounds.width-r.width))+'px');
    node.style.setProperty('top',Math.max(0,Math.min(y,bounds.height-32-r.height))+'px');
    node.style.setProperty('max-height',Math.max(80,bounds.height-40)+'px');
    node.style.setProperty('max-width',bounds.width+'px');
  }
  function build(items,x,y,anchor,level=0,options={}){
    while(stack.length>level)stack.pop().node.remove();
    const isStart=options.variant==='start';
    const node=el(d,'aside',{className:'pc-popup'+(isStart?' pc-start-menu':''),dataset:{pcRole:isStart?'start-menu':'context-menu'},attributes:{role:'menu','aria-label':isStart?'Меню '+PC_IDENTITY.menuLabel:'Контекстное меню'}});
    const record={node,items,buttons:[],anchor};stack.push(record);root.append(node);
    let left=node,right=node,footer=node;
    if(isStart){
      const header=el(d,'header',{className:'pc-start-profile'});
      header.append(createPcIcon(d,'computer',{size:40}),el(d,'strong',{text:options.playerName??'Игрок'}));
      const columns=el(d,'div',{className:'pc-start-columns'});left=el(d,'div',{className:'pc-start-left'});right=el(d,'div',{className:'pc-start-right'});
      columns.append(left,right);footer=el(d,'footer',{className:'pc-start-footer'});node.append(header,columns,footer);
    }
    for(const item of items){
      const b=button(d,'',{className:'pc-menu-item',dataset:{menuId:item.id},attributes:{role:'menuitem','aria-label':item.label}},()=>activate(item,b,level));
      b.disabled=!!item.disabled;
      if(item.iconId)b.append(createPcIcon(d,item.iconId,{size:isStart?28:16}));
      b.append(el(d,'span',{text:item.label}));if(item.items){b.setAttribute('aria-haspopup','menu');b.append(el(d,'span',{className:'pc-menu-arrow',text:'▶'}));}
      (item.column==='right'?right:item.column==='footer'?footer:left).append(b);record.buttons.push(b);
    }
    place(node,x,y);pcFocusable(node)[0]?.focus();return record;
  }
  function activate(item,b,level){
    if(item.disabled)return;
    if(item.items){const r=b.getBoundingClientRect();build(item.items,r.right-2,r.top,b,level+1);return;}
    close();item.onSelect?.();
  }
  const keydown=e=>{
    if(!stack.length)return;
    const rec=stack.at(-1),controls=rec.buttons.filter(b=>!b.disabled),index=controls.indexOf(d.activeElement);
    if(['Escape','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Enter','Home','End','Tab'].includes(e.key)){
      e.preventDefault();e.stopPropagation();
      if(e.key==='Escape'){close();return;}
      if(e.key==='ArrowLeft'&&stack.length>1){stack.pop().node.remove();rec.anchor?.focus();return;}
      if(e.key==='Enter'||e.key==='ArrowRight'){
        const b=controls[Math.max(index,0)],item=rec.items[rec.buttons.indexOf(b)];
        if(item&&(e.key==='Enter'||item.items))activate(item,b,stack.length-1);return;
      }
      const offset=e.key==='ArrowUp'||(e.key==='Tab'&&e.shiftKey)?-1:1;
      const next=e.key==='Home'?0:e.key==='End'?controls.length-1:(index+offset+controls.length)%controls.length;
      controls[next]?.focus();
    }
  };
  const outside=e=>{if(stack.length&&!root.contains(e.target)&&e.target!==origin&&!origin?.contains?.(e.target))close(false);};
  root.addEventListener('keydown',keydown);host.addEventListener('pointerdown',outside,true);
  return {open(options){if(disposed)return;close(false);origin=options.anchor??d.activeElement;build(options.items,options.x??0,options.y??0,origin,0,options);},
    close,dispose(){close(false);disposed=true;root.removeEventListener('keydown',keydown);host.removeEventListener('pointerdown',outside,true);}};
}
