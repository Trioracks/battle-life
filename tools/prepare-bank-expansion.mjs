import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BEGINNER_BANK,BEGINNER_RECIPES,BEGINNER_FAMILIES} from '../src/beat-beginner-bank.js';
import {renderExpandedPart,expandedEvents} from './audio/expanded-patterns.mjs';
import {decodePcm16,encodePcm16,deriveSourceLoop,pcmStatistics} from './audio/source-loop.mjs';

const root=new URL('../',import.meta.url),destination=new URL('assets/audio/ft/beginner-v2/',root);
const hash=data=>createHash('sha256').update(data).digest('hex');
const sources=['untitled - Track 1_2.wav','untitled - Track 16.wav','untitled - Track 17.wav','untitled - Track 18.wav'];
// Measured from original left-channel PCM, first four bars: Hann-window FFT4096,
// non-overlapping windows; energy bands <150,150–500,500–2000,>2000 Hz.
// These observations justify melodic assignment; filenames alone do not establish a role.
const sourceCharacter=[
  {role:'theme',description:'Warm mid-register sustained/decaying melodic phrase; negligible sub-bass.',energyBands:[.001,.673,.325,.001],centroidHz:421,dominantHzQuantiles:[246,434,668]},
  {role:'theme',description:'Strong repeating mid-register pitched phrase with a modest low-register component; not a standalone sub-bass layer.',energyBands:[.096,.689,.215,0],centroidHz:434,dominantHzQuantiles:[105,445,527]},
  {role:'theme',description:'Changing upper-mid pitched phrase with negligible sub-bass and moderate rhythmic variation.',energyBands:[0,.603,.383,.014],centroidHz:607,dominantHzQuantiles:[328,527,879]},
  {role:'theme',description:'Sparse plucked/transient pitched phrase; high crest factor is retained instead of forcing dense-loop loudness.',energyBands:[.008,.508,.436,.049],centroidHz:709,dominantHzQuantiles:[223,352,1043]},
];
const parts=[];
// Never regenerates v1: original assets and all saved-project references remain immutable.
for(const part of BEGINNER_BANK.filter(part=>part.path.includes('/beginner-v2/'))){
  const index=Number(part.id.slice(-2))-17;let audio,provenance;
  if(part.kind==='theme'&&index>=30){
    const source='stems/'+sources[index-30],bytes=await readFile(new URL(source,root)),original=decodePcm16(bytes);
    audio=deriveSourceLoop(original);
    provenance={source,sourceHash:hash(bytes),sourceFrames:original.channels[0].length,sourceSampleRate:original.sampleRate,sourceChannels:original.channels.length,sourceStatistics:pcmStatistics(original.channels),character:sourceCharacter[index-30]};
    if(hash(await readFile(new URL(source,root)))!==provenance.sourceHash)throw new Error('Source changed: '+source);
  }else{
    audio={sampleRate:44100,channels:[renderExpandedPart(part.kind,index)]};
    provenance={family:BEGINNER_FAMILIES[Math.floor(index/2)],pattern:index,events:expandedEvents(part.kind,index)};
  }
  const wav=encodePcm16(audio),url=new URL(part.path,root);await mkdir(new URL('./',url),{recursive:true});await writeFile(url,wav);
  parts.push({...part,...provenance,frames:audio.channels[0].length,sampleRate:audio.sampleRate,channels:audio.channels.length,sha256:hash(wav),...pcmStatistics(audio.channels)});
}
await writeFile(new URL('manifest.json',destination),JSON.stringify({
  version:2,bpm:90,bars:4,key:'A minor',authorship:'90 original procedural parts and four user-recorded instrument themes. Original stems and beginner-v1 remain unchanged.',
  sourcePolicy:'Use sample zero through the first 512000 frames at 48000 Hz (four bars, 10.666667 seconds). Discard the later tail only from the derived game loop; originals retain every sample. Preserve stereo; 48-tap windowed-sinc resample to 44100 Hz; normalize toward RMS 0.048 with peak cap 0.23; fade in 3 ms and out 50 ms. Track 1 is not duplicated beneath Track 1_2.',
  mixPolicy:'Each recipe selects one drum, one theme and one bass layer. Procedural parts target RMS 0.047/0.043/0.054 with peak caps 0.28/0.23/0.25, and 2 ms endpoint fades. Recipe differences are in instrument events and timbres, independent of vocal recordings.',
  legacyReferences:[{id:'beginner-theme-16',source:'stems/untitled - Track 1.wav',path:'./assets/audio/ft/beginner-v1/theme/16.wav',role:'Original user theme retained unchanged; used once per assembly without layering another full user theme.'}],
  parts,recipes:BEGINNER_RECIPES,
},null,2)+'\n');
console.log('Prepared '+parts.length+' new loops for '+BEGINNER_RECIPES.length+' distinct beat recipes. Source WAVs and v1 assets preserved.');
