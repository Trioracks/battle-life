import {tableFixture} from './tournament-table-fixture.js';
import {ensureRoundTheme} from '../../src/round-topics.js';
const request={battleId:'makarevich-1',roundId:'round-2',judgeIds:['eparhiya','audience','thirty-third'],opensAt:13440};
export function topicFixture(){let s=tableFixture();const t=s.tournaments.byId['makarevich-1'];t.currentRoundId='round-2';t.rounds['round-2']={...t.rounds.selection,roundId:'round-2',opensAt:13440,closesAt:23520,status:'accepting',pairs:[],submissions:{},judgeBatches:{}};s=ensureRoundTheme(s,request).state;t.events.push({id:'announce',type:'round-announced',battleId:request.battleId,roundId:request.roundId,dueAt:13440,themeId:s.roundThemes['makarevich-1:round-2'].id});return s;}
