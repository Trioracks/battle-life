import {advanceApartmentFrame} from './apartment-v3-frame.js';
import {wardrobeAction} from './home-wardrobe.js?rev=27';

import {advanceVirtualPc} from './virtual-pc-runtime.js?rev=27';

export function canStartHomeAction(id,clock){
  return id==='dining'&&!clock.mealReady?{allowed:false,reason:'Сначала приготовь еду на плите'}:{allowed:true,reason:''};
}
export function startHomeAction(motion,clock,id){
  const check=canStartHomeAction(id,clock);
  return check.allowed?{allowed:motion.interact(id),reason:''}:check;
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
    if(event.type==='started'&&event.id==='bed')clock.beginSleep();
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

export function advanceComputerHomeFrame(motion,clock,pcState,dt,computerOpen=false){
  const holdComputer=computerOpen&&motion.actionId==='computer'&&motion.phase==='perform';
  const home=advanceHomeFrame(motion,clock,dt,holdComputer);
  const pc=advanceVirtualPc(pcState,clock);
  const computerStarted=home.events.some(event=>event.type==='started'&&event.id==='computer');
  const computerSeated=motion.actionId==='computer'&&motion.phase==='perform';
  return {...home,pcState:pc.state,pcAdvancedBytes:pc.advancedBytes,computerStarted,computerSeated};
}
