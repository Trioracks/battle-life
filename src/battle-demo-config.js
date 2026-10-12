import config from '../data/battles/demo-v2.json' with {type:'json'};
import {JUDGE_PROFILES} from './judge-profiles.js?rev=39';
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const DEMO_BATTLE=freeze(config);
export const DEMO_PARTICIPANTS=DEMO_BATTLE.participants;
export function battleCharacter(characterId){
 const participant=DEMO_PARTICIPANTS.find(p=>p.characterId===characterId);
 if(participant)return structuredClone(participant);
 const judge=JUDGE_PROFILES.find(p=>p.id===characterId);
 return judge?{characterId:judge.id,nickname:judge.displayName??judge.name,roles:['judge'],sourceRefs:[...judge.sourceRefs]}:null;
}
