const finite = (n,fallback) => Number.isFinite(n) ? n : fallback;
const viewport = v => ({width:Math.max(1,finite(v?.width,1280)),height:Math.max(33,finite(v?.height,720))});
const area = v => ({x:0,y:0,width:v.width,height:v.height-32});
function fit(r,v) {
  const a=area(v),width=Math.min(a.width,Math.max(320,r.width)),height=Math.min(a.height,Math.max(220,r.height));
  return {x:Math.max(0,Math.min(r.x,a.width-width)),y:Math.max(0,Math.min(r.y,a.height-height)),width,height};
}
export function createWindowState(v) { return {viewport:viewport(v),windows:[],activeId:null}; }
export function reduceWindows(state,action) {
  if(action.type==='clear')return createWindowState(state.viewport);
  if(action.type==='viewport') {
    const v=viewport(action);
    return {...state,viewport:v,windows:state.windows.map(w=>({...w,rect:w.mode==='maximized'?area(v):fit(w.rect,v),restoreRect:fit(w.restoreRect,v)}))};
  }
  let windows=state.windows, w=windows.find(w=>w.id===action.id);
  const z=Math.max(0,...windows.map(w=>w.z))+1;
  if(action.type==='open'&&!w) {
    if(typeof action.id!=='string'||!action.id)return state;
    const big=['ft-studio','underweb','rap-notebook'].includes(action.appId),offset=windows.length*24;
    const normal=fit({x:120+offset,y:48+offset,width:big?940:560,height:big?620:420},state.viewport);
    const rect=action.rect&&Object.values(action.rect).length===4&&Object.values(action.rect).every(Number.isFinite)?fit(action.rect,state.viewport):normal;
    const mode=['ft-studio','rap-notebook'].includes(action.appId)||state.viewport.width<=640?'maximized':'normal';
    w={id:action.id,appId:action.appId,title:action.title,rect:mode==='maximized'?area(state.viewport):rect,restoreRect:rect,mode,restoreMode:mode,z};
    return {...state,windows:[...windows,w],activeId:w.id};
  }
  if(!w)return state;
  let next={...w},activeId=state.activeId;
  switch(action.type) {
    case 'open': case 'activate':
      next.mode=w.mode==='minimized'?w.restoreMode:w.mode;
      if(next.mode==='maximized')next.rect=area(state.viewport);
      next.z=z;activeId=w.id;break;
    case 'task':
      return reduceWindows(state,{type:state.activeId===w.id&&w.mode!=='minimized'?'minimize':'activate',id:w.id});
    case 'minimize':
      if(w.mode==='minimized')return state;
      next.restoreMode=w.mode;next.mode='minimized';if(activeId===w.id)activeId=null;break;
    case 'toggle-maximize':
      if(w.mode==='maximized') {next.mode='normal';next.rect=fit(w.restoreRect,state.viewport);}
      else {next.restoreRect=w.mode==='normal'?w.rect:w.restoreRect;next.mode='maximized';next.rect=area(state.viewport);}
      next.z=z;activeId=w.id;break;
    case 'geometry':
      if(w.mode!=='normal'||!action.rect||!['x','y','width','height'].every(k=>Number.isFinite(action.rect[k])))return state;
      next.rect=fit(action.rect,state.viewport);next.restoreRect=next.rect;break;
    case 'close':
      windows=windows.filter(item=>item.id!==w.id);
      if(activeId===w.id)activeId=null;
      break;
    default:return state;
  }
  if(action.type!=='close')windows=windows.map(item=>item.id===w.id?next:item);
  if(!activeId)activeId=[...windows].filter(w=>w.mode!=='minimized').sort((a,b)=>b.z-a.z)[0]?.id??null;
  return {...state,windows,activeId};
}
