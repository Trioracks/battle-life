import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4175';
const styles=['virtual-pc','desktop-apps','social-network','rap-notebook'];
const windowView=()=>page.locator('.pc-window[data-window-id="underweb"]');
async function go(url){const a=windowView().getByRole('textbox',{name:'Адрес или поиск Underweb'});await a.fill(url);await a.press('Enter');}
async function affordance(locator,label){
 const v=await locator.evaluate(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {height:r.height,border:parseFloat(s.borderTopWidth),padding:parseFloat(s.paddingLeft),background:s.backgroundColor,image:s.backgroundImage};});
 assert.ok(v.height>=28,label+' height '+JSON.stringify(v));if(label!=='search')assert.ok(v.border>=1,label+' border '+JSON.stringify(v));assert.ok(v.padding>=7,label+' padding '+JSON.stringify(v));
 assert.ok(v.image!=='none'||v.background!=='rgba(0, 0, 0, 0)',label+' background');
 await locator.focus();assert.equal(await locator.evaluate(n=>document.activeElement===n),true,label+' keyboard focus');
}
try{
 await page.route('**/__v-krugu-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8">'+styles.map(n=>'<link rel="stylesheet" href="/'+n+'.css?rev=39">').join('')+'<style>body{margin:0}</style><section id="virtual-pc"></section>'}));
 await page.goto(base+'/__v-krugu-qa');
 await page.evaluate(async()=>{document.body.dataset.mode='pc';const [{mountVirtualPc},{createVirtualPcState}]=await Promise.all([import('/src/virtual-pc-ui.js?rev=39'),import('/src/virtual-pc-state.js?rev=39')]);window.qa={createVirtualPcState};qa.pc=mountVirtualPc(document.querySelector('#virtual-pc'),{onPersist:()=>true});qa.reset=()=>{qa.pc.showDesktop(createVirtualPcState({power:'on'}));qa.pc.syncHost({playerName:'Проверка',gameDay:1,gameMinutes:600});qa.pc.openNow('underweb');};qa.reset();});
 for(const [width,height]of [[800,600],[1280,900],[1920,1080]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>qa.reset());
  await go('underweb://iskra');await affordance(page.getByRole('button',{name:'Найти',exact:true}),'search');
  await page.getByRole('button',{name:'Найти',exact:true}).click();
  for(const app of ['client','ft-studio','notebook']){
   await go('underweb://dump/'+app);const dl=page.locator('.dump-attachments button').first();await affordance(dl,'download '+app);
   await page.screenshot({path:out+'/browser-'+width+'-'+app+'.png'});
   if(app==='client'){
    await dl.click();assert.equal(await dl.isDisabled(),true);
    await page.evaluate(async()=>{const {advanceTransfers}=await import('/src/pc-transfer-runtime.js?rev=39');qa.pc.syncState(advanceTransfers(qa.pc.state,0,600).state);});
    const open=page.getByRole('button',{name:'Открыть установщик torent',exact:true});await open.click();
    const installer=page.locator('.pc-installer');await installer.waitFor();await page.screenshot({path:out+'/browser-'+width+'-installer.png'});
    await installer.getByRole('button',{name:'Отмена',exact:true}).click();
   }
  }
  await go('underweb://battles/makarevich-1');const registration=page.getByRole('button',{name:'Подать заявку',exact:true});await affordance(registration,'registration');await registration.click();
  await page.getByRole('button',{name:'Подтвердить заявку',exact:true}).click();assert.equal(await page.evaluate(()=>qa.pc.state.battleApplications.length),1);
  await page.screenshot({path:out+'/browser-'+width+'-battle.png'});
  await page.getByRole('alertdialog',{name:'Заявка принята'}).getByRole('button',{name:'Закрыть',exact:true}).click();
  for(const route of ['me','friends','photos','audio','messages','groups']){
   await go('underweb://social/'+route);assert.equal(await page.locator('[data-social-section]').count(),6);
   assert.equal(await page.locator('.uw-page').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'overflow '+width+' '+route);
   await page.screenshot({path:out+'/browser-'+width+'-'+route+'.png'});
  }
  await go('underweb://social/community/makarevich-1');assert.equal(await page.locator('.sn-audio').count(),6);assert.equal(await page.locator('.sn-brandmark').innerText(),'в');
  assert.ok((await page.locator('.sn-community').innerText()).includes('Игровые фоновые записи · прошлый сезон'));
  await page.screenshot({path:out+'/browser-'+width+'-archive.png'});
  await go('underweb://social/community/concrete-echo');assert.equal(await page.locator('.sn-audio').count(),0);
  await go('underweb://social/messages');
  await page.evaluate(async()=>{const {advancePersonalDialogs}=await import('/src/social-personal.js?rev=39');qa.pc.syncState(advancePersonalDialogs(qa.pc.state,600).state);});
  assert.equal(await page.locator('.sn-unread-badge').innerText(),'+1');
  await page.evaluate(async()=>{const {hoverPhoneNotice}=await import('/src/phone-notifications.js?rev=39'),s=qa.pc.state,id=s.phone.activeId;qa.pc.syncState({...s,phone:hoverPhoneNotice(hoverPhoneNotice(s.phone,id,true),id,false)});});
  assert.equal(await page.locator('.sn-unread-badge').innerText(),'+1');
  const search=page.getByRole('textbox',{name:'Поиск по сообщениям'});await search.fill('тРИСТА');assert.equal(await page.locator('.sn-message-row').count(),1);await page.evaluate(()=>qa.pc.underwebView.update());assert.equal(await search.evaluate(n=>document.activeElement===n),true);
  for(const id of ['anya','dasha','vitya']){await go('underweb://social/dialog/'+id);await page.evaluate(()=>qa.pc.underwebView.update());assert.equal(await page.locator('.sn-dialog').getByRole('button',{name:'Прикрепить',exact:true}).count(),0);assert.ok(await page.locator('.sn-dialog-message').count()>=4);await page.screenshot({path:out+'/browser-'+width+'-dialog-'+id+'.png'});}
  assert.equal(await page.evaluate(()=>qa.pc.state.social.dialogs.vitya.unread),false);
  await windowView().getByRole('button',{name:'Свернуть окно',exact:true}).click();
  await page.evaluate(async()=>{const {advancePersonalDialogs}=await import('/src/social-personal.js?rev=39');qa.pc.syncState(advancePersonalDialogs(qa.pc.state,3480).state);});assert.equal(await page.evaluate(()=>qa.pc.state.social.dialogs.vitya.unread),true);
  await page.getByRole('button',{name:'Переключить Underweb',exact:true}).click();assert.equal(await page.evaluate(()=>qa.pc.state.social.dialogs.vitya.unread),false);
  await page.getByRole('button',{name:'Заблокировать и удалить из друзей',exact:true}).click();assert.equal(await page.evaluate(()=>qa.pc.state.social.friends.includes('vitya')),false);
  await page.evaluate(()=>{const s=qa.createVirtualPcState(JSON.parse(JSON.stringify(qa.pc.state)));qa.pc.showDesktop(s);qa.pc.openNow('underweb');});await go('underweb://social/dialog/vitya');assert.ok((await page.locator('.sn-dialog').innerText()).includes('Пользователь заблокирован'));
  await go('underweb://iskra');const entry=page.getByRole('button',{name:'В кругу — найди друзей и одноклассников',exact:true});
  assert.ok((await entry.boundingBox()).y<(await page.locator('.uw-news-panel').boundingBox()).y);
  assert.equal(await entry.evaluate(n=>getComputedStyle(n).fontSize),'19px');
  assert.deepEqual(await page.locator('.uw-bookmarks button').allTextContents().then(x=>x.slice(0,2)),['Искра','В кругу']);
  await page.screenshot({path:out+'/browser-'+width+'-iskra.png'});
 }
 assert.deepEqual(errors,[]);await page.evaluate(()=>qa.pc.dispose());
 console.log('PASS real PC shell: search/download/installer/registration, six social pages, focus and 800/1280/1920 widths');
}catch(e){await page.screenshot({path:out+'/browser-failure.png'});throw e;}finally{await browser.close();}
