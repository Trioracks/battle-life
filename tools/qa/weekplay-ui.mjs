import assert from 'node:assert/strict';
export async function verifyWeekplayUi({page,out,evaluate}){
 const result={};assert.equal(await page.locator('[data-phone-notice]').isVisible(),true);result.wakePhoneNotice=true;
 await evaluate(()=>{const s={...weekQA.state,music:{...weekQA.state.music,needs:{satiety:100,energy:100}}};weekQA.setState(s);weekQA.openFridge();});
 assert.equal(await page.locator('[data-food-id=apple]').isDisabled(),true);
 await page.getByRole('dialog',{name:'Холодильник',exact:true}).getByRole('button',{name:'Закрыть',exact:true}).click();
 await evaluate(()=>{weekQA.setState({...weekQA.state,music:{...weekQA.state.music,needs:{satiety:50,energy:100}}});weekQA.openFridge();});
 await page.locator('[data-food-id=apple]').click();assert.equal(await evaluate(()=>weekQA.state.music.needs.satiety),80);
 await page.getByRole('dialog',{name:'Холодильник',exact:true}).getByRole('button',{name:'Закрыть',exact:true}).click();result.food={fullRefused:true,acceptedSatiety:80};
 await page.locator('#apartment').focus();await page.keyboard.press('Enter');await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>weekQA.phase==='desktop');
 await evaluate(()=>{weekQA.pc.closeWindow('installer');weekQA.pc.closeWindow('rap-dossier');const s=structuredClone(weekQA.state);s.software.dossier.installed=false;s.software.dossier.receivedBytes=6000000;weekQA.setState(s);weekQA.pc.open('underweb');weekQA.pc.navigateUnderweb('underweb://social/profile/eparhiya');});
 await page.getByRole('button',{name:'Изучить в Рэп-досье',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Скачать Rap-Dossier.torrent',exact:true}).isVisible(),true);assert.equal(await evaluate(()=>weekQA.state.rapResearch.job),null);
 await page.getByRole('button',{name:'Скачать Rap-Dossier.torrent',exact:true}).click();
 await page.waitForFunction(()=>weekQA.state.browserDownloads.items.some(i=>i.appId==='dossier'&&i.elapsedSeconds===1));
 const download=page.getByRole('dialog',{name:'Загрузки Underweb',exact:true});assert.equal(await download.isVisible(),true);
 await download.getByRole('button',{name:'Закрыть загрузки',exact:true}).click();result.installGate=true;result.download=true;
 await evaluate(()=>weekQA.pc.softwareAction('installer','dossier'));
 for(const name of ['Далее >','Далее >','Установить'])await page.locator('[data-window-id=installer]').getByRole('button',{name,exact:true}).click();
 await page.waitForFunction(()=>weekQA.state.software.dossier.installed);
 await page.locator('[data-window-id=installer]').getByRole('button',{name:'Готово',exact:true}).click();
 // Social/player ownership and typed sender links in real mounted dialogs.
 await evaluate(()=>{weekQA.pc.open('underweb');weekQA.pc.navigateUnderweb('underweb://social/groups');});
 assert.ok(await page.locator('[data-social-section="groups"] .sn-unread-badge').count()>0);
 await page.locator('.sn-group-card').getByRole('button',{name:'Макаревич Battle',exact:true}).click();
 result.groupRead=await evaluate(async()=>{const {communityUnreadCounts}=await import('/src/social-community-publications.js?rev=43');return communityUnreadCounts(weekQA.state,{nowMinute:weekQA.minute}).total;});assert.equal(result.groupRead,0);
 const play=page.locator('.sn-community-archive [data-social-audio]').last();await play.click();await page.waitForFunction(()=>weekQA.pc.beatAudio.status==='playing');
 const snapshot=await evaluate(()=>weekQA.pc.beatAudio.getSnapshot());assert.ok(snapshot.durationSeconds>20);await page.waitForTimeout(300);
 await page.locator('.sn-community-archive').getByRole('button',{name:/^Пауза:/}).click();assert.equal(await evaluate(()=>weekQA.pc.beatAudio.status),'paused');
 await page.locator('.sn-community-archive').getByRole('button',{name:/^Слушать:/}).last().click();await page.waitForFunction(()=>weekQA.pc.beatAudio.status==='playing');
 await page.locator('.sn-community-archive').getByRole('button',{name:/^Остановить:/}).last().click();assert.equal(await evaluate(()=>weekQA.pc.beatAudio.status),'stopped');result.player={duration:snapshot.durationSeconds,playPauseResumeStop:true};
 await evaluate(()=>weekQA.pc.navigateUnderweb('underweb://social/dialog/vitya'));
 const person=page.locator('.sn-dialog h2 a[href="underweb://social/profile/vitya"]');await person.click();assert.equal(await page.locator('.sn-dialog').count(),0);
 await evaluate(()=>weekQA.pc.navigateUnderweb('underweb://social/dialog/makarevich-1'));
 await page.locator('.sn-dialog h2 a[href="underweb://social/community/makarevich-1"]').click();assert.equal(await page.locator('.sn-community').count(),1);result.typedDialogLinks=true;
 // Work camera must use no audio preparation; closing after interruption owns a paused job.
 await evaluate(()=>{weekQA.pc.closeWindow('underweb');weekQA.pc.open('rap-dossier');weekQA.pc.dossierView.focusTarget({trackVersionId:'export:0'});weekQA.beforeStudyPcm=qaResources.pcmRequests;});
 await page.locator('.rd-detail').getByRole('button',{name:'Изучить трек · 45 мин',exact:true}).click();await page.waitForFunction(()=>weekQA.phase==='working');
 await page.waitForFunction(()=>weekQA.state.rapAnalysis.job?.elapsed>1);
 await page.screenshot({path:out+'/research-work-camera.png'});
 await page.getByRole('button',{name:'Прервать работу',exact:true}).click();await page.waitForFunction(()=>weekQA.phase==='room'&&weekQA.motion.phase==='idle');
 assert.equal(await evaluate(()=>weekQA.state.rapAnalysis.job.status),'paused');assert.equal(await evaluate(()=>qaResources.pcmRequests-weekQA.beforeStudyPcm),0);result.research={paused:true,pcmRequests:0};
 await page.locator('#apartment').focus();await page.keyboard.press('Enter');await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>weekQA.phase==='desktop');
 await evaluate(()=>{for(const id of ['installer','rap-dossier','underweb'])weekQA.pc.closeWindow(id);});
 const baseline=await evaluate(()=>weekQA.resources()),paused=await evaluate(()=>JSON.stringify(weekQA.state.rapAnalysis.job));result.reopen=[];
 for(let cycle=1;cycle<=30;cycle++){
  const row=await evaluate(()=>{
   weekQA.pc.open('underweb');weekQA.pc.navigateUnderweb('underweb://social/community/makarevich-1');const activeRows=qaRows;
   weekQA.pc.navigateUnderweb('underweb://social/dialog/makarevich-1');weekQA.pc.closeWindow('underweb');
   weekQA.pc.open('rap-dossier');weekQA.pc.dossierView.focusTarget({trackVersionId:'export:0'});weekQA.pc.closeWindow('rap-dossier');
   return {activeRows,...weekQA.resources(),job:JSON.stringify(weekQA.state.rapAnalysis.job)};
  });
  assert.ok(row.activeRows>0);assert.equal(row.rows,0);assert.equal(row.sources,0);assert.equal(row.audio,'stopped');assert.equal(row.job,paused);
  for(const key of ['observers','globalListeners','intervals','workers','raf','nodes'])assert.equal(row[key],baseline[key],key+' at cycle '+cycle);
  delete row.job;result.reopen.push({cycle,...row});
 }
 result.baseline=baseline;
 // Hidden dossier never projects; showing it uses the latest public round.
 result.hidden=await evaluate(()=>{weekQA.pc.open('rap-dossier');weekQA.pc.windowAction({type:'minimize',id:'rap-dossier'});const before=qaProjections;for(let i=0;i<180;i++)weekQA.pc.dossierView.update();const delta=qaProjections-before;weekQA.pc.open('rap-dossier');return {updates:180,projections:delta};});assert.equal(result.hidden.projections,0);
 return result;
}
