const validSkill=value=>Number.isFinite(value)&&value>=0&&value<=100;
export function normalizeBeatExecutionSnapshot(value){
 if(value?.version!==1||!validSkill(value.beatmaking)||!validSkill(value.genreXP)||value.effective!==Math.min(value.beatmaking,value.genreXP))return null;
 return {version:1,beatmaking:value.beatmaking,genreXP:value.genreXP,effective:value.effective};
}
export function createBeatExecutionSnapshot({beatmaking,genreXP}={}){
 const value=normalizeBeatExecutionSnapshot({version:1,beatmaking,genreXP,effective:Math.min(beatmaking,genreXP)});
 if(!value)throw new TypeError('Beat execution skills must be finite numbers from 0 to 100.');
 return value;
}
export function beatExecutionSkill(result){
 return Object.hasOwn(result??{},'execution')?normalizeBeatExecutionSnapshot(result.execution)?.effective??null:result?.skills?.beatmaking;
}
// Validate only marked data: an archive without execution keeps its old contract.
export const validBeatExecutionResult=result=>!Object.hasOwn(result??{},'execution')||normalizeBeatExecutionSnapshot(result.execution)!==null;
export const validBeatExecutionMix=mix=>!Array.isArray(mix?.layers)||mix.layers.every(validBeatExecutionResult);
export const validBeatExecutionDescriptor=descriptor=>validBeatExecutionMix(descriptor?.mix)&&(!Array.isArray(descriptor?.parts)||descriptor.parts.every(part=>validBeatExecutionResult(part?.result)));
