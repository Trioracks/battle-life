import { createCreatorSession } from './apartment-v3-creator-session.js?rev=58';
import { ApartmentTime } from './apartment-v3-time.js?rev=58';
import { createVirtualPcState } from './virtual-pc-state.js?rev=58';
import {prepareNoviceNewGame} from './home-profile-migration.js?rev=58';

// Only the creator's validated submit reaches this boundary; cancel never resets a save.
export function createNewGameSession(profile, storage, { enter, restore }) {
  let migrationReady=false;
  const homeTime=new ApartmentTime(),pcState=createVirtualPcState();
  const newStorage={setItem(key,value){const next=JSON.parse(value);pcState.voiceId=next.voiceId;const result=prepareNoviceNewGame(storage,next,pcState,homeTime.snapshot());migrationReady=result.ok;if(!result.ok)throw Error(result.error);}};
  return createCreatorSession(profile, newStorage, {
    restore,
    enter(nextProfile) {
      pcState.voiceId=nextProfile.voiceId;
      const homeSaved = migrationReady;
      const pcSaved = migrationReady;
      enter(nextProfile, { homeTime, pcState, homeSaved, pcSaved, migrationReady });
    },
  });
}
