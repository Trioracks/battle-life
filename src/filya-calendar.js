import {FILYA_CARDS,FILYA_RELEASES,normalizeFilya} from './filya-catalog.js?rev=60';
import {validGameMinute} from './game-minute.js?rev=60';
const day=1440;
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
const order=(cards,seed)=>[...cards].sort((a,b)=>hash(seed+':'+a.id)-hash(seed+':'+b.id)||a.id.localeCompare(b.id));
function nextTime(f,at){const h=hash(f.seed+':time:'+f.posts.length);return Math.floor(at/day)*day+(25+h%12)*day+487+(h>>>8)%827;}
export function advanceFilya(input,now,{random=Math.random}={}){
 if(!validGameMinute(now))return {state:input,changed:false};
 const old=input.social?.filya;
 if(old?.startedAt!=null&&(now<old.startedAt||old.nextAt==null||old.nextAt>now))return {state:input,changed:false};
 const f=normalizeFilya(old);
 if(f.startedAt==null){
  f.startedAt=now;f.seed=Math.floor(Math.max(0,Math.min(.999999999,Number(random())||0))*4294967296);
  const candidates=order(FILYA_CARDS.filter(c=>c.photo),f.seed);
  const first=candidates.find(c=>c.releaseId),initial=[first,candidates.find(c=>c!==first)];
  f.posts=initial.map((c,i)=>{
   const h=hash(f.seed+':archive:'+i),year=2011+i,month=i===0?10:3,date=3+h%24,hour=7+(h>>>8)%16,minute=1+(h>>>16)%58;
   return {id:'filya:'+c.id,cardId:c.id,at:(Date.UTC(year,month-1,date,hour,minute)-Date.UTC(2012,8,1))/60000,
    dateLabel:[date,month].map(n=>String(n).padStart(2,'0')).join('.')+'.'+year+' '+[hour,minute].map(n=>String(n).padStart(2,'0')).join(':')};
  });
  f.queue=order(FILYA_CARDS.filter(c=>!initial.includes(c)),f.seed+':queue').map(c=>c.id);f.nextAt=nextTime(f,now);
 }
 // At most 23 new authored posts even after a huge time skip. No media work here.
 while(f.nextAt!==null&&f.nextAt<=now&&f.queue.length){
  const cardId=f.queue.shift(),at=f.nextAt;f.posts.push({id:'filya:'+cardId,cardId,at});
  f.nextAt=f.queue.length?nextTime(f,at):null;
 }
 return {state:{...input,social:{...input.social,filya:f}},changed:true};
}
export function filyaPublicPosts(state,now){
 return (state.social?.filya?.posts??[]).filter(p=>p.at<=now).map(p=>{
  const card=FILYA_CARDS.find(c=>c.id===p.cardId);
  return {...card,...p,release:FILYA_RELEASES.find(r=>r.id===card.releaseId),comment:'Гоблин Ссаблей: '+card.comment};
 }).sort((a,b)=>b.at-a.at);
}
