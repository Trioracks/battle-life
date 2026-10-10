import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacterSpeech,workNeedSpeech} from '../src/character-speech.js';
test('work refusal chooses food first and uses the current work thresholds',()=>{
 assert.equal(workNeedSpeech({music:{needs:{satiety:20,energy:72}}}),'Не могу работать, хочу поесть.');
 assert.equal(workNeedSpeech({music:{needs:{satiety:68,energy:15}}}),'Не могу работать, хочу поспать.');
 assert.equal(workNeedSpeech({music:{needs:{satiety:68,energy:72}}}),'');
});
test('speech prints two seconds, holds three, replaces latest and queues until room',()=>{
 const speech=createCharacterSpeech();speech.say('Первая');speech.tick(1);assert.equal(speech.snapshot.text,'Пер');
 speech.say('Вторая');assert.equal(speech.snapshot.fullText,'Вторая');speech.tick(2);assert.equal(speech.snapshot.text,'Вторая');speech.tick(2.9);assert.equal(speech.snapshot.visible,true);speech.tick(.1);assert.equal(speech.snapshot.visible,false);
 speech.say('Еда',{afterRoom:true});speech.say('Еда',{afterRoom:true});speech.tick(10,{roomReady:false});assert.equal(speech.snapshot.visible,false);speech.tick(0,{roomReady:true});assert.equal(speech.snapshot.fullText,'Еда');
});
test('hidden speech does not age or beep and denied audio never replays',()=>{
 let beeps=0;const speech=createCharacterSpeech({beep:()=>beeps++});speech.say('абвгдежзиклмнопрсту');speech.tick(.2);const shown=speech.snapshot.text;
 speech.tick(20,{hidden:true});assert.equal(speech.snapshot.text,shown);assert.equal(beeps,1);
 speech.tick(.01);assert.equal(beeps,1);speech.tick(1,{audioAllowed:false});const before=beeps;speech.tick(.01);assert.equal(beeps,before);
 speech.tick(20,{present:false});assert.equal(speech.snapshot.visible,false);
});
test('letter beeps stay below ten per second and optional audio failures never stop printing',()=>{
 let beeps=0;const speech=createCharacterSpeech({beep:()=>{beeps++;throw Error('denied');}});speech.say('а '.repeat(50));
 for(let n=0;n<100;n++)speech.tick(.01);assert.ok(beeps<=10);assert.ok(speech.snapshot.text.length>0);
});
test('replacing a speech cannot reset its shared ten-beep budget',()=>{
 let beeps=0;const speech=createCharacterSpeech({beep:()=>beeps++});
 for(let i=0;i<100;i++){speech.say('а'.repeat(1000));speech.tick(.01);}
 assert.ok(beeps>=2);assert.ok(beeps<=10);
});
