import { createCreatorSession } from './apartment-v3-creator-session.js?rev=12';
import { ApartmentTime, saveHomeTime } from './apartment-v3-time.js?rev=12';
import { createVirtualPcState, saveVirtualPcState } from './virtual-pc-state.js?rev=20';

// Only the creator's validated submit reaches this boundary; cancel never resets a save.
export function createNewGameSession(profile, storage, { enter, restore }) {
  return createCreatorSession(profile, storage, {
    restore,
    enter(nextProfile) {
      const homeTime = new ApartmentTime();
      const pcState = createVirtualPcState();
      const homeSaved = saveHomeTime(storage, homeTime);
      const pcSaved = saveVirtualPcState(storage, pcState);
      enter(nextProfile, { homeTime, pcState, homeSaved, pcSaved });
    },
  });
}
