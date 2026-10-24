export function pcElement(document,tag,options={}) {
  const n=document.createElement(tag);
  if(options.className)n.className=options.className;
  if(options.text!==undefined)n.textContent=options.text;
  if(options.type)n.type=options.type;
  if(options.value!==undefined)n.value=options.value;
  if(options.id)n.id=options.id;
  if(options.dataset)Object.assign(n.dataset,options.dataset);
  for(const [k,v]of Object.entries(options.attributes??{}))n.setAttribute(k,v);
  if(['button','input','select'].includes(tag))n.dataset.focusId=options.attributes?.['aria-label']??options.text??'';
  return n;
}
export function pcButton(document,text,options={},handler=()=>{}) {
  const n=pcElement(document,'button',{...options,text,type:'button'});n.addEventListener('click',handler);return n;
}
export function pcFocusable(root,out=[]) {
  if(!root||root.hidden||root.inert)return out;
  const tabindex=root.getAttribute?.('tabindex');
  const summary=root.tagName==='SUMMARY'&&root.parentElement?.tagName==='DETAILS'&&[...root.parentElement.children].find(n=>n.tagName==='SUMMARY')===root;
  const native=['BUTTON','INPUT','SELECT','TEXTAREA'].includes(root.tagName)||summary;
  const explicit=tabindex!==null&&tabindex!==undefined&&Number(tabindex)>=0;
  if((native||explicit)&&!root.disabled&&root.tabIndex!==-1&&tabindex!=='-1')out.push(root);
  const children=root.tagName==='DETAILS'&&!root.open?[...root.children??[]].filter(n=>n.tagName==='SUMMARY').slice(0,1):root.children??[];
  for(const child of children)pcFocusable(child,out);
  return out;
}
export function pcFind(root,predicate) {
  if(predicate(root))return root;
  for(const c of root.children??[]){const found=pcFind(c,predicate);if(found)return found;}
  return null;
}
