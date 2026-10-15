// Browser-side integration on an isolated scratch document.
export async function verifyWeekplayRecovery(){
 const mod=name=>import('/src/'+name+'.js?rev=43');
 const [{topicFixture},publications,{createSocialBackground},{createHeldWorkerReply},saves]=await Promise.all([import('/test/helpers/round-topic-fixture.js'),mod('social-community-publications'),mod('social-background'),import('/tools/qa/held-worker-reply.js'),mod('virtual-pc-state')]);
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 let state=topicFixture();state.social.subscriptions=['makarevich-1'];state=publications.publishCommunityNotices(state,13800).state;
 check(publications.communityUnreadCounts(state,{nowMinute:13800}).total>0,'unread baseline');
 const reply=createHeldWorkerReply(()=>new Worker('/src/social-worker.js?rev=43',{type:'module'}));let background,savesCalled=0;
 try{
  background=createSocialBackground({getState:()=>state,createWorker:()=>reply.worker,persist:()=>{savesCalled++;return true;},onState:next=>state=next});
  background.tick(13800,{},0);await reply.received;
  state=publications.markCommunitySeen(state,{communityId:'makarevich-1',nowMinute:13800}).state;const read=JSON.stringify(state.social.communityReads);reply.deliver();
  check(savesCalled===0,'stale Worker cannot persist');check(JSON.stringify(state.social.communityReads)===read,'native Worker preserves group read');check(publications.communityUnreadCounts(state,{nowMinute:13800}).total===0,'unread remains zero');
 }finally{background?.dispose();reply.dispose();}
 check(saves.saveVirtualPcState(localStorage,state),'save baseline');const bytes=localStorage.getItem(saves.VIRTUAL_PC_STORAGE_KEY);
 check(!saves.saveVirtualPcState({getItem:key=>localStorage.getItem(key),setItem(){throw new DOMException('QA quota','QuotaExceededError');}},state),'quota is explicit');
 check(localStorage.getItem(saves.VIRTUAL_PC_STORAGE_KEY)===bytes,'quota preserves bytes');
 localStorage.setItem(saves.VIRTUAL_PC_STORAGE_KEY,JSON.stringify({version:1,power:'on',projects:[{id:'broken',kind:'beat',audio:{unknown:true}}],audioExports:{version:1,files:[{id:'lost',descriptor:{parts:[]}}]}}));
 const damaged=saves.loadVirtualPcState(localStorage);check(damaged.ok&&damaged.state.projects[0].recoveryIssue&&damaged.state.audioExports.recovery.length===1,'damaged sections retain recovery');
 localStorage.setItem(saves.VIRTUAL_PC_STORAGE_KEY,'{broken');check(!saves.loadVirtualPcState(localStorage).ok&&localStorage.getItem(saves.VIRTUAL_PC_STORAGE_KEY)==='{broken','invalid raw save retained');
 localStorage.setItem(saves.VIRTUAL_PC_STORAGE_KEY,JSON.stringify({version:1,power:'on',projects:[]}));check(saves.loadVirtualPcState(localStorage).ok,'legacy save migrates');localStorage.removeItem(saves.VIRTUAL_PC_STORAGE_KEY);
 return {nativeStaleWorkerRejected:true,readCount:0,quotaBytesPreserved:true,damagedSections:true,invalidRawPreserved:true,oldSave:true};
}
