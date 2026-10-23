export function audioFileMatchesBattle(state,file,{battleId,roundId='selection',themeId}={}){
 if(file?.kind!=='track')return false;
 const version=state.trackVersions?.byId?.[file.trackVersionId],lyrics=version?.recipe?.lyrics;
 return Boolean(lyrics&&lyrics.battleId===battleId&&(lyrics.roundId??'selection')===roundId&&(!themeId||!lyrics.themeId||lyrics.themeId===themeId));
}
