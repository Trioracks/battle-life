import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),out=resolve(root,'artifacts/dossier-weekplay/task-6'),port=Number(process.env.COMMUNITY_QA_PORT||4198);
assert.ok(Number.isInteger(port)&&port>=4193&&port<=65535);
const base='http://127.0.0.1:'+port,mime={'.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,base).pathname;
 if(pathname==='/__community-qa'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><link rel="stylesheet" href="/social-network.css"><title>Isolated community publication QA</title><style>body{margin:24px;background:#d9e0e5}main{max-width:1200px;margin:auto}</style><main></main>');return;}
 const path=resolve(root,'.'+decodeURIComponent(pathname));if(!path.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));
}catch{res.writeHead(404);res.end();}});
let browser;
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'/__community-qa');
 const setup=await page.evaluate(async()=>{
  const [{topicFixture},{mountSocial},{resolveSocialRoute},{subscribeCommunity},{ensureSocialReactionPlans},api,{createVirtualPcState}]=await Promise.all([import('/test/helpers/round-topic-fixture.js'),import('/src/social-view.js?rev=43'),import('/src/social-routing.js?rev=43'),import('/src/social-state.js?rev=43'),import('/src/social-reactions.js?rev=43'),import('/src/social-community-publications.js?rev=43'),import('/src/virtual-pc-state.js?rev=43')]);
  const state=subscribeCommunity(topicFixture(),'makarevich-1',true,{nowMinute:13440}).state;
  window.qa={state,now:19920,visible:true,api,createVirtualPcState,topicFixture,subscribeCommunity,ensureSocialReactionPlans,address:'',view:null};
  qa.state=ensureSocialReactionPlans(qa.state,qa.now).state;qa.state=api.publishCommunityNotices(qa.state,qa.now).state;
  qa.mount=url=>{qa.view?.dispose();qa.address=url;qa.view=mountSocial(document.querySelector('main'),{route:resolveSocialRoute(url),getState:()=>qa.state,getMetadata:()=>({gameMinutes:qa.now,playerName:'Макаревич Battle'}),onChange:s=>{qa.state=s;return true;},navigate:qa.mount,isVisible:()=>qa.visible});};
  qa.mount('underweb://social/groups');
  const {mountPhoneHud}=await import('/src/phone-hud.js?rev=43'),phoneRoot=document.createElement('aside'),styles=document.createElement('link');phoneRoot.id='qa-phone';document.body.append(phoneRoot);styles.rel='stylesheet';styles.href='/phone-hud.css';document.head.append(styles);
  qa.phoneContext={nowMinute:qa.now,sleeping:false,mode:'game',pcPhase:'desktop',needs:{energy:80,satiety:70}};qa.presentation={firstWakeAtMinute:0,announcedIds:[]};
  qa.phone=mountPhoneHud(phoneRoot,{getState:()=>qa.state.phone,getContext:()=>qa.phoneContext,getPresentation:()=>qa.presentation,onPresentationChange:p=>{qa.presentation=p;return true;},onChange:p=>{qa.state={...qa.state,phone:p};return true;}});
  const path='/assets/ui/virtual-pc/icons/dossier.svg',response=await fetch(path),image=new Image();image.src=path;await image.decode();
  return {origin:location.origin,svgMime:response.headers.get('content-type'),svgWidth:image.naturalWidth,phone:qa.state.phone.queue.map(p=>p.id),unread:api.communityUnreadCounts(qa.state,{nowMinute:qa.now}).total};
 });
 assert.equal(setup.origin,base);assert.equal(setup.svgMime,'image/svg+xml');assert.ok(setup.svgWidth>0);assert.equal(setup.unread,2);assert.equal(new Set(setup.phone).size,2);
 assert.equal(await page.locator('[data-social-section="groups"] .sn-unread-badge').innerText(),'+2');
 await page.screenshot({path:out+'/groups-unread.png',fullPage:true});
 await page.evaluate(()=>{qa.phoneContext.pcPhase='room';qa.phone.update();});assert.equal(await page.locator('[data-phone-notice]').isVisible(),true);assert.equal(await page.locator('[data-phone-notice] strong').innerText(),'Макаревич Battle');assert.match(await page.locator('.bl-phone-body').innerText(),/Знакомим с судьёй/);await page.screenshot({path:out+'/group-phone-notification.png',fullPage:true});await page.evaluate(()=>{qa.phoneContext.pcPhase='desktop';qa.phone.update();});
 await page.locator('.sn-group-card').getByRole('button',{name:'Макаревич Battle',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>qa.address),'underweb://social/community/makarevich-1');
 assert.equal(await page.locator('[data-social-section="groups"] .sn-unread-badge').count(),0);
 assert.deepEqual(await page.evaluate(()=>qa.state.phone.queue),[]);assert.equal(await page.evaluate(()=>qa.state.phone.dismissedIds.length),2);
 await page.evaluate(()=>{qa.phoneContext.pcPhase='room';qa.phone.update();});assert.equal(await page.locator('[data-phone-notice]').isVisible(),false);await page.evaluate(()=>{qa.phoneContext.pcPhase='desktop';qa.phone.update();});
 assert.equal(await page.locator('.sn-post').filter({hasText:'Знакомим с судьёй раунда'}).locator(':scope > strong').innerText(),'Макаревич Battle · организаторы');
 assert.equal(await page.locator('.sn-post > p').evaluateAll(nodes=>nodes.some(n=>/панел/i.test(n.textContent))),false);
 const staticPost=page.locator('[data-reaction-post="makarevich-1-welcome"]');
 await staticPost.getByRole('button',{name:'Нравится: 3',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await staticPost.getByRole('button',{name:'Нравится: 4',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await staticPost.getByRole('button',{name:'Нравится: 4',exact:true}).evaluate(n=>document.activeElement===n),true);
 await page.screenshot({path:out+'/community-read-static-vote.png',fullPage:true});
 await page.evaluate(()=>{qa.state=qa.createVirtualPcState(JSON.parse(JSON.stringify(qa.state)));qa.view.update();});
 assert.equal(await staticPost.getByRole('button',{name:'Нравится: 4',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>qa.api.communityUnreadCounts(qa.state,{nowMinute:qa.now}).total),0);
 const judgeName=page.locator('.sn-post > p > a[href="underweb://social/profile/eparhiya"]');assert.equal(await judgeName.innerText(),'епархия');await judgeName.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>qa.address),'underweb://social/profile/eparhiya');
 await page.evaluate(()=>{qa.state.social.dialogs['makarevich-1']={peer:{kind:'community',id:'makarevich-1'},messages:[{id:'own',sender:'player',at:19910,body:'Мой трек'},{id:'reply',sender:'makarevich-1',at:19911,body:'Принято'}]};qa.mount('underweb://social/dialog/makarevich-1');});
 await page.screenshot({path:out+'/community-dialog-links.png',fullPage:true});
 for(const [path,target]of [['makarevich-1','community/makarevich-1'],['anya','profile/anya']]){
  for(const selector of ['.sn-heading a','.sn-dialog-message:not(.sn-outgoing) a[aria-label]','.sn-dialog-message:not(.sn-outgoing) a:not([aria-label])']){
   await page.evaluate(path=>qa.mount('underweb://social/dialog/'+path),path);
   const link=page.locator(selector).first();await link.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>qa.address),'underweb://social/'+target);
  }
  await page.evaluate(path=>qa.mount('underweb://social/dialog/'+path),path);
  await page.locator('.sn-outgoing a').first().click();assert.equal(await page.evaluate(()=>qa.address),'underweb://social/profile/me');
 }
 await page.evaluate(()=>{qa.now=22080;qa.state=qa.api.publishCommunityNotices(qa.state,qa.now).state;qa.visible=false;qa.mount('underweb://social/community/makarevich-1');qa.view.update();});
 assert.equal(await page.evaluate(()=>qa.api.communityUnreadCounts(qa.state,{nowMinute:qa.now}).total),1);
 await page.evaluate(()=>{qa.visible=true;qa.view.update();});assert.equal(await page.evaluate(()=>qa.api.communityUnreadCounts(qa.state,{nowMinute:qa.now}).total),0);
 await page.setViewportSize({width:640,height:900});await page.screenshot({path:out+'/community-compact.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});
 for(const [duration,lastAt]of [[120,13543],[20160,32160]]){
  await page.evaluate(({duration,lastAt})=>{let s=qa.topicFixture();s.tournaments.byId['makarevich-1'].rounds['round-2'].closesAt=13440+duration;s.roundThemes['makarevich-1:round-2'].closesAt=13440+duration;qa.state=qa.subscribeCommunity(s,'makarevich-1',true,{nowMinute:13440}).state;qa.now=lastAt-1;qa.state=qa.ensureSocialReactionPlans(qa.state,qa.now).state;qa.state=qa.api.publishCommunityNotices(qa.state,qa.now).state;qa.mount('underweb://social/groups');},{duration,lastAt});
  assert.equal(await page.locator('[data-social-section="groups"] .sn-unread-badge').innerText(),'+2');
  await page.evaluate(lastAt=>{qa.now=lastAt;qa.state=qa.ensureSocialReactionPlans(qa.state,qa.now).state;qa.state=qa.api.publishCommunityNotices(qa.state,qa.now).state;qa.view.update();},lastAt);
  assert.equal(await page.locator('[data-social-section="groups"] .sn-unread-badge').innerText(),'+3');
  await page.locator('.sn-group-card').getByRole('button',{name:'Макаревич Battle',exact:true}).click();
  assert.equal(await page.locator('[data-reaction-post="announce:judge:klim-propavshiy"]').count(),1);assert.equal(await page.locator('.sn-post > p > a[href="underweb://social/profile/klim-propavshiy"]').count(),1);
  assert.equal(await page.evaluate(()=>qa.state.phone.queue.length),0);await page.screenshot({path:out+'/cadence-'+duration+'-minutes.png',fullPage:true});
 }
 const beforeAssignment=await page.evaluate(()=>{let s=qa.topicFixture(),t=s.tournaments.byId['makarevich-1'];t.rounds.final={...t.rounds['round-2'],roundId:'final',opensAt:30000,closesAt:40080};s.roundThemes['makarevich-1:final']={...s.roundThemes['makarevich-1:round-2'],id:'makarevich-1:final',roundId:'final',opensAt:30000,closesAt:40080};t.events.push({id:'final',type:'round-announced',battleId:t.battleId,roundId:'final',dueAt:30000,themeId:'makarevich-1:final'});qa.now=34499;qa.state=qa.subscribeCommunity(s,'makarevich-1',true,{nowMinute:qa.now}).state;qa.state=qa.ensureSocialReactionPlans(qa.state,qa.now).state;qa.mount('underweb://social/groups');return qa.api.publicAnnouncedJudges(qa.state,{battleId:t.battleId,roundId:'final',nowMinute:qa.now}).map(j=>j.id);});
 assert.deepEqual(beforeAssignment,['eparhiya']);
 await page.evaluate(()=>{qa.now=34500;qa.state=qa.ensureSocialReactionPlans(qa.state,qa.now).state;qa.state=qa.api.publishCommunityNotices(qa.state,qa.now).state;qa.view.update();qa.phoneContext.pcPhase='room';qa.phoneContext.nowMinute=qa.now;qa.phone.update();});
 assert.equal(await page.locator('[data-social-section="groups"] .sn-unread-badge').innerText(),'+1');assert.match(await page.locator('.bl-phone-body').innerText(),/тридцать третий/);
 assert.deepEqual(await page.evaluate(()=>qa.state.phone.queue.map(p=>p.id)),['community-post:final:judge:thirty-third']);
 await page.evaluate(()=>{qa.phoneContext.pcPhase='desktop';qa.phone.update();});await page.locator('.sn-group-card').getByRole('button',{name:'Макаревич Battle',exact:true}).click();
 const returning=page.locator('.sn-post').filter({has:page.locator('[data-reaction-post="final:judge:thirty-third"]')}).locator('p > a');assert.equal(await returning.innerText(),'тридцать третий');await returning.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>qa.address),'underweb://social/profile/thirty-third');assert.equal(await page.evaluate(()=>qa.state.phone.queue.length),0);
 assert.deepEqual(errors,[]);console.log('PASS native short/long deadline cadence boundaries, current-round returning assignment/notice/inline link, group +2 badge, keyboard open/read, room phone notice and no already-read replay, durable queue retirement, static like/focus/reload, inline judge name link and no panel wording, community/person/self heading/name/avatar routing, hidden/visible read, reduced motion, SVG MIME/decode; origin '+base);
 await page.evaluate(()=>{qa.view.dispose();qa.phone.dispose();});await context.close();
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
