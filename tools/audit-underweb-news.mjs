// Optional online maintenance check; not part of npm test or runtime.
// Saves statuses only, never copies remote articles into the repository.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {UNDERWEB_NEWS} from '../src/underweb-news-data.js';
const output=new URL('file:///D:/Codex/Temp/Battle-underweb-news-20261010/source-audit.json');
await mkdir(new URL('./',output),{recursive:true});
let previous=[];
if(process.argv.includes('--retry'))try{previous=JSON.parse(await readFile(output,'utf8'));}catch{}
const currentUrls=new Set(UNDERWEB_NEWS.map(row=>row.sourceUrl));
const results=previous.filter(r=>r.status===200&&currentUrls.has(r.url));
const urls=[...currentUrls].filter(url=>!results.some(r=>r.url===url));
let next=0;
await Promise.all(Array.from({length:1},async()=>{
 while(next<urls.length){
  const url=urls[next++];
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(20000)}),html=await r.text();
   const result={url,status:r.status,finalUrl:r.url,checkedAt:new Date().toISOString(),retryAfter:r.headers.get('retry-after'),pageTitle:html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g,' ').trim()};
   results.push(result);
   if(!r.ok)console.log('SOURCE HTTP',r.status,url);
   if(r.status===429){console.log('Rate limited; ending audit. Retry later.');break;}
  }catch(error){results.push({url,status:0,error:error.message,checkedAt:new Date().toISOString()});console.log('SOURCE ERROR',url,error.message);}
  if(next%10===0)console.log('checked',next,'/',urls.length);
  await new Promise(resolve=>setTimeout(resolve,1200));
 }
}));
await writeFile(output,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({sources:results.length,ok:results.filter(r=>r.status===200).length,failed:results.filter(r=>r.status!==200).length},null,2));
if(results.some(r=>r.status!==200)||results.length!==currentUrls.size)process.exitCode=1;
