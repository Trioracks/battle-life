import {pcElement as el} from './virtual-pc-dom.js?rev=42';
import {socialButton} from './social-dom.js?rev=42';
const labels={battle:'ДЕЛО',round:'РАУНД',judge:'СУДЬЯ',opponent:'СОПЕРНИК',track:'ЗАПИСЬ',forecast:'ПРЕДПОЛОЖЕНИЕ',person:'ЧЕЛОВЕК'};
export function forecastText(f){return f?.range?f.range.map(n=>Math.round(n)).join('–')+' · ориентир':f?.comparison?.text??'Пока не хватает наблюдений';}
// Fixed columns, ordered rows, and a dedicated note under its recording. This
// is a paper layout, not a force simulation; the graph remains authoritative.
export function dossierBoardLayout(graph){
 const positions=new Map(),counts={},forecastCounts=new Map();let trackY=210;
 for(const n of graph.nodes.filter(n=>n.kind==='forecast'))forecastCounts.set(n.layout?.parentId,(forecastCounts.get(n.layout?.parentId)??0)+1);
 for(const n of graph.nodes.filter(n=>n.kind!=='forecast')){
  const i=counts[n.kind]??0;counts[n.kind]=i+1;
  const x={judge:20,round:202,battle:390,track:590,opponent:790,person:20}[n.kind]??20;
  const y=n.kind==='battle'?30:n.kind==='opponent'?210:n.kind==='track'?trackY:210+i*158;
  if(n.kind==='track')trackY+=140+(forecastCounts.get(n.id)??0)*110;
  const compact=graph.id==='recordings'||graph.id==='archive'||graph.id.startsWith('target:');positions.set(n.id,{x:compact?(i%3)*200+30:x,y:compact?30+Math.floor(i/3)*160:y,width:166,height:n.kind==='battle'?150:108});
 }
 const forecastRows=new Map();for(const n of graph.nodes.filter(n=>n.kind==='forecast')){const parentId=n.layout?.parentId,parent=positions.get(parentId),i=forecastRows.get(parentId)??0;forecastRows.set(parentId,i+1);positions.set(n.id,{x:parent?.x??590,y:(parent?.y??30)+124+i*110,width:166,height:94});}
 const width=Math.max(620,...[...positions.values()].map(p=>p.x+p.width+24)),height=Math.max(440,...[...positions.values()].map(p=>p.y+p.height+30));
 for(const n of graph.nodes.filter(n=>n.kind==='battle'))positions.get(n.id).x=(width-positions.get(n.id).width)/2;
 return {positions,width,height};
}
export function mountDossierBoard(root,{graph,selectedId,onSelect}){
 const d=root.ownerDocument,layout=dossierBoardLayout(graph),surface=el(d,'div',{className:'rd-board-surface'}),canvas=el(d,'div',{className:'rd-board-canvas',attributes:{'aria-label':'Связи дела'}}),svg=d.createElementNS('http://www.w3.org/2000/svg','svg'),cards=new Map();let disposed=false;
 svg.setAttribute('class','rd-threads');svg.setAttribute('aria-hidden','true');svg.setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);svg.setAttribute('width',layout.width);svg.setAttribute('height',layout.height);
 for(const e of graph.edges){const a=layout.positions.get(e.from),b=layout.positions.get(e.to);if(!a||!b)continue;const line=d.createElementNS('http://www.w3.org/2000/svg','line');for(const [k,v]of Object.entries({x1:a.x+a.width/2,y1:a.y+9,x2:b.x+b.width/2,y2:b.y+9,'data-edge-kind':e.kind}))line.setAttribute(k,v);svg.append(line);}
 canvas.append(svg);
 for(const n of graph.nodes){const p=layout.positions.get(n.id),card=socialButton(d,'',()=>{if(!disposed)onSelect(n.id);},{className:'rd-node rd-node-'+n.kind,dataset:{dossierNode:n.id,boardX:String(p.x),boardY:String(p.y)},attributes:{'aria-label':(labels[n.kind]??'Карточка')+': '+n.title,'aria-pressed':String(selectedId===n.id)}});
  card.style.setProperty('--node-x',p.x+'px');card.style.setProperty('--node-y',p.y+'px');card.style.setProperty('--node-width',p.width+'px');card.style.setProperty('--node-height',p.height+'px');
  card.append(el(d,'span',{className:'rd-pin',attributes:{'aria-hidden':'true'}}),el(d,'small',{className:'rd-node-kind',text:labels[n.kind]??'ЗАМЕТКА'}),el(d,'strong',{text:n.title}),el(d,'span',{className:'rd-node-caption',text:n.kind==='forecast'?forecastText(n.forecast):n.status==='studied'?'Есть наблюдения':n.status==='available'?'Источник доступен':'Пока неизвестно'}));
  cards.set(n.id,card);canvas.append(card);
 }
 canvas.style.setProperty('width',layout.width+'px');canvas.style.setProperty('height',layout.height+'px');surface.append(canvas);root.replaceChildren(surface);
 const fit=()=>{
  if(disposed)return;const rect=root.getBoundingClientRect(),shellWidth=root.parentElement?.parentElement?.getBoundingClientRect?.().width??rect.width;
  if(shellWidth<600){surface.dataset.boardMode='list';surface.style.setProperty('height','auto');canvas.style.setProperty('transform','none');return;}
  surface.dataset.boardMode='board';const width=Math.max(0,rect.width-24),height=Math.max(0,rect.height-24),scale=Math.min(1,Math.max(.72,Math.min(width/layout.width,height/layout.height))),x=Math.max(0,(width-layout.width*scale)/2),y=Math.max(0,(height-layout.height*scale)/2);
  canvas.style.setProperty('transform',`translate(${x}px, ${y}px) scale(${scale})`);surface.style.setProperty('width',Math.max(width,layout.width*scale)+'px');surface.style.setProperty('height',Math.max(height,layout.height*scale)+'px');
 };
 const Observer=d.defaultView?.ResizeObserver??globalThis.ResizeObserver,observer=Observer?new Observer(fit):null;observer?.observe(root);fit();
 return {fit,select(id){for(const [key,card]of cards)card.setAttribute('aria-pressed',String(key===id));},focus(id){cards.get(id)?.focus?.({preventScroll:true});},dispose(){disposed=true;observer?.disconnect();root.replaceChildren();}};
}
