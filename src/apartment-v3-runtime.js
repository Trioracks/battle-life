import {advanceApartmentFrame} from './apartment-v3-frame.js?rev=43';
import {wardrobeAction} from './home-wardrobe.js?rev=43';
import {consumeFood} from './home-food.js?rev=43';

import {advanceVirtualPc,advanceVirtualPcDurably} from './virtual-pc-runtime.js?rev=43';

export function canStartHomeAction(id,clock){
  return id==='dining'&&!clock.mealReady?{allowed:false,reason:'Сначала приготовь еду на плите'}:{allowed:true,reason:''};
}
export function startHomeAction(motion,clock,id,sleepOptions){
  const check=canStartHomeAction(id,clock);
  return check.allowed?{allowed:motion.interact(id,sleepOptions),reason:''}:check;
}

export function consumeHomeFood(state,id,{persist=()=>false,cue=()=>{}}={}){
  const result=consumeFood(state,id);if(!result.ok)return result;
  let saved=false;try{const value=persist(result.state);saved=value===true||value?.ok===true;}catch{/* Retain the previous meal on a failed save. */}
  if(!saved)return {ok:false,reason:'save-failed',state};
  try{cue('crunch');}catch{/* Optional audio cannot undo a durable meal. */}
  return result;
}

export function prepareApartmentConfig(exported){
  const actions={...exported.actions,bed:{...exported.actions.bed,clockDriven:true},wardrobe:wardrobeAction()};
  const entry=actions.entry;
  if(entry)actions.peephole={label:'Посмотреть в глазок',approach:[...entry.approach],pose:[...entry.pose],yaw:entry.yaw,clip:'idle',fade:false,duration:Infinity};
  return {...exported,actions};
}

// The browser and regression tests use this same integration: only sleeping
// advances accelerated time, and the time model decides when to wake.
export function advanceHomeFrame(motion,clock,dt,hold=false){
  const elapsed=advanceApartmentFrame(motion,dt,hold),events=motion.drainEvents();
  for(const event of events){
    if(event.type==='interacted')clock.toggleRoomLight(motion.config.actions[event.id]?.lightRoom);
    if(event.type==='started'&&event.id==='bed')clock.beginSleep(event.sleepOptions);
    if(event.type==='completed')clock.completeAction(event.id);
  }
  if(clock.isSleeping&&!motion.sleeping)clock.cancelSleep();
  const result=hold&&motion.sleeping?{sleepCompleted:false}:clock.tick(elapsed);
  if(result.sleepCompleted){
    motion.wakeUp();
    const wakeEvents=motion.drainEvents();
    for(const event of wakeEvents)if(event.type==='completed')clock.completeAction(event.id);
    events.push(...wakeEvents);
  }
  return {elapsed,events,sleepCompleted:result.sleepCompleted};
}

export function advanceComputerHomeFrame(motion,clock,pcState,dt,computerOpen=false,persist=null,options={}){
  const holdComputer=computerOpen&&motion.actionId==='computer'&&motion.phase==='perform';
  const home=advanceHomeFrame(motion,clock,dt,holdComputer);
  const pc=persist?advanceVirtualPcDurably(pcState,clock,persist,options):advanceVirtualPc(pcState,clock,options);
  const computerStarted=home.events.some(event=>event.type==='started'&&event.id==='computer');
  const computerSeated=motion.actionId==='computer'&&motion.phase==='perform';
  return {...home,pcState:pc.state,pcAdvancedBytes:pc.advancedBytes,computerStarted,computerSeated};
}
