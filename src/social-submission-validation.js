import {communityById} from './social-catalog.js?rev=43';
import {normalizeSocial} from './social-state.js?rev=43';
import {attemptForWindow,currentBattleWindow,canSubmitToBattleWindow} from './battle-windows.js?rev=43';
import {validGameMinute} from './game-minute.js?rev=43';
import {TRACK_DSP_VERSION} from './track-version.js?rev=47';
import {submissionCandidates} from './battle-submission.js?rev=47';
import {normalizeOutgoingUpload} from './social-upload.js?rev=47';
export function submissionSendContext(state,{communityId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),c=communityById(communityId),window=currentBattleWindow(state,c?.battleId,nowMinute),upload=normalizeOutgoingUpload(state.outgoingUpload,state.trackVersions,state.audioExports);
 if(upload?.issue)return fail(upload.issue);
 if(!canSubmitToBattleWindow(state,window))return fail('В этом раунде ты не участвуешь или приём закрыт.');
 if(upload?.communityId===communityId&&upload.windowId!==window?.id)return fail('Вложение загружалось для другого раунда. Выбери файл заново.');
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
