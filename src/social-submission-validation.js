import {communityById} from './social-catalog.js?rev=39';
import {normalizeSocial} from './social-state.js?rev=39';
import {attemptForWindow} from './battle-windows.js?rev=39';
import {validGameMinute} from './game-minute.js?rev=39';
import {TRACK_DSP_VERSION} from './track-version.js?rev=39';
import {submissionCandidates} from './battle-submission.js?rev=39';
import {normalizeOutgoingUpload} from './social-upload.js?rev=39';
export function submissionSendContext(state,{communityId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),c=communityById(communityId),window=state.battleWindows?.find(w=>w.battleId===c?.battleId&&w.roundId==='selection'&&!w.issue),upload=normalizeOutgoingUpload(state.outgoingUpload,state.trackVersions);
 if(upload?.issue)return fail(upload.issue);
 if(upload?.communityId===communityId&&upload.status!=='ready')return fail('Дождись завершения загрузки вложения.');
 if(!c?.battleId||!window||!validGameMinute(nowMinute))return fail('Не удалось определить срок приёма.');
 if(attemptForWindow(state,window))return fail('Работа уже отправлена. Повторная сдача и замена недоступны.');
 if(nowMinute<window.opensAt||nowMinute>=window.closesAt)return fail('Приём работ закрыт.');
 if(!state.battleApplications?.some(a=>a.battleId===c.battleId))return fail('Сначала зарегистрируйся на этот баттл.');
 const social=normalizeSocial(state.social),dialog=social.dialogs[communityId],version=state.trackVersions?.byId?.[dialog?.draftVersionId];
 if(upload?.communityId===communityId&&upload.versionId!==dialog?.draftVersionId)return fail('Загруженная версия не совпадает с вложением. Выбери файл заново.');
 if(!version||version.recipe?.dspVersion!==TRACK_DSP_VERSION)return fail('Прикрепи доступную сохранённую версию трека.');
 const beat=version.recipe.beat,lyrics=version.recipe.lyrics,check=submissionCandidates({projects:[beat,...(lyrics?[lyrics]:[])]},c.battleId)[0];
 if(!check||check.issue)return fail(check?.issue??'Сохранённая работа недоступна.');
 return {ok:true,c,window,upload,social,dialog,version,lyrics};
}
