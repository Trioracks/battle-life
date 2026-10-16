// QA-only bridge: hold one native reply while local domain state changes.
export function createHeldWorkerReply(createWorker,{timeoutMs=15000}={}){
 const native=createWorker();let resolveReply,rejectReply,timer,held=null,settled=false,disposed=false;
 const received=new Promise((yes,no)=>{resolveReply=yes;rejectReply=no;});
 // Cleanup may run after an earlier local assertion, before its caller awaits.
 received.catch(()=>{});
 function fail(message){if(settled)return;settled=true;clearTimeout(timer);rejectReply(new Error(message));}
 function dispose(){if(disposed)return;disposed=true;fail('Final campaign social Worker disposed before reply');clearTimeout(timer);native.onmessage=native.onerror=native.onmessageerror=null;native.terminate();}
 const worker={postMessage(message){try{native.postMessage(message);}catch(error){fail('Final campaign social Worker failed: '+error.message);throw error;}},terminate:dispose};
 native.onmessage=event=>{if(disposed||settled)return;settled=true;clearTimeout(timer);held=event;resolveReply();};
 native.onerror=event=>{event.preventDefault?.();fail('Final campaign social Worker failed: '+(event.message||'load or execution error'));};
 native.onmessageerror=()=>fail('Final campaign social Worker reply could not be decoded');
 timer=setTimeout(()=>fail('Final campaign social Worker reply timed out after '+timeoutMs+' ms'),timeoutMs);
 return {worker,received,deliver(){if(!held)throw Error('No held Worker reply is available');const event=held;held=null;worker.onmessage?.(event);},dispose};
}
