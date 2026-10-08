import {assetPath} from './helpers/apartment-assets.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('exported walking speed moves thirty percent farther with the same stride length',async()=>{
 const {ApartmentMotion}=await api();
 const exported=JSON.parse(fs.readFileSync(assetPath('scene.json'),'utf8'));
 const fast=new ApartmentMotion(exported),old=new ApartmentMotion({...exported,speed:1.02});
 for(const actor of [fast,old]){actor.yaw=Math.PI/2;actor.move(5.5);for(let i=0;i<30;i++)actor.tick(1/60);}
 assert.ok(Math.abs(fast.walkDistance/old.walkDistance-1.3)<1e-10);
 assert.ok(Math.abs(fast.walkDistance-.663)<1e-10);assert.equal(exported.stride,.9);
});

async function api() {
  try { return await import('../src/apartment-v3-motion.js'); }
  catch { assert.fail('The unified apartment controller has not been implemented'); }
}
test('waking from initial sleep reports one completed rest for the world clock',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.startSleeping();m.drainEvents();
 assert.equal(m.wakeUp(),true);assert.equal(m.wakeUp(),false);
 assert.deepEqual(m.drainEvents().filter(e=>e.type==='completed'),[{type:'completed',id:'bed'}]);
});
const config={bounds:[-6,6],spawn:[2,0,.8],speed:1.1,doorX:0,actions:{
  computer:{approach:[4,0,.8],pose:[4,.05,-.35],yaw:Math.PI,clip:'seated',fade:true,duration:5},
  sink:{approach:[-3,0,.8],pose:[-3,0,-.5],yaw:Math.PI,clip:'wash',fade:false,duration:4},
  bed:{approach:[2,0,.8],pose:[1,.58,-.45],yaw:Math.PI/2,clip:'sleep',fade:true,duration:5}
}};
test('walking faces its direction and the camera stays centred on the hero',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);
 m.move(-3);for(let i=0;i<90;i++)m.tick(1/60);
 assert.ok(m.position[0]<2);assert.equal(m.cameraX,m.position[0]);
 assert.ok(Math.abs(m.yaw+Math.PI/2)<.01);assert.equal(m.clip,'walk');
});
test('interaction uses the exported anchor and performs only after approach and turn',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.interact('sink');
 assert.notEqual(m.phase,'perform');for(let i=0;i<500;i++)m.tick(1/60);
 assert.equal(m.actionId,'sink');assert.equal(m.clip,'wash');assert.equal(m.phase,'perform');
 assert.ok(Math.abs(m.position[0]+3)<.01);assert.ok(Math.abs(m.yaw-Math.PI)<.01);
});
test('seated and sleeping pose changes happen only under full fade and clicks can leave',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.interact('bed');
 let observed=false;
 for(let i=0;i<150;i++){const before=m.clip;m.tick(1/60);if(before!=='sleep'&&m.clip==='sleep'){assert.equal(m.fade,1);observed=true;}}
 assert.ok(observed);assert.equal(m.phase,'perform');m.move(-2);
 for(let i=0;i<150;i++)m.tick(1/60);
 assert.equal(m.clip,'walk');assert.equal(m.actionId,null);assert.equal(m.position[1],0);
});
test('cross-room travel opens the interior door before the actor reaches it',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.move(-3);
 let crossed=false;for(let i=0;i<400;i++){m.tick(1/60);if(Math.abs(m.position[0])<.1){assert.ok(m.doorOpen>.9);crossed=true;}}
 assert.ok(crossed);assert.equal(m.phase,'idle');assert.ok(m.doorOpen<.1);
});
test('a long browser frame cannot teleport through a door or a fade',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.move(-5);m.tick(20);
 assert.ok(m.position[0]>1.8);assert.equal(m.cameraX,m.position[0]);
});

test('turning toward the viewer rotates the whole root smoothly',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.yaw=-Math.PI/2;m.faceCamera();
 assert.equal(m.yaw,-Math.PI/2);m.tick(1/60);assert.ok(m.yaw>-Math.PI/2&&m.yaw<0);
 for(let i=0;i<40;i++)m.tick(1/60);assert.equal(m.yaw,0);assert.equal(m.phase,'idle');
});

test('leaving a kitchen object turns before walking out and advances stride distance',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.position=[-3,0,.8];m.interact('sink');
 for(let i=0;i<130;i++)m.tick(1/60);assert.equal(m.phase,'perform');const z=m.position[2],dist=m.walkDistance;
 m.move(3);m.tick(1/60);assert.equal(m.position[2],z);assert.equal(m.phase,'return-turn');
 for(let i=0;i<150;i++)m.tick(1/60);assert.ok(m.walkDistance>dist);assert.equal(m.position[2],.8);assert.equal(m.phase,'walk');
});

test('interior door cannot close through a hero stopped in its sweep',async()=>{
 const {ApartmentMotion}=await api();
 for(const x of [-.2,.6,1.1]){
   const m=new ApartmentMotion({...config,spawn:[x>0?-2:2,0,.8]});m.move(x);for(let i=0;i<400;i++)m.tick(1/60);
   assert.equal(m.phase,'idle');assert.ok(m.doorOpen>.95);
   m.move(-3);for(let i=0;i<400;i++)m.tick(1/60);assert.ok(m.doorOpen<.05);
 }
});

test('the passage closes after crossing clear of its living-room swing on the kitchen side',async()=>{
 const {ApartmentMotion}=await api();
 for(const x of [-.6,-1.1]){
   const m=new ApartmentMotion(config);m.move(x);advance(m,6);
   assert.equal(m.phase,'idle');assert.equal(m.position[0],x);assert.ok(m.doorOpen<.01);
 }
});

test('crossing from bed to the fridge closes the passage before the fridge action',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion({...config,actions:{...config.actions,
   fridge:{approach:[-1.26,0,.8],pose:[-1.26,0,-.05],yaw:Math.PI,clip:'reach',fade:false,duration:5}
 }});
 m.startSleeping();assert.ok(m.interact('fridge'));
 for(let i=0;i<600&&m.actionId!=='fridge';i++)m.tick(1/60);
 for(let i=0;i<600&&m.phase!=='perform';i++)m.tick(1/60);
 assert.equal(m.actionId,'fridge');assert.equal(m.phase,'perform');assert.equal(m.position[0],-1.26);
 assert.ok(m.doorOpen<.01);
});

test('a crossing from the kitchen starts opening before reaching the narrow kitchen sweep',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion({...config,spawn:[-1,0,.8]});
 m.yaw=Math.PI/2;m.move(2);advance(m,.2);
 assert.ok(m.position[0]<-.4);assert.ok(m.doorOpen>.5);
 let crossed=false;for(let i=0;i<300;i++){
   m.tick(1/60);if(Math.abs(m.position[0])<.1){assert.ok(m.doorOpen>.9);crossed=true;}
 }
 assert.ok(crossed);assert.equal(m.position[0],2);assert.ok(m.doorOpen<.01);
});

test('configured door sweep offsets determine when each side is clear',async()=>{
 const {ApartmentMotion}=await api();
 for(const route of [{spawn:3,hold:.4,clear:.2},{spawn:-1,hold:1.6,clear:1.9}]){
   const m=new ApartmentMotion({...config,doorX:1,doorSweep:[-.7,.8],spawn:[route.spawn,0,.8]});
   m.move(route.hold);advance(m,6);assert.equal(m.position[0],route.hold);assert.ok(m.doorOpen>.95);
   m.move(route.clear);advance(m,2);assert.equal(m.position[0],route.clear);assert.ok(m.doorOpen<.01);
 }
});

test('inspection hold allows prop animation time to advance without completing the action',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.interact('bed');
 for(let i=0;i<700;i++)m.tick(1/60,true);
 assert.equal(m.phase,'perform');assert.ok(m.phaseTime>5);m.tick(1/60);assert.equal(m.phase,'return-out');
});

function advance(m,seconds){for(let i=0;i<Math.round(seconds*60);i++)m.tick(1/60);}

test('same-room movement and standing close to the door never open it',async()=>{
 const {ApartmentMotion}=await api();
 for(const side of [-1,1]){
   const m=new ApartmentMotion({...config,spawn:[side*2,0,.8]});m.move(side*.5);
   let widest=0;for(let i=0;i<900;i++){m.tick(1/60);widest=Math.max(widest,m.doorOpen);}
   assert.equal(m.phase,'idle');assert.equal(m.position[0],side*.5);assert.equal(widest,0);
 }
});

test('clicking an object in the other room authorizes safe door crossing',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.interact('sink');
 let crossed=false;for(let i=0;i<400;i++){
   m.tick(1/60);if(Math.abs(m.position[0])<.1){assert.ok(m.doorOpen>.9);crossed=true;}
 }
 assert.ok(crossed);assert.equal(m.actionId,'sink');
});

test('a finished crossing does not authorize a later same-room approach',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.move(-3);advance(m,8);
 assert.ok(m.doorOpen<.01);m.move(-.5);let widest=0;
 for(let i=0;i<600;i++){m.tick(1/60);widest=Math.max(widest,m.doorOpen);}
 assert.equal(m.position[0],-.5);assert.ok(widest<.01);
});

test('same-room destinations at a closed door stop the body safely on the current side',async()=>{
 const {ApartmentMotion}=await api();
 for(const doorX of [0,1])for(const side of [-1,1])for(const offset of [0,.05,.2]){
   const m=new ApartmentMotion({...config,doorX,spawn:[doorX+side*2,0,.8]});
   m.move(doorX+side*offset);
   for(let i=0;i<300;i++){
     m.tick(1/60);assert.ok(side*(m.position[0]-doorX)>=.3-1e-10);assert.equal(m.doorOpen,0);
   }
   assert.equal(m.phase,'idle');assert.ok(Math.abs(m.position[0]-(doorX+side*.3))<1e-10);
 }
});

test('a passage request still crosses after a floor click exactly at the closed door',async()=>{
 const {ApartmentMotion}=await api();
 for(const side of [-1,1]){
   const m=new ApartmentMotion({...config,spawn:[side*2,0,.8],actions:{...config.actions,passage:{crossRoom:true}}});
   m.move(0);advance(m,5);assert.equal(m.position[0],side*.3);assert.equal(m.doorOpen,0);
   assert.ok(m.interact('passage'));let crossed=false;
   for(let i=0;i<300;i++){
     m.tick(1/60);if(Math.abs(m.position[0])<.3)assert.ok(m.doorOpen>=.88);
     if(Math.abs(m.position[0])<.1)crossed=true;
   }
   assert.ok(crossed);assert.equal(m.position[0],-side*1.5);assert.equal(m.phase,'idle');
 }
});

test('a hero already on the room boundary opens the door before moving off either side',async()=>{
 const {ApartmentMotion}=await api();
 for(const side of [-1,1]){
   const m=new ApartmentMotion({...config,spawn:[0,0,.8]});m.yaw=side*Math.PI/2;m.move(side*2);
   let stepped=false;for(let i=0;i<300;i++){
     const before=m.position[0];m.tick(1/60);
     if(before===0&&m.position[0]!==0){assert.ok(m.doorOpen>=.88);stepped=true;}
   }
   assert.ok(stepped);assert.equal(m.position[0],side*2);assert.equal(m.phase,'idle');assert.ok(m.doorOpen<.01);
 }
});

test('cancelling a crossing inside the passage keeps the door open until the hero clears it',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.move(-2);
 for(let i=0;i<300&&m.position[0]>.1;i++)m.tick(1/60);
 assert.ok(m.position[0]>0&&m.position[0]<=.1);assert.ok(m.doorOpen>.95);m.move(.05);advance(m,2);
 assert.equal(m.position[0],.05);assert.equal(m.phase,'idle');assert.ok(m.doorOpen>.95);
 m.move(2);for(let i=0;i<300;i++){m.tick(1/60);if(m.position[0]<1.35)assert.ok(m.doorOpen>.95);}
 assert.equal(m.position[0],2);assert.ok(m.doorOpen<.01);
});

test('ten seconds of idle starts a smooth relaxed turn toward the camera',async()=>{
 const {ApartmentMotion}=await api();
 for(const side of [-1,1]){
   const m=new ApartmentMotion(config);m.yaw=side*Math.PI/2;advance(m,9.9);
   assert.equal(m.yaw,side*Math.PI/2);advance(m,.2);
   assert.ok(Math.abs(m.yaw)<Math.PI/2);assert.ok(Math.abs(m.yaw)>1);
   assert.equal(m.clip,'idle');assert.deepEqual(m.position,[2,0,.8]);advance(m,4);
   assert.ok(Math.abs(m.yaw-side*.3)<.01);assert.equal(m.phase,'idle');
 }
});

test('moving cancels the relaxed turn immediately and restarts the idle delay',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.yaw=-Math.PI/2;advance(m,10.2);
 assert.ok(m.yaw>-Math.PI/2);assert.ok(m.move(3));assert.equal(m.phase,'walk');
 const yaw=m.yaw;m.tick(1/60);assert.ok(m.yaw>yaw);advance(m,2);
 assert.equal(m.phase,'idle');assert.equal(m.yaw,Math.PI/2);advance(m,8);
 assert.equal(m.yaw,Math.PI/2);advance(m,3);assert.ok(m.yaw<Math.PI/2);
});

test('initial sleeping holds the exported bed pose beyond the normal duration',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.startSleeping?.();
 assert.equal(m.phase,'perform');assert.equal(m.actionId,'bed');assert.equal(m.clip,'sleep');
 assert.deepEqual(m.position,[1,.58,-.45]);assert.equal(m.yaw,Math.PI/2);assert.equal(m.fade,0);
 advance(m,30);assert.equal(m.phase,'perform');assert.equal(m.sleeping,true);
 assert.deepEqual(m.position,[1,.58,-.45]);assert.equal(m.drainEvents().some(e=>e.type==='completed'),false);
});

test('waking from initial sleep moves off the bed only under a full fade',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.startSleeping?.();
 assert.equal(m.clip,'sleep');assert.ok(m.wakeUp());assert.equal(m.sleeping,false);
 assert.equal(m.phase,'return-out');m.tick(1/60);assert.deepEqual(m.position,[1,.58,-.45]);
 let moved=false;for(let i=0;i<90;i++){
   const y=m.position[1];m.tick(1/60);if(y!==m.position[1]){assert.equal(m.fade,1);moved=true;}
 }
 assert.ok(moved);assert.equal(m.phase,'idle');assert.equal(m.clip,'idle');assert.equal(m.fade,0);
 assert.deepEqual(m.position,[2,0,.8]);assert.equal(m.actionId,null);
});

test('movement and object interaction can interrupt persistent sleep through its fade',async()=>{
 const {ApartmentMotion}=await api();
 for(const request of [m=>m.move(-3),m=>m.interact('computer')]){
   const m=new ApartmentMotion(config);m.startSleeping?.();assert.equal(m.clip,'sleep');
   assert.ok(request(m));assert.equal(m.phase,'return-out');assert.equal(m.sleeping,false);
   assert.deepEqual(m.position,[1,.58,-.45]);advance(m,1);
   assert.equal(m.phase,'walk');assert.equal(m.position[1],0);assert.equal(m.fade,0);
 }
});

test('ordinary bed interaction still completes after waking from initial sleep',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(config);m.startSleeping?.();
 assert.equal(m.clip,'sleep');m.wakeUp();advance(m,1);m.drainEvents();assert.ok(m.interact('bed'));advance(m,8);
 assert.equal(m.phase,'idle');assert.equal(m.sleeping,false);
 assert.equal(m.drainEvents().filter(e=>e.type==='completed'&&e.id==='bed').length,1);
});

const entryConfig={...config,bounds:[-6,7],spawn:[6.03,0,.85],actions:{...config.actions,
  entry:{approach:[6.03,0,.85],pose:[6.03,0,-.94],yaw:Math.PI,clip:'open-door',fade:false,duration:3}
}};

test('the exterior door opens only for an entry request and before the hero crosses its threshold',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(entryConfig);
 advance(m,20);assert.equal(m.entryOpen,0);m.move(6.2);advance(m,2);assert.equal(m.entryOpen,0);
 assert.ok(m.interact('entry'));let opened=false,crossed=false;
 for(let i=0;i<900;i++){
   m.tick(1/60);assert.equal(m.cameraX,m.position[0]);
   if(m.entryOpen>0&&!opened){assert.equal(m.clip,'open-door');assert.deepEqual(m.position,[6.03,0,-.94]);opened=true;}
   if(m.position[2]<-1.5){assert.ok(m.entryOpen>.98||m.fade===1);crossed=true;}
 }
 assert.ok(opened);assert.ok(crossed);
});

test('entry leaves the hero safely outside under black and emits one exit event despite further input',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(entryConfig);m.interact('entry');
 let leaving=false;
 for(let i=0;i<1000;i++){
   m.tick(1/60);
   if(m.phase==='entry-leave'){
     leaving=true;assert.equal(m.move(-3),false);assert.equal(m.interact('sink'),false);
   }
 }
 assert.ok(leaving);assert.equal(m.phase,'outside');assert.equal(m.outside,true);assert.equal(m.fade,1);
 assert.ok(m.position[2]<-1.5);const parked=[...m.position];
 assert.equal(m.move(2),false);assert.equal(m.interact('entry'),false);advance(m,30);
 assert.deepEqual(m.position,parked);assert.equal(m.fade,1);
 assert.equal(m.drainEvents().filter(e=>e.type==='exited'&&e.id==='entry').length,1);
 advance(m,5);assert.deepEqual(m.drainEvents(),[]);
});

test('returning home opens before fading in and closes only after the hero clears the doorway',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(entryConfig);
 assert.equal(m.returnHome?.(),false);m.interact('entry');advance(m,15);m.drainEvents();
 assert.ok(m.returnHome());assert.equal(m.outside,false);assert.equal(m.fade,1);
 assert.ok(m.entryOpen>.98);assert.equal(m.returnHome(),false);
 let visibleOutside=false,walked=false;const distance=m.walkDistance;
 for(let i=0;i<500;i++){
   m.tick(1/60);
   if(m.fade<1&&m.position[2]<0){visibleOutside=true;assert.ok(m.entryOpen>.98);}
   if(m.phase==='entry-return-depth'){walked=true;assert.equal(m.clip,'walk');assert.equal(m.yaw,0);}
   if(m.entryOpen<.98&&m.fade<1)assert.ok(m.position[2]>=.85);
 }
 assert.ok(visibleOutside);assert.ok(walked);assert.ok(m.walkDistance>distance);
 assert.equal(m.phase,'idle');assert.equal(m.actionId,null);assert.equal(m.outside,false);
 assert.equal(m.fade,0);assert.equal(m.entryOpen,0);assert.deepEqual(m.position,[6.03,0,.85]);
 assert.equal(m.drainEvents().some(e=>e.type==='exited'),false);assert.ok(m.interact('entry'));
 advance(m,15);assert.equal(m.drainEvents().filter(e=>e.type==='exited').length,1);
});

test('entry inspection holds the opening pose until released then finishes the exit',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(entryConfig);m.interact('entry');
 for(let i=0;i<900;i++)m.tick(1/60,true);
 assert.equal(m.phase,'perform');assert.equal(m.clip,'open-door');assert.equal(m.entryOpen,1);
 assert.deepEqual(m.position,[6.03,0,-.94]);assert.equal(m.fade,0);
 assert.equal(m.drainEvents().some(e=>e.type==='exited'),false);
 advance(m,6);assert.equal(m.phase,'outside');assert.equal(m.fade,1);
 assert.equal(m.drainEvents().filter(e=>e.type==='exited').length,1);
});

test('an exit requested while sleeping wakes through the existing fade before approaching the entry',async()=>{
 const {ApartmentMotion}=await api();const m=new ApartmentMotion(entryConfig);m.startSleeping();
 assert.ok(m.interact('entry'));assert.equal(m.phase,'return-out');assert.equal(m.entryOpen,0);
 advance(m,20);assert.equal(m.phase,'outside');assert.equal(m.fade,1);assert.equal(m.sleeping,false);
 assert.equal(m.drainEvents().filter(e=>e.type==='exited').length,1);
});

const sideEntryConfig={...entryConfig,bounds:[-6,6.15],entryExit:{position:[8.35,0,.675],yaw:Math.PI/2},
  actions:{...entryConfig.actions,entry:{approach:[5.98,0,.85],pose:[6.04,0,.675],yaw:Math.PI/2,clip:'open-door',fade:false,duration:3},
    peephole:{approach:[5.98,0,.85],pose:[6.10,0,.675],yaw:Math.PI/2,clip:'idle',fade:false,duration:Infinity}}};

test('side entry walks through the exported right-hand opening and returns facing its path',async()=>{
  const {ApartmentMotion}=await api();const m=new ApartmentMotion(sideEntryConfig);m.interact('entry');
  let crossed=false;
  for(let i=0;i<1200;i++){m.tick(1/60);if(m.position[0]>6.5&&m.fade<1){crossed=true;assert.ok(m.entryOpen>.98);assert.equal(m.yaw,Math.PI/2);}}
  assert.ok(crossed);assert.equal(m.phase,'outside');assert.deepEqual(m.position,[8.35,0,.675]);
  assert.ok(m.returnHome());assert.ok(m.yaw<-1.4&&m.yaw>-1.7,'return faces left instead of walking sideways');
  for(let i=0;i<600;i++){m.tick(1/60);if(m.position[0]>6.35&&m.fade<1)assert.ok(m.entryOpen>.98);}
  assert.equal(m.phase,'idle');assert.deepEqual(m.position,[5.98,0,.85]);assert.equal(m.entryOpen,0);
});

test('peeking approaches the side door without opening it and can leave facing away',async()=>{
  const {ApartmentMotion}=await api();const m=new ApartmentMotion(sideEntryConfig);m.interact('peephole');advance(m,8);
  assert.equal(m.phase,'perform');assert.equal(m.entryOpen,0);assert.equal(m.yaw,Math.PI/2);
  assert.deepEqual(m.position,[6.10,0,.675]);assert.equal(m.drainEvents().some(e=>e.type==='exited'),false);
  m.move(3);for(let i=0;i<180;i++){m.tick(1/60);if(m.phase==='return-depth')assert.ok(m.yaw<0,'face along diagonal return to the lane');}
  assert.equal(m.entryOpen,0);assert.ok(m.position[0]<5.98);
});

test('clock-driven bed stays covered until the time model requests wake-up',async()=>{
  const {ApartmentMotion}=await api();const m=new ApartmentMotion({...config,actions:{...config.actions,bed:{...config.actions.bed,clockDriven:true}}});
  m.interact('bed');advance(m,12);assert.equal(m.sleeping,true);assert.equal(m.phase,'perform');
  assert.equal(m.drainEvents().some(e=>e.type==='completed'),false);
  assert.equal(m.wakeUp(),true);advance(m,1);assert.equal(m.phase,'idle');
  assert.equal(m.drainEvents().filter(e=>e.type==='completed'&&e.id==='bed').length,1);
});

test('diagonal approach walks along the actual path before turning to face the side door',async()=>{
  const {ApartmentMotion}=await api();const m=new ApartmentMotion(sideEntryConfig);m.interact('peephole');
  let approached=false,finished=false;
  const expected=Math.atan2(.12,-.175);
  for(let i=0;i<600;i++){
    m.tick(1/60);
    if(m.phase==='approach-depth'){approached=true;assert.ok(Math.abs(m.yaw-expected)<.01,'body must not side-slip while legs point elsewhere');}
    if(m.phase==='perform'){finished=true;assert.equal(m.yaw,Math.PI/2);break;}
  }
  assert.ok(approached&&finished);
});
