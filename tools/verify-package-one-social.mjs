// Fresh context: real desktop views + production APIs, never a player's browser/save.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/package-one';await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4175',win=id=>page.locator('.pc-window[data-window-id="'+id+'"]');
async function start(label){await page.getByRole('button',{name:'Слобода',exact:true}).click();await page.getByRole('menuitem',{name:label,exact:true}).click();}
async function go(url){await start('Underweb');const address=win('underweb').getByRole('textbox',{name:'Адрес или поиск Underweb'});await address.fill('underweb://social/'+url);await address.press('Enter');}
async function shot(name){await page.screenshot({path:out+'/'+name+'.png'});}
try{
 await page.route('**/__package-one-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/virtual-pc.css?rev=37"><link rel="stylesheet" href="/desktop-apps.css?rev=37"><link rel="stylesheet" href="/rap-notebook.css?rev=37"><link rel="stylesheet" href="/phone-hud.css?rev=37"><style>body{margin:0}</style><section id="virtual-pc"></section><aside id="phone"></aside>'}));
 await page.goto(base+'/__package-one-qa');
 await page.addStyleTag({url:base+'/social-network.css?rev=37'});
 await page.evaluate(()=>document.body.dataset.mode='pc');
 await page.evaluate(async()=>{
  const names=['virtual-pc-ui','virtual-pc-state','home-creative-work','vocal-production','virtual-pc-runtime','avatar-v3-profile','phone-hud','social-result-reaction'];
  const [ui,state,work,vocal,runtime,profile,phone,reaction]=await Promise.all(names.map(n=>import('/src/'+n+'.js?rev=37')));
  const q=window.qa={work,vocal,runtime,state,profile,reaction,minute:2160,fail:false};
  q.persist=next=>!q.fail&&!(q.failSend&&next.battleSubmissions.length>(q.pc?.state.battleSubmissions.length??0))&&state.saveVirtualPcState(localStorage,next);
  q.pc=ui.mountVirtualPc(document.querySelector('#virtual-pc'),{onWork:()=>true,onPersist:q.persist});
  q.pc.showDesktop(state.createVirtualPcState({power:'on',software:{client:{installed:true},ft:{installed:true},notebook:{installed:true}}}));
  q.pc.syncState(state.applyToBattle(q.pc.state,'makarevich-1','Новый голос'));q.pc.syncHost({gameDay:2,gameMinutes:q.minute,playerName:'Новый голос',skills:{writing:10,beatmaking:10,flow:10,sound:10}});
  q.refill=()=>q.pc.syncState({...q.pc.state,music:{...q.pc.state.music,needs:{satiety:100,energy:100}}});
  q.advance=minute=>{q.minute=minute;q.pc.syncState(runtime.advanceVirtualPcDurably(q.pc.state,{day:Math.floor(minute/1440)+1,minutes:minute%1440},q.persist).state);q.pc.syncHost({gameDay:Math.floor(minute/1440)+1,gameMinutes:minute});q.phone.update();};
  q.phone=phone.mountPhoneHud(document.querySelector('#phone'),{getState:()=>q.pc.state.phone,onChange:phone=>{const next={...q.pc.state,phone};if(!q.persist(next))return false;q.pc.syncState(next);return true;}});
  const transfer=runtime.createSubmissionTransferClock();let last=performance.now();q.running=true;const frame=now=>{if(!q.running)return;const dt=Math.min(.25,(now-last)/1000);last=now;const r=transfer.tick(q.pc.state,{activeSeconds:dt,powered:q.pc.state.power==='on',paused:document.hidden,phase:String(document.hidden)},q.persist);if(r.changed)q.pc.syncState(r.state);q.pc.tickOutgoingMessage(dt,{paused:document.hidden});requestAnimationFrame(frame);};requestAnimationFrame(frame);
 });
 await start('Рэпблокнот');await win('rap-notebook').getByRole('button',{name:'Новый текст',exact:true}).click();
 await win('rap-notebook').getByRole('combobox',{name:'Для чего пишем текст'}).selectOption('makarevich-1');await win('rap-notebook').getByRole('button',{name:'Создать текст',exact:true}).click();
 await win('rap-notebook').getByRole('button',{name:'Начать писать',exact:true}).click();
 await page.evaluate(()=>qa.pc.syncState(qa.work.advanceCreativeWork(qa.pc.state,24,{day:2,minutes:720}).state));
 await shot('package-lyrics');await start('FT Studio');
 await win('ft-studio').getByRole('dialog').getByRole('button',{name:'Новый проект',exact:true}).click();await win('ft-studio').getByRole('textbox',{name:'Название бита'}).fill('Пакет один — новая работа');
 await win('ft-studio').getByRole('button',{name:'Начать проект',exact:true}).click();await page.evaluate(()=>qa.refill());await win('ft-studio').getByRole('button',{name:'Работать над битом',exact:true}).click();
 await page.evaluate(()=>qa.pc.syncState(qa.work.advanceCreativeWork(qa.pc.state,24,{day:2,minutes:720}).state));
 await win('ft-studio').getByRole('button',{name:'Добавить вокал',exact:true}).click();await win('ft-studio').getByRole('dialog').getByRole('button',{name:'Не переключай',exact:true}).click();
 await page.evaluate(()=>{qa.refill();qa.pc.syncState(qa.vocal.advanceVocalWork(qa.pc.state,1000).state);});
 for(const label of ['Записать чистовую','Свести','Мастеринг']){await page.evaluate(()=>qa.refill());await win('ft-studio').getByRole('button',{name:label,exact:true}).click();await page.evaluate(()=>qa.pc.syncState(qa.vocal.advanceVocalWork(qa.pc.state,1000).state));}
 await shot('package-mastered');await go('community/makarevich-1');
 assert.notEqual(await win('underweb').getByRole('button',{name:'Сдать трек',exact:true}).evaluate(n=>getComputedStyle(n).backgroundImage),'none','primary social actions retain their own visual affordance inside the PC browser');
 await win('underweb').getByRole('button',{name:'Сдать трек',exact:true}).click();await win('underweb').getByRole('button',{name:'Прикрепить',exact:true}).click();
 const picker=page.getByRole('dialog',{name:'Прикрепить трек'});await page.getByRole('button',{name:'Выбрать: Пакет один — новая работа',exact:true}).click();
 await page.getByRole('button',{name:'Прикрепить выбранный трек',exact:true}).click();
 assert.equal(await page.evaluate(()=>qa.pc.state.battleSubmissions.length),0);
 await page.waitForFunction(()=>qa.pc.state.outgoingUpload?.status==='ready',null,{timeout:60000});await page.evaluate(()=>qa.failSend=true);const typingStart=performance.now();await win('underweb').getByRole('button',{name:'Отправить',exact:true}).click();assert.equal(await page.evaluate(()=>qa.pc.state.battleSubmissions.length),0);
 await page.waitForFunction(()=>qa.pc.state.outgoingMessage?.elapsedSeconds>=2);await shot('package-typing');await page.waitForFunction(()=>qa.pc.state.outgoingMessage?.elapsedSeconds===6);const typingSeconds=(performance.now()-typingStart)/1000;assert.ok(typingSeconds>=5&&typingSeconds<=7.5,'typing seconds '+typingSeconds);assert.equal(await page.evaluate(()=>qa.pc.state.battleSubmissions.length),0);
 await page.evaluate(()=>qa.failSend=false);await win('underweb').getByRole('button',{name:'Повторить отправку',exact:true}).click();assert.equal(await page.evaluate(()=>qa.pc.state.battleSubmissions.length),1);assert.equal(await win('underweb').getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 await page.evaluate(()=>{qa.pc.syncState({...qa.pc.state,power:'off'});qa.advance(qa.pc.state.battleSubmissions[0].ackAt);});await shot('package-dialog');
 await page.evaluate(()=>qa.advance(qa.pc.state.battleWindows[0].closesAt+qa.pc.state.battleWindows[0].judgingOffsets[0]));await go('community/makarevich-1');
 assert.equal(await page.locator('[data-judge-review]').count(),1);assert.equal(await page.getByRole('button',{name:'Открыть общий итог'}).count(),0);
 await page.evaluate(()=>qa.advance(qa.pc.state.battleWindows[0].closesAt+4321));assert.equal(await page.locator('[data-judge-review]').count(),5);
 const seed=await page.evaluate(()=>({state:qa.pc.state,profile:qa.profile.createProfile({name:'Новый голос'}),clock:{day:Math.floor(qa.minute/1440)+1,minutes:qa.minute%1440,initialRest:false}}));
 seed.state.power='on';await writeFile(out+'/package-one-seed.json',JSON.stringify(seed));
 await page.getByRole('button',{name:'Открыть общий итог',exact:true}).click();assert.equal(await page.locator('[data-result-summary]').count(),1);
 const resultId=await page.evaluate(()=>qa.pc.state.resultReactions.items[0].id);
 await page.evaluate(id=>{const r=qa.reaction.completeResultReaction(qa.pc.state,id);if(!r.ok)throw Error(r.reason);qa.pc.syncState(r.state);qa.persist(r.state);},resultId);
 for(const [width,height]of [[800,600],[1280,900],[1920,1080]]){
  await page.setViewportSize({width,height});
  for(const route of ['community/makarevich-1','me','dialog/makarevich-1']){await go(route);await page.locator('.sn-content img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));await shot('package-'+width+'-'+route.replaceAll('/','-'));assert.equal(await page.locator('[data-social-section]').count(),6);assert.equal(await page.locator('.uw-page').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);assert.equal(await page.locator('.sn-nav-link').first().evaluate(n=>getComputedStyle(n).backgroundImage),'none');}
 }
 await go('me');await page.locator('[data-social-audio]').first().click();await page.waitForFunction(()=>qa.pc.beatAudio.status==='playing'||qa.pc.beatAudio.status==='error');
 assert.equal(await page.evaluate(()=>qa.pc.beatAudio.status),'playing');
 assert.equal(await page.evaluate(()=>qa.pc.beatAudio.descriptor.key),'version:'+seed.state.battleSubmissions[0].trackVersionId);
 const frozen=await page.evaluate(()=>{const before=JSON.stringify(qa.pc.state.judging);qa.pc.syncState({...qa.pc.state,projects:[]});qa.persist(qa.pc.state);qa.pc.syncState(qa.state.loadVirtualPcState(localStorage).state);qa.advance(qa.minute);return {same:before===JSON.stringify(qa.pc.state.judging),posts:qa.pc.state.social.posts.length,versions:Object.keys(qa.pc.state.trackVersions.byId).length};});
 assert.deepEqual(frozen,{same:true,posts:1,versions:1});assert.deepEqual(errors,[]);
 console.log('PASS native lyrics → beat → draft → clean → mix → master → attach/quota/send → offline ACK → 5 scheduled judges → phone → one frozen wall audio; 800/1280/1920');
}catch(error){await shot('package-failure');console.log((await page.locator('body').innerText()).slice(-9000));throw error;}finally{await browser.close();}
