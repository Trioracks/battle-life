import {creatorDocument} from './creator-dom.js';
export function pcDocument() {
  const d=creatorDocument(),create=d.createElement;
  d.createElement=tag=>{
    const n=create(tag);
    n.remove=()=>{if(n.parentElement){const p=n.parentElement;p.children=p.children.filter(c=>c!==n);n.parentElement=null;}};
    n.append=(...nodes)=>{for(const c of nodes){c.remove?.();c.parentElement=n;n.children.push(c);}};
    n.style.removeProperty=key=>n.attributes.delete('style:'+key);
    n.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:1280,bottom:720,width:1280,height:720});
    n.setPointerCapture=()=>{};n.releasePointerCapture=()=>{};
    n.closest=selector=>{let p=n;while(p){if(selector.split(',').some(s=>s.trim().toUpperCase()===p.tagName))return p;p=p.parentElement;}return null;};
    Object.defineProperty(n,'isConnected',{get:()=>!!n.parentElement});
    return n;
  };
  return d;
}
export function allPc(root){return [root,...root.children.flatMap(allPc)];}
export function findPc(root,role,id){return allPc(root).find(n=>n.dataset.pcRole===role&&(id===undefined||n.dataset.windowId===id));}
export function findButton(root,name){return allPc(root).find(n=>n.tagName==='BUTTON'&&(n.getAttribute('aria-label')===name||n.textContent===name));}
export function fire(node,type,props={}){const e=new Event(type,{cancelable:true});for(const [key,value]of Object.entries(props))Object.defineProperty(e,key,{value});node.dispatchEvent(e);return e;}
