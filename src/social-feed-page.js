import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=61';
export function socialFeedPage(posts,{visibleCount=3,increment=10,pinnedId}={}){
 const available=posts.filter(p=>p.id!==pinnedId),count=Number.isSafeInteger(visibleCount)&&visibleCount>0?visibleCount:3,step=Number.isSafeInteger(increment)&&increment>0?increment:10;
 return {items:available.slice(0,count),hasMore:available.length>count,nextVisibleCount:Math.min(available.length,count+step)};
}
export function mountSocialFeed(root,{posts,uiState={},renderPost,pinnedId}={}){
 const d=root.ownerDocument,items=el(d,'div',{className:'sn-feed-posts'}),more=button(d,'Показать ещё',{},()=>{uiState.visibleCount=socialFeedPage(posts,{visibleCount:uiState.visibleCount??3,pinnedId}).nextVisibleCount;render();});let rendered=0;
 more.className='sn-button sn-feed-more';root.append(items,more);
 function render(){const page=socialFeedPage(posts,{visibleCount:uiState.visibleCount??3,pinnedId});for(const post of page.items.slice(rendered))items.append(renderPost(post));rendered=page.items.length;more.hidden=!page.hasMore;more.textContent='Показать ещё '+Math.min(10,posts.filter(p=>p.id!==pinnedId).length-rendered);}
 render();return {items,more};
}
