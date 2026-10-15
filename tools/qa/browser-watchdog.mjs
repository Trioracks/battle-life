// page.evaluate has no default timeout. Bound it and release its native owner.
export async function withBrowserWatchdog(evaluate,browser,timeoutMs=120000){
 let timer;
 try{
  return await Promise.race([Promise.resolve().then(evaluate),new Promise((_,reject)=>{
   timer=setTimeout(()=>{reject(new Error('Browser evaluation timed out after '+timeoutMs+' ms'));void browser.close().catch(()=>{});},timeoutMs);
  })]);
 }finally{clearTimeout(timer);}
}
