import {tableFixture} from './tournament-table-fixture.js';
import {seedBracket} from '../../src/battle-seeding.js';
import {createVirtualPcState} from '../../src/virtual-pc-state.js';

// Only the completed prior selection and its saved bracket exist. The next
// round, its theme, public announcement and opponent card must be generated.
export function dossierTransitionFixture(){
 const s=tableFixture(),t=s.tournaments.byId['makarevich-1'];
 t.bracket=seedBracket(t.qualifiedIds,{mode:'neighbors',seed:t.seed});
 s.power='on';s.software.dossier.installed=true;s.music.needs={satiety:100,energy:100};
 s.lastGameMinute=13430;s.social.subscriptions=['makarevich-1'];
 s.phonePresentation={firstWakeAtMinute:13000,announcedIds:[]};
 return createVirtualPcState(s);
}
