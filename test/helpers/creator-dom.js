// Node has no document. This small DOM boundary adapter implements only the
// element/event/focus semantics used by mountCreator; the mounted UI and its
// handlers are production code. Layout/native keyboard behavior is browser QA.
export function creatorDocument(){
  const document={activeElement:null,createElement(tag){return new Element(tag);},createElementNS(namespace,tag){return new Element(tag);}};
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

