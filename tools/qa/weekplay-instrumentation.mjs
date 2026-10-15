// Applied to served QA responses only; no app diagnostics are shipped.
export function instrumentWeekplayHost(source){
 const anchor="loading.hidden=true;setMode('menu');";
 if(!source.includes(anchor)||!source.includes('function update(dt,now,step=false){'))throw Error('Host instrumentation anchor changed');
 return source.replace('function update(dt,now,step=false){','function updateOriginal(dt,now,step=false){').replace(anchor,`
 window.weekQA={samples:[],longTasks:[],lastNow:null,get state(){return pcState},get pc(){return virtualPc},get phase(){return pcLifecycle.snapshot.phase},
 get minute(){return gameMinuteStamp(homeTime)},get sleeping(){return motion.sleeping},get motion(){return motion},get background(){return socialBackground.snapshot},
 get pose(){return {x:motion.x,yaw:view.modes.yaw,pitch:view.modes.pitch,mode}},setState(s){persistPc(s,{atomic:true});virtualPc.syncState(pcState)},
 openFridge(){fridgeView.open(pcState)},reset(){this.samples=[];this.longTasks=[];this.lastNow=null},dispose(){this.disposed=true;socialBackground.dispose();phoneView.dispose();virtualPc.dispose();view.dispose();},
 resources(){return {...window.qaResources,rows:window.qaRows??0,projections:window.qaProjections??0,nodes:document.querySelectorAll('*').length,audio:virtualPc.beatAudio.getSnapshot().status,sources:virtualPc.beatAudio.sources.length}}};
 new PerformanceObserver(list=>weekQA.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask'});
 function update(dt,now,step=false){if(weekQA.disposed)return;const start=performance.now();updateOriginal(dt,now,step);if(mode==='game'||mode==='pc')weekQA.samples.push({ms:performance.now()-start,dt:weekQA.lastNow===null?0:now-weekQA.lastNow,phase:motion.phase,pcPhase:pcLifecycle.snapshot.phase,background:socialBackground.snapshot.busy});weekQA.lastNow=now;}
 `+anchor);
}

export function installWeekplayCounters(){
 const q=window.qaResources={observers:0,workers:0,raf:0,intervals:0,globalListeners:0,pcmRequests:0};
 const Obs=window.ResizeObserver;window.ResizeObserver=class extends Obs{observe(n){if(!this.qaActive){this.qaActive=true;q.observers++;}super.observe(n);}disconnect(){if(this.qaActive){q.observers--;this.qaActive=false;}super.disconnect();}};
 const W=window.Worker;window.Worker=class extends W{constructor(...a){super(...a);this.qaActive=true;this.qaPcm=String(a[0]).includes('beat-pcm-worker');q.workers++;}postMessage(...a){if(this.qaPcm)q.pcmRequests++;return super.postMessage(...a);}terminate(){if(this.qaActive){q.workers--;this.qaActive=false;}super.terminate();}};
 const raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set();
 window.requestAnimationFrame=fn=>{const id=raf(t=>{pending.delete(id);q.raf=pending.size;fn(t);});pending.add(id);q.raf=pending.size;return id;};
 window.cancelAnimationFrame=id=>{pending.delete(id);q.raf=pending.size;cancel(id);};
 const interval=window.setInterval.bind(window),clear=window.clearInterval.bind(window),timers=new Set();
 window.setInterval=(...a)=>{const id=interval(...a);timers.add(id);q.intervals=timers.size;return id;};window.clearInterval=id=>{timers.delete(id);q.intervals=timers.size;clear(id);};
 const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,entries=[];
 EventTarget.prototype.addEventListener=function(type,listener,options){if((this===document||this===window)&&!options?.once&&!entries.some(e=>e.target===this&&e.type===type&&e.listener===listener&&e.capture===Boolean(options===true||options?.capture))){entries.push({target:this,type,listener,capture:Boolean(options===true||options?.capture)});q.globalListeners=entries.length;}return add.call(this,type,listener,options);};
 EventTarget.prototype.removeEventListener=function(type,listener,options){const i=entries.findIndex(e=>e.target===this&&e.type===type&&e.listener===listener&&e.capture===Boolean(options===true||options?.capture));if(i>=0)entries.splice(i,1);q.globalListeners=entries.length;return remove.call(this,type,listener,options);};
}

export function instrumentWeekplayModule(path,source){
 if(path==='/src/apartment-app.js')return instrumentWeekplayHost(source);
 if(path==='/src/rap-dossier-cases.js')return source.replace("export function publicDossierCase(state,{caseId='recordings',nowMinute}={}){","export function publicDossierCase(state,{caseId='recordings',nowMinute}={}){globalThis.qaProjections=(globalThis.qaProjections??0)+1;");
 if(path==='/src/social-audio-view.js')return source.replace('rows.delete(row);','if(rows.delete(row))globalThis.qaRows--;').replace('rows.set(row,entry);','rows.set(row,entry);globalThis.qaRows=(globalThis.qaRows??0)+1;');
 return source;
}
