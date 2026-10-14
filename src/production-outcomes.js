// Realized production results. No current character skill is read during judging.
import {creativeProfileAmount} from './audio-performance.js?rev=41';
import {normalizeContentMix} from './text-content-mix.js?rev=41';
export const PRODUCTION_FAMILIES=Object.freeze([
 'text.clarity','text.theme','text.personal','text.rhymes','text.line_rhythm','text.complexity','text.images','text.originality','text.image_density',
 'music.groove','music.movement','music.fills','music.melody','music.harmony','music.texture','music.repetition','music.development','music.transitions',
 'vocal.timing','vocal.diction','vocal.delivery','sound.balance','sound.intelligibility','text.story','text.reference','text.addressing'
]);
const axes=['text','performance','music','sound'];
const origins=new Set(['production-simulation','audio-recipe','source-metadata','legacy-observed']);
const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=(v,max=100)=>Math.max(0,Math.min(max,v));
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
function empty(){return {schemaVersion:1,components:{},qualities:Object.fromEntries(axes.map(k=>[k,null])),facts:[],availability:Object.fromEntries(PRODUCTION_FAMILIES.map(k=>[k,'unknown']))};}
function add(out,key,value,origin,evidence,id=key){
 out.facts.push({id,key,value,origin,evidence});
 out.availability[key]='known';
 if(typeof value==='number')out.components[key]={value,origin,evidence};
}
export function normalizeProductionOutcome(raw){
 if(raw?.schemaVersion!==1||!Array.isArray(raw.facts)||!raw.qualities)return null;
 const out=empty(),seen=new Set();
 for(const f of raw.facts){
  if(!f||typeof f.id!=='string'||!f.id||seen.has(f.id)||typeof f.key!=='string'||!origins.has(f.origin)||!Array.isArray(f.evidence)||f.value===undefined)continue;
  if(typeof f.value==='number'&&!Number.isFinite(f.value))continue;
  seen.add(f.id);add(out,f.key,clone(f.value),f.origin,clone(f.evidence),f.id);
 }
 for(const key of axes)out.qualities[key]=Number.isFinite(raw.qualities[key])?clamp(raw.qualities[key],10):null;
 return out;
}
export function lyricOutcomes({project,stage=null,referenceUses=project?.referenceUses??[]}={}){
 const out=empty(),keys=PRODUCTION_FAMILIES.slice(0,9),targets=[[8,7,6],[8,8,5],[8,7,5]];
 for(const [i,s]of (project?.stages??[]).entries()){
  if(i>2||s.resultVersion!==1&&stage!==i||!Number.isFinite(s.skill)||!s.sliders?.every(Number.isFinite))continue;
  for(let k=0;k<3;k++){
   const key=keys[i*3+k],value=clamp(s.skill)*(.55+.45*(1-Math.abs(clamp(s.sliders[k],10)-targets[i][k])/10));
   add(out,key,value,'production-simulation',[{path:'stages['+i+']',skill:s.skill,decision:s.sliders[k],target:targets[i][k]}],'lyrics:'+project.id+':'+key);
  }
 }
 out.qualities.text=mean(keys.filter(k=>out.components[k]).map(k=>out.components[k].value/10));
 // The simulator describes the symbolic authored work, never transcribes the source vocal.
 for(const addition of project?.additions??[]){
  if(addition.resultVersion!==1)continue;
  const key=addition.kind==='story'?'text.story':addition.kind==='diss'?'text.addressing':null;
  if(key){out.facts=out.facts.filter(f=>f.key!==key);add(out,key,clamp(addition.skill),'production-simulation',[{path:'additions',action:addition.kind}],'lyrics:'+project.id+':'+key);}
 }
 const mix=normalizeContentMix(project?.contentMix);
 if(mix)add(out,'text.contentMix',mix,'production-simulation',[{path:'contentMix',policyVersion:project.contentPolicyVersion??2}],'lyrics:'+project.id+':content-mix');
 if(referenceUses.length)add(out,'text.reference',clone(referenceUses),'production-simulation',[{path:'referenceUses',count:referenceUses.length}],'lyrics:'+project.id+':references');
 return out;
}
export function beatOutcomes({result,recipe,descriptor}={}){
 const out=empty(),layers=descriptor?.parts.filter(p=>p.result&&!p.songSection).map(p=>p.result)??recipe?.mix?.layers?.filter(Boolean)??(result?[result]:[]);
 const qualities=layers.filter(r=>Number.isFinite(r.quality)).map(r=>clamp(r.quality,100)/10);
 out.qualities.music=mean(qualities);
 if(recipe){
  add(out,'music.genre',recipe.genre??null,'audio-recipe',[{path:'recipe.genre'}],'beat:genre');
  add(out,'music.form',descriptor?.durationSeconds>11?'intro-verse-outro':'working-loop','audio-recipe',[{path:'descriptor.parts.windows',windows:descriptor?.parts.map(p=>p.windows??null)}],'beat:form');
 }
 const rhythm=layers.find(r=>r.stage===0);
 if(rhythm&&Number.isFinite(rhythm.skills?.beatmaking)){
  const amount=clamp(100-rhythm.quality)/100;
  const jitter=Math.min((1/6)*.42,(.009+.085*(1-rhythm.skills.beatmaking/100))*amount**1.5);
  add(out,'audio.beatTimingJitterSeconds',jitter,'audio-recipe',[{path:'parts[0].result',quality:rhythm.quality,beatmaking:rhythm.skills.beatmaking}],'beat:timing-warp');
  add(out,'music.groove',100*(1-Math.min(1,jitter/((1/6)*.42))),'audio-recipe',[{path:'audio.beatTimingJitterSeconds',value:jitter}],'beat:groove');
 }
 for(const layer of layers.filter(r=>r.stage===1||r.stage===2)){
  if(!Number.isFinite(layer.skills?.beatmaking)||!Number.isFinite(layer.quality))continue;
  const medium=clamp((100-layer.quality)/70,1),rough=clamp((30-layer.quality)/25,1);
  const cents=((layer.stage===1?85:-120)*medium+(layer.stage===1?100:-140)*rough)*(.85+.15*(1-layer.skills.beatmaking/100));
  add(out,'audio.detuneCents.'+layer.stage,cents,'audio-recipe',[{path:'parts['+layer.stage+'].result',quality:layer.quality}],'beat:detune:'+layer.stage);
 }
 // A mixed source does not prove that melody is absent, clipping occurs, or a
 // particular chord was played. Those critic families remain explicitly unknown.
 return out;
}
export function vocalOutcomes({take,recording,descriptor}={}){
 const out=empty();if(!take)return out;
 const keys=['vocal.timing','vocal.diction','vocal.delivery'],s=take.skills;
 if(take.resultVersion===1&&s&&take.sliders?.length===3){
  const abilities=[s.flow*.7+s.musicality*.3,s.flow*.7+s.confidence*.3,s.confidence*.6+s.flow*.4];
  for(let i=0;i<3;i++){
   if(!Number.isFinite(abilities[i]))continue;
   const value=clamp(abilities[i]*(.55+.45*(1-Math.abs(take.sliders[i]-8)/10))+(take.kind==='clean'?3:0));
   add(out,keys[i],value,'production-simulation',[{path:'activeTake',skills:clone(s),decision:take.sliders[i],target:8}],'vocal:'+keys[i]);
  }
  out.qualities.performance=mean(keys.filter(k=>out.components[k]).map(k=>out.components[k].value/10));
 }
 const profile=descriptor?.parts.find(p=>p.vocal)?.vocal;
 const post=(recording?.mix?2:0)+(recording?.master?2:0);
 const quality=Number.isFinite(profile?.quality)?profile.quality:Number.isFinite(take.quality)?Math.min(take.ceiling??44,take.quality+post):null;
 out.qualities.sound=quality===null?null:clamp(quality)/10;
 if(quality!==null){
  add(out,'sound.intelligibility',quality,'audio-recipe',[{path:'activeTake.quality',value:quality,meaning:'simulation of hardware and processing, not a transcript score'}],'vocal:intelligibility');
  add(out,'audio.microphone',take.equipment?.microphone??null,'source-metadata',[{path:'activeTake.equipment'}],'vocal:microphone');
 }
 if(profile){
  add(out,'audio.vocalGainDb',profile.vocalGainDb,'audio-recipe',[{path:'descriptor.parts.vocal.vocalGainDb'}],'vocal:gain');
  add(out,'audio.intentionalEffects',creativeProfileAmount(profile.genreProfile,profile.skills?.flow,profile.postGain),'audio-recipe',[{path:'descriptor.parts.vocal.genreProfile'}],'vocal:creative');
 }
 return out;
}
export function combineProductionOutcomes(...items){
 const out=empty();
 for(const item of items){const n=normalizeProductionOutcome(item);if(!n)continue;Object.assign(out.components,n.components);Object.assign(out.availability,Object.fromEntries(Object.entries(n.availability).filter(([,v])=>v==='known')));out.facts.push(...n.facts);for(const key of axes)if(n.qualities[key]!==null)out.qualities[key]=n.qualities[key];}
 return out;
}
