// Only completed subjective reports and already-public learned hypotheses enter
// this module. It has no state, audio, version-quality or judging dependency.
import {validRapReport} from './rap-report-schema.js?rev=57';
const axes=['text','performance','music','sound'];
const strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export {validRapReport as isForecastReport};
const isForecastReport=validRapReport;
function impression(report,hypotheses){
 const known=axes.filter(k=>report.observations[k].band!==null);if(!known.length)return null;
 const center=known.reduce((n,k)=>n+(report.observations[k].band+.5)/8,0)/known.length;
 const confidence=known.reduce((n,k)=>n+report.observations[k].confidence,0)/4;
 const learned=hypotheses.filter(h=>known.includes(h?.aspect)&&['several','confident'].includes(h.stage)&&strings(h.sources)&&h.sources.length);
 const evidence=new Set(learned.map(h=>h.judgeId+':'+h.aspect)).size;
 const width=clamp(.7-.5*confidence+(4-known.length)*.12-Math.min(.1,evidence*.03),confidence<.4?.45:.15,1);
 const low=clamp(center-width/2,0,1-width);
 return {range:[low,low+width],confidence,known:known.length,sources:learned.flatMap(h=>h.sources)};
}
export function publicTrackForecast({report,judgeHypotheses=[],scale=50,comparisonReport=null}={}){
 const result={status:'unavailable',range:null,comparison:null,confidenceText:'Сначала нужен законченный разбор этой версии.',sources:[],label:'Моё предположение'};
 const pair=scale===null;if(pair)result.comparison={status:'unknown',text:'Для сравнения нужны разборы обеих версий.'};
 if(!isForecastReport(report)||!pair&&(!Number.isFinite(scale)||scale<=0))return result;
 const own=impression(report,Array.isArray(judgeHypotheses)?judgeHypotheses:[]);if(!own)return {...result,confidenceText:'Не удалось определить качества записи.'};
 result.sources=[...new Set([...report.sourceIds,...report.reviewIds,...own.sources])].sort();
 result.confidenceText=own.confidence<.4?'Неуверенное впечатление. Диапазон широкий.':'Субъективный прогноз; результат судейства может отличаться.';
 if(!pair)return {...result,status:'estimated',range:own.range.map(n=>Math.round(n*scale*1000)/1000)};
 if(!isForecastReport(comparisonReport)||comparisonReport.trackVersionId===report.trackVersionId||comparisonReport.subjectId===report.subjectId)return result;
 const other=impression(comparisonReport,[]);if(!other||own.known<3||other.known<3||Math.min(own.confidence,other.confidence)<.4)return result;
 const status=own.range[0]>other.range[1]?'leans-own':own.range[1]<other.range[0]?'leans-opponent':'uncertain';
 const text=status==='leans-own'?'Моя запись кажется сильнее; это не гарантирует победу.':status==='leans-opponent'?'Запись соперника кажется сильнее; исход не гарантирован.':'По моим разборам преимущество неясно.';
 return {...result,status:'comparison',comparison:{status,text},sources:[...new Set([...result.sources,...comparisonReport.sourceIds,...comparisonReport.reviewIds])].sort()};
}
