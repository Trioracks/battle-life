import {processBeatPcmMessage} from './beat-pcm-runtime.js?rev=59';
self.onmessage=({data})=>{
 try{const result=processBeatPcmMessage(data);self.postMessage(result,result.channels.map(c=>c.buffer));}
 catch{self.postMessage({id:data.id,error:'PCM processing failed'});}
};
