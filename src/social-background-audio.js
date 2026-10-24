import {BEGINNER_RECIPES} from './beat-beginner-bank.js?rev=60';
import {SOURCE_GAINS_DB} from './source-levels.js?rev=60';
import {songPartWindows} from './beat-song-form.js?rev=60';

// Fictional archive instrumentals, authored from the cleared in-game bank.
// Each author has a different melody family and a compatible three-layer trio.
// Keep these choices independent of catalog seeds and actual saved submissions.
const recipes=new Map([
 ['makarevich-1-room-demo','beginner-recipe-01',1,2], // Прямой пульс
 ['concrete-echo-room-demo','beginner-recipe-07',2,1], // Offbeat
 ['open-mic-17-room-demo','beginner-recipe-19',0,2], // Без малого
 ['yard-cipher-room-demo','beginner-recipe-37',2,0], // Половинный шаг
 ['home-recording-room-demo','beginner-recipe-61',1,0], // Длинный бас
 ['local-gigs-room-demo','beginner-recipe-85',0,1], // Ночной минимал
].map(([id,recipeId,introStage,outroStage])=>[id,{recipe:BEGINNER_RECIPES.find(r=>r.id===recipeId),introStage,outroStage}]));

// Reads return fresh parts/windows so a player cannot change a later recipe.
export function backgroundAudioDescriptor(trackId){
 const authored=recipes.get(trackId);if(!authored)return null;
 const {recipe,introStage,outroStage}=authored;
 const ids=[recipe.drumsId,recipe.themeId,recipe.arrangementId];
 return {
  key:'social-background:'+trackId,owner:'social',durationSeconds:64/3,
  levelVersion:1,outputGain:.55,mix:null,
  parts:ids.map((id,stage)=>({id,loopSeconds:32/3,sourceGainDb:SOURCE_GAINS_DB[id],windows:songPartWindows({introStage,outroStage},stage,id)})),
 };
}
