import {createVirtualPcState} from '../../src/virtual-pc-state.js';
import {createBeat} from '../../src/beat-production.js';
import {createLyric} from '../../src/lyric-production.js';
export function creativeFixture(kind,{skill=10,satiety=100,energy=100}={}){
 const skills={beatmaking:skill,writing:skill,sound:skill};
 const seed=createVirtualPcState({power:'on',music:{needs:{satiety,energy}}});
 const create=kind==='beat'?createBeat:createLyric;
 const projectId=kind+'-one';
 const result=create(seed,{id:projectId,name:'Ночной район',gameDay:1},skills,()=>.4);
 if(!result.ok)throw new Error(result.reason);
 return {state:result.state,projectId,skills};
}
