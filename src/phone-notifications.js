export function enqueueNotification(queue, notification) {
  if (!notification?.sender || !notification?.text) throw new Error('Уведомлению нужны отправитель и текст.');
  return [...queue, { sender: notification.sender, text: notification.text }];
}

export function dequeueNotification(queue) {
  return { notification: queue[0] ?? null, queue: queue.slice(1) };
}

const clone=value=>JSON.parse(JSON.stringify(value));
const strings=value=>[...new Set((Array.isArray(value)?value:[]).filter(id=>typeof id==='string'&&id.length>0))];
const notice=e=>e&&typeof e.id==='string'&&typeof e.source==='string'&&typeof e.sender==='string'&&typeof e.text==='string'&&Number.isFinite(e.dueAt)&&e.dueAt>=0;
export function normalizePhone(raw){
 const dismissedIds=strings(raw?.dismissedIds),seen=new Set(),queue=(Array.isArray(raw?.queue)?raw.queue:[]).filter(e=>notice(e)&&!dismissedIds.includes(e.id)&&!seen.has(e.id)&&seen.add(e.id)).map(clone).sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id));
 const activeId=queue.some(e=>e.id===raw?.activeId)?raw.activeId:queue[0]?.id??null;
 return {schemaVersion:1,queue,activeId,hoveredIds:strings(raw?.hoveredIds).filter(id=>queue.some(e=>e.id===id)),dismissedIds};
}
export function receivePhoneEvents(phone,events){
 const current=normalizePhone(phone);return normalizePhone({...current,queue:[...current.queue,...(Array.isArray(events)?events:[])]});
}
export function retirePhoneNotices(phone,ids){
 const targets=new Set(ids),retired=(phone?.queue??[]).filter(e=>e.type==='community-post'&&targets.has(e.id));
 if(!retired.length)return phone;
 return normalizePhone({...phone,dismissedIds:[...(phone.dismissedIds??[]),...retired.map(e=>e.id)]});
}
export function hoverPhoneNotice(phone,eventId,inside){
 const current=normalizePhone(phone);if(current.activeId!==eventId)return current;
 if(inside)return {...current,hoveredIds:strings([...current.hoveredIds,eventId])};
 if(!current.hoveredIds.includes(eventId))return current;
 return normalizePhone({...current,queue:current.queue.filter(e=>e.id!==eventId),activeId:null,hoveredIds:current.hoveredIds.filter(id=>id!==eventId),dismissedIds:[...current.dismissedIds,eventId]});
}
