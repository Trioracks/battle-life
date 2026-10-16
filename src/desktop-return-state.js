// Presentation-only bookmarks. Never persisted as game state or used to reopen another app.
export function captureDesktopReturn(root){
 const all=()=>[root,...root.querySelectorAll('*')];
 const path=node=>{const indices=[];while(node&&node!==root){indices.unshift([...node.parentElement.children].indexOf(node));node=node.parentElement;}return indices;};
 const bookmark=node=>({node,path:path(node),id:node.id,focusId:node.dataset?.focusId,resultId:node.dataset?.resultSummary,label:node.getAttribute?.('aria-label'),tag:node.tagName,text:node.textContent?.slice(0,160)});
 const focus=root.contains(root.ownerDocument.activeElement)?bookmark(root.ownerDocument.activeElement):null;
 const scrolls=all().filter(n=>n.scrollTop||n.scrollLeft).map(node=>({...bookmark(node),top:node.scrollTop,left:node.scrollLeft}));
 function find(mark){
  if(root.contains(mark.node))return mark.node;
  const named=all().find(n=>mark.id&&n.id===mark.id||mark.resultId&&n.dataset?.resultSummary===mark.resultId||mark.focusId&&n.dataset?.focusId===mark.focusId||mark.label&&n.getAttribute?.('aria-label')===mark.label);
  if(named)return named;let node=root;for(const i of mark.path)node=node?.children[i];return node?.tagName===mark.tag?node:null;
 }
 return {restore(){for(const mark of scrolls){const node=find(mark);if(node){node.scrollTop=mark.top;node.scrollLeft=mark.left;}}if(focus)find(focus)?.focus?.({preventScroll:true});}};
}
