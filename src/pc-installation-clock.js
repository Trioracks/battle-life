// Only advancement accepted during this active host frame is eligible. Saved
// clock stamps and wall time never enter this conversion.
export function installationElapsedSeconds({activeSeconds=0,advancedGameMinutes=0,powered=false,paused=true}={}){
  if(!powered||paused)return 0;
  const gameSeconds=advancedGameMinutes*4;
  if(Number.isFinite(advancedGameMinutes)&&advancedGameMinutes>0&&Number.isFinite(gameSeconds))return gameSeconds;
  return Number.isFinite(activeSeconds)&&activeSeconds>0?activeSeconds:0;
}
