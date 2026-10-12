import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__registration-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8">'+['virtual-pc','desktop-apps','social-network'].map(n=>'<link rel="stylesheet" href="/'+n+'.css?rev=38">').join('')+'<style>body{margin:0}</style><section id="virtual-pc"></section>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__registration-qa');
 await page.evaluate(async()=>{document.body.dataset.mode='pc';const [{mountVirtualPc},{createVirtualPcState}]=await Promise.all([import('/src/virtual-pc-ui.js?rev=38'),import('/src/virtual-pc-state.js?rev=38')]);window.qa={allow:true};qa.pc=mountVirtualPc(document.querySelector('#virtual-pc'),{onPersist:()=>qa.allow});qa.reset=()=>{qa.allow=true;qa.pc.showDesktop(createVirtualPcState({power:'on'}));qa.pc.syncHost({playerName:'Проверка',gameDay:1,gameMinutes:600,clockLabel:'10:00'});qa.pc.openNow('underweb');};qa.reset();});
 const go=route=>page.evaluate(route=>qa.pc.underwebView.navigate(route),route);
 for(const [width,height]of [[800,600],[1280,900],[1920,1080]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>qa.reset());
  const clock=page.getByRole('button',{name:'Открыть календарь',exact:true});await clock.click();const cal=page.getByRole('dialog',{name:'Игровой календарь'});
  assert.ok((await cal.innerText()).includes('Сентябрь 2012'));assert.equal(await cal.locator('[aria-current=date]').innerText(),'1');assert.equal(await cal.locator('input,select').count(),0);
  await page.evaluate(()=>qa.pc.syncHost({...qa.pc.metadata,gameDay:31,gameMinutes:43200,clockLabel:'00:00'}));assert.ok((await cal.innerText()).includes('Октябрь 2012'));await cal.press('Escape');assert.equal(await cal.count(),0);assert.equal(await clock.evaluate(n=>document.activeElement===n),true);
  await clock.click();await page.screenshot({path:out+'/calendar-'+width+'.png'});await page.locator('.uw-page').click({position:{x:10,y:10}});assert.equal(await cal.count(),0);
  await page.evaluate(()=>qa.pc.syncHost({...qa.pc.metadata,gameDay:1,gameMinutes:600,clockLabel:'10:00'}));await go('underweb://battles/makarevich-1');
  await page.getByRole('button',{name:'Подать заявку',exact:true}).click();await page.getByRole('button',{name:'Подтвердить заявку',exact:true}).click();assert.equal(await page.evaluate(()=>qa.pc.state.battleApplications.length),1);
  const notice=page.getByRole('alertdialog',{name:'Заявка принята'});assert.ok((await notice.innerText()).includes('Ваша заявка принята, Проверка. Ожидаем вашего трека'));await page.screenshot({path:out+'/registration-'+width+'.png'});await notice.getByRole('button',{name:'Закрыть',exact:true}).click();
  await go('underweb://social/community/makarevich-1');assert.equal(await page.getByRole('button',{name:'Сдать трек',exact:true}).count(),1);assert.equal(await page.evaluate(()=>qa.pc.state.social.subscriptions.length),0);
  await page.evaluate(()=>{const t=qa.pc.state.battleWindows[0].closesAt;qa.pc.syncHost({...qa.pc.metadata,gameMinutes:t,gameDay:Math.floor(t/1440)+1});});assert.equal(await page.getByRole('button',{name:'Сдать трек',exact:true}).isDisabled(),true);assert.ok((await page.locator('.sn-community').innerText()).includes('Приём закрыт. Приём заявок и треков до 08.09.2012 10:00'));
  await page.evaluate(()=>qa.reset());await go('underweb://social/community/makarevich-1');await page.evaluate(()=>qa.allow=false);await page.getByRole('button',{name:'Зарегистрироваться',exact:true}).click();assert.equal(await page.evaluate(()=>qa.pc.state.battleApplications.length),0);assert.equal(await notice.count(),0);
  await page.evaluate(()=>qa.allow=true);await page.getByRole('button',{name:'Зарегистрироваться',exact:true}).click();assert.equal(await page.evaluate(()=>qa.pc.state.battleApplications.length),1);await notice.getByRole('button',{name:'Закрыть',exact:true}).click();await go('underweb://battles/makarevich-1');assert.equal(await page.getByRole('button',{name:'Открыть сообщения сообщества',exact:true}).count(),1);
  await page.evaluate(()=>qa.reset());await go('underweb://battles/makarevich-1');await page.evaluate(()=>{const t=qa.pc.state.battleWindows[0].closesAt;qa.pc.syncHost({...qa.pc.metadata,gameMinutes:t-1,gameDay:8});});assert.equal(await page.getByRole('button',{name:'Подать заявку',exact:true}).count(),1);await page.evaluate(()=>qa.pc.syncHost({...qa.pc.metadata,gameMinutes:qa.pc.state.battleWindows[0].closesAt}));assert.equal(await page.getByRole('button',{name:'Подать заявку',exact:true}).count(),0);
 }
 assert.deepEqual(errors,[]);await page.evaluate(()=>qa.pc.dispose());console.log('PASS native calendar rollover/Escape/outside, site/community registration, quota atomicity, exact in-day deadline closure at three widths');
}catch(e){await page.screenshot({path:out+'/registration-failure.png'});throw e;}finally{await browser.close();}
