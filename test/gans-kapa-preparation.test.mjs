import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {measuredPhraseSpans,deriveMeasuredLoop,writeOwned} from '../tools/prepare-gans-kapa-local.mjs';
// Catches padding silence being treated as a phrase or separated phrases being merged.
test('phrase spans retain two separated meaningful signal regions',()=>{
 const channel=new Float32Array(8000);channel.fill(.2,800,2400);channel.fill(.2,4800,6400);
 assert.deepEqual(measuredPhraseSpans({sampleRate:8000,channels:[channel]}),[{startSeconds:.1,endSeconds:.3},{startSeconds:.6,endSeconds:.8}]);
});
// Catches truncating post-cycle decay rather than preserving it in the loop.
test('two-bar derivation folds real tail into the cycle and repeats four bars',()=>{
 const channel=new Float32Array(240000);channel[1000]=.2;channel[236200]=.3;
 const result=deriveMeasuredLoop({sampleRate:44100,channels:[channel,channel.slice()]},{cycleBars:2,trimFrames:0});
 assert.equal(result.channels[0].length,470400);assert.ok(Math.abs(result.channels[0][1000]-.5)<1e-6);assert.equal(result.channels[0][236200],result.channels[0][1000]);
});
// Catches guessing that an arbitrarily long clip is a short musical phrase.
test('measured derivation refuses excess tails instead of blindly trimming a long bass',()=>{
 assert.throws(()=>deriveMeasuredLoop({sampleRate:44100,channels:[new Float32Array(937743),new Float32Array(937743)]},{cycleBars:2,trimFrames:0}),/tail|cycle/i);
});
// Catches regenerating a differing owned output over an existing user's artifact.
test('derived output writer refuses different existing bytes and accepts exact retries',async()=>{
 const base=resolve('artifacts/gans-mix-session/prep-test-scratch');await mkdir(base,{recursive:true});const root=await mkdtemp(resolve(base,'owned-'));
 await writeFile(resolve(root,'take.wav'),'original bytes');
 await assert.rejects(writeOwned(root,'take.wav',Buffer.from('different')),/overwrite|differ/i);
 assert.equal(await readFile(resolve(root,'take.wav'),'utf8'),'original bytes');
 await writeOwned(root,'take.wav',Buffer.from('original bytes'));
 await writeOwned(root,'new.wav',Buffer.from('new bytes'));
 assert.equal(await readFile(resolve(root,'new.wav'),'utf8'),'new bytes');
});
