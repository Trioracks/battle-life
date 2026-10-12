const observation=(input,key)=>input.perception.observations.find(o=>o.family===key);
const fact=(input,key)=>input.version.facts?.find(f=>f.key===key);
const positive=input=>input.evaluation.personalQuality>=6.5;
export function selectedReference(input,template){
 const refs=input.perception.recognizedReferences;
 return refs.find(r=>(!template.conditions.some(c=>c.kind==='readSource')||input.judge.knowledge?.readSourceIds?.includes(r.sourceId))&&
  (!template.conditions.some(c=>c.kind==='organicReference')||r.organic)&&
  (!template.trigger.endsWith('.forced')||r.strained));
}
export function triggerEvidence(input,tag){
 const {evaluation:e,judge,format,version}=input,ids=[],q=e.personalQuality;
 const simple=/^((?:text|music|vocal|sound)\.[a-z_]+)\.(good|bad|mixed)$/.exec(tag);
 if(simple){const o=observation(input,simple[1]);return o?.polarity===simple[2]?o.evidenceIds:null;}
 if(tag.startsWith('reaction.')){
  const polarity=q>=6.5?'good':q<=3.5?'bad':'mixed';return tag==='reaction.'+polarity||tag==='reaction.micro'&&positive(input)?[]:null;
 }
 if(tag.startsWith('text.reference.')){
  const r=input.perception.recognizedReferences.find(r=>tag.endsWith('forced')?r.strained:true);return r?.evidenceIds??null;
 }
 if(tag.startsWith('mixed.')){
  const good=k=>observation(input,k)?.polarity==='good',bad=k=>observation(input,k)?.polarity==='bad';
  let keys=[];
  if(tag==='mixed.rhymes_good_rest_bad'&&good('text.rhymes')&&['performance','music','sound'].every(k=>Number.isFinite(version.qualities[k])&&version.qualities[k]<=3.5)&&bad('text.clarity'))keys=['text.rhymes','text.clarity'];
  if(tag==='mixed.rhymes_bad_music_good'&&bad('text.rhymes')&&version.qualities.music>=6.5)keys=['text.rhymes'];
  if(tag==='mixed.images_good_sound_bad'&&good('text.images')&&bad('sound.intelligibility'))keys=['text.images','sound.intelligibility'];
  return keys.length?keys.flatMap(k=>observation(input,k).evidenceIds):null;
 }
 if(tag.startsWith('pair.')){
  if(e.decision.kind!=='pair_vote'||!Number.isFinite(e.margin))return null;
  const win=e.decision.winnerId===version.id;
  return tag==='pair.close'&&win&&e.margin<=.5||tag==='pair.clear_win'&&win&&e.margin>=2.5||tag==='pair.crushing_loss'&&!win&&e.margin>=5?ids:null;
 }
 if(tag.startsWith('format.')){
  const key=tag.startsWith('format.diss.')?'diss_addressing':tag==='format.genre.mismatch'?'genre_profile':tag==='format.text.mismatch'?'text_approach':'sound_aesthetic';
  const axis=e.formatMismatch.axes.find(a=>a.key===key);if(!axis||axis.mismatch<=0||!format)return null;
  if(key==='diss_addressing'){
   const noDiss=fact(input,'text.addressing')?.value===0||fact(input,'format.diss_addressing')?.value===0;
   const lyrical=['personal','lyrical'].includes(fact(input,'text.approach')?.value);
   if(!noDiss||!lyrical||format.axes.diss_addressing.target<.5)return null;
   if(tag.endsWith('high_concern')&&judge.formatAdherence<.7)return null;
   if(tag.endsWith('low_concern')&&(!positive(input)||judge.formatAdherence>.3))return null;
  }else if(judge.formatAdherence<=0)return null;
  return [axis.evidenceId];
 }
 return null;
}
export function conditionPasses(c,input,template){
 switch(c.kind){
  case 'limitedFacts':return input.perception.knownFactIds.length===0;
  case 'trigger':return triggerEvidence(input,c.tag)!==null;
  case 'audible':return (observation(input,'sound.intelligibility')?.value??-1)>=c.minimum;
  case 'factTrue':return fact(input,c.key)?.value===true;
  case 'readSource':return input.perception.recognizedReferences.some(r=>r.group==='literature'&&input.judge.knowledge?.readSourceIds?.includes(r.sourceId));
  case 'recognizedReference':return Boolean(selectedReference(input,template));
  case 'organicReference':return Boolean(selectedReference(input,template)?.organic);
  case 'strainedReference':return Boolean(selectedReference(input,template)?.strained);
  case 'indirectReference':return input.perception.recognizedReferences.some(r=>r.clarity<.65&&r.clarity>0);
  case 'positive':return positive(input);
  case 'adherence':return input.judge.formatAdherence>=c.min&&input.judge.formatAdherence<=c.max;
  case 'fixedContext':return input.evaluation.ok&&Boolean(input.format);
  default:return false;
 }
}
export function commentEvidence(input,template){
 const ids=[...(triggerEvidence(input,template.trigger)??[])];
 for(const c of template.conditions){
  if(c.kind==='factTrue'){const f=fact(input,c.key);if(f)ids.push(f.id);}
  if(c.kind==='audible')ids.push(...(observation(input,'sound.intelligibility')?.evidenceIds??[]));
 }
 if(template.text.includes('{referenceTitle}'))ids.push(...(selectedReference(input,template)?.evidenceIds??[]));
 return [...new Set(ids)];
}
