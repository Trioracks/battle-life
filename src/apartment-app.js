import {ApartmentMotion} from './apartment-v3-motion.js?rev=8';
import {ApartmentTime,loadHomeTime,saveHomeTime} from './apartment-v3-time.js?rev=8';
import {districts,getDistrictLocations} from './calikfornia.js';
import {advanceHomeFrame,prepareApartmentConfig} from './apartment-v3-runtime.js?rev=8';
import {playSoundCue} from './sound-cues.js';
import {APPEARANCE_OPTIONS,DEFAULT_APPEARANCE,STAT_KEYS,STAT_LABELS,createProfile,saveProfile,loadProfile} from './avatar-v3-profile.js?rev=7';

const $=s=>document.querySelector(s),canvas=$('#apartment'),status=$('#activity'),loading=$('#loading');
let audio=null,paused=false,skeleton=false,hold=false;
const cue=id=>{try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume();playSoundCue(id,audio);}catch{/* Sound is optional. */}};
try{
  const {createApartmentScene}=await import('./apartment-v3-scene.js?rev=8');
  const response=await fetch('./assets/apartment/v3/scene.json',{cache:'no-cache'});if(!response.ok)throw Error('Scene manifest '+response.status);
  const config=prepareApartmentConfig(await response.json()),view=await createApartmentScene(canvas,config);
  let motion=new ApartmentMotion(config),mode='menu',playing=false,previewYaw=0,previewTarget=0;
  let storage;try{storage=window.localStorage;}catch{/* Browsers can deny local storage. */}
  const saved=loadProfile(storage);let profile=saved.profile;
  let homeTime=loadHomeTime(storage)??new ApartmentTime(),lastTimeSave=0,lightPreview='game';
  if(profile)view.setAppearance(profile.appearance);
  let appearance={...DEFAULT_APPEARANCE},allocations=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
  const names={computer:'За компьютером',bed:'Сон',sink:'Моет посуду',stove:'Готовит еду',fridge:'Берёт еду',entry:'Открывает дверь','light-living':'Нажимает выключатель в комнате','light-kitchen':'Нажимает выключатель на кухне'};
  const sounds={computer:'chair-scrape',bed:'sleep',sink:'dishes',stove:'cook',fridge:'fridge',entry:'door'};
  const completed={computer:'Работа за компьютером закончена.',bed:'Отдохнул. Можно идти дальше.',sink:'Посуда вымыта.',stove:'Еда приготовлена.',fridge:'Взял еду из холодильника.'};
  let message='',messageUntil=0,last=performance.now(),lastStep=0,lastDoor=false,frameRate=60;
  function setMode(next){
    mode=next;document.body.dataset.mode=next;
    $('#main-menu').hidden=next!=='menu';$('#creator').hidden=next!=='creator';
    $('#destinations').hidden=next!=='destinations';
    $('#door-choice').hidden=next!=='door';$('#peephole').hidden=next!=='peephole';
    $('#game-header').hidden=next!=='game';$('#controls').hidden=next!=='game';
    $('#inspector').hidden=true;$('#rig-toggle').setAttribute('aria-expanded','false');$('#hover-label').textContent='';
    $('#fade').style.opacity=next==='destinations'?1:0;$('#continue-game').hidden=!profile&&!playing;
    $('#save-note').textContent=playing?'Текущая игра на паузе.':profile?`Сохранён персонаж: ${profile.name}`:saved.ok?'Внешность и навыки сохраняются на этом устройстве.':'Сохранение недоступно. Можно играть без него.';
    if(next!=='creator'&&next!=='peephole'){view.setRoomLights(homeTime.lights);view.render(motion,0,{paused:true,instant:true});}
    last=performance.now();
  }
  function resumeAnimation(){paused=false;$('#pause').textContent='Пауза';}
  function enterApartment(nextProfile){
    profile=nextProfile;motion=new ApartmentMotion(config);if(homeTime.initialRest||homeTime.isSleeping)motion.startSleeping();view.setAppearance(profile.appearance);
    playing=true;lastStep=0;lastDoor=false;hold=false;skeleton=false;$('#hold').checked=false;$('#show-bones').checked=false;
    $('#player-name').textContent=profile.name;resumeAnimation();setMode('game');cue('sleep');
  }
  function selectStep(stats){
    $('#appearance-panel').hidden=stats;$('#stats-panel').hidden=!stats;$('#next-step').hidden=stats;$('#start-game').hidden=!stats;
    $('#appearance-tab').setAttribute('aria-pressed',String(!stats));$('#stats-tab').setAttribute('aria-pressed',String(stats));
    $('#creator-footer-note').textContent=stats?'Распредели 10 очков и начни дома, под одеялом.':'Сначала внешность. Затем — 10 очков навыков.';
  }
  function updateStats(){
    const remaining=10-Object.values(allocations).reduce((a,b)=>a+b,0);
    $('#points-left').textContent=remaining;$('#points-badge').textContent=remaining;
    for(const key of STAT_KEYS){
      $(`#stat-${key}`).textContent=10+allocations[key]*10;
      $(`[data-increase="${key}"]`).disabled=remaining===0||allocations[key]>=4;
      $(`[data-decrease="${key}"]`).disabled=allocations[key]===0;
    }
    $('#start-game').disabled=remaining!==0||!$('#character-name').value.trim();
  }
  for(const [key,category] of Object.entries(APPEARANCE_OPTIONS)){
    const label=document.createElement('label');label.className='appearance-field';label.textContent=category.label;
    const select=document.createElement('select');select.id='look-'+key;select.name=key;select.setAttribute('aria-label',category.label);
    for(const option of category.options){const el=document.createElement('option');el.value=option.id;el.textContent=option.label;select.append(el);}
    select.value=appearance[key];select.addEventListener('change',()=>{appearance[key]=select.value;view.setAppearance(appearance);});label.append(select);$('#appearance-fields').append(label);
  }
  for(const key of STAT_KEYS){
    const row=document.createElement('div');row.className='stat-row';
    const name=document.createElement('span');name.textContent=STAT_LABELS[key];
    const minus=document.createElement('button');minus.type='button';minus.dataset.decrease=key;minus.textContent='−';minus.setAttribute('aria-label','Уменьшить: '+STAT_LABELS[key]);
    const value=document.createElement('output');value.id='stat-'+key;value.textContent='10';value.setAttribute('aria-label',STAT_LABELS[key]);
    const plus=document.createElement('button');plus.type='button';plus.dataset.increase=key;plus.textContent='+';plus.setAttribute('aria-label','Увеличить: '+STAT_LABELS[key]);
    minus.addEventListener('click',()=>{if(allocations[key]>0)allocations[key]--;updateStats();});
    plus.addEventListener('click',()=>{if(allocations[key]<4&&Object.values(allocations).reduce((a,b)=>a+b,0)<10)allocations[key]++;updateStats();});
    row.append(name,minus,value,plus);$('#stat-fields').append(row);
  }
  $('#character-name').addEventListener('input',updateStats);
  $('#distribute').addEventListener('click',()=>{allocations=Object.fromEntries(STAT_KEYS.map((k,i)=>[k,i===0?2:1]));updateStats();});
  $('#new-game').addEventListener('click',()=>{
    appearance={...DEFAULT_APPEARANCE};allocations=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));$('#character-name').value='';$('#creator-error').textContent='';
    for(const key of Object.keys(APPEARANCE_OPTIONS))$('#look-'+key).value=appearance[key];
    previewYaw=previewTarget=0;for(const b of $('#preview-angles').children)b.classList.toggle('active',b.dataset.yaw==='0');
    view.setAppearance(appearance);selectStep(false);updateStats();setMode('creator');$('#character-name').focus();
  });
  $('#continue-game').addEventListener('click',()=>{if(playing){view.setAppearance(profile.appearance);setMode('game');}else if(profile)enterApartment(profile);});
  $('#cancel-creator').addEventListener('click',()=>{view.setAppearance(profile?.appearance??DEFAULT_APPEARANCE);setMode('menu');});
  $('#next-step').addEventListener('click',()=>selectStep(true));$('#stats-tab').addEventListener('click',()=>selectStep(true));$('#appearance-tab').addEventListener('click',()=>selectStep(false));
  $('#creator-form').addEventListener('submit',e=>{
    e.preventDefault();try{
      const next=createProfile({name:$('#character-name').value,allocations,appearance});
      const result=saveProfile(storage,next);homeTime=new ApartmentTime();saveHomeTime(storage,homeTime);enterApartment(next);
      if(!result.ok){message='Персонаж создан, но браузер не разрешил сохранение.';messageUntil=performance.now()+8000;}
    }catch(error){$('#creator-error').textContent=error.message;}
  });
  for(const b of $('#preview-angles').children)b.addEventListener('click',()=>{previewTarget=Number(b.dataset.yaw);for(const other of $('#preview-angles').children)other.classList.toggle('active',other===b);});
  $('#menu-button').addEventListener('click',()=>setMode('menu'));
  $('#wake').addEventListener('click',()=>{resumeAnimation();motion.wakeUp();});
  $('#light-preview').addEventListener('change',e=>lightPreview=e.target.value);
  function showDistrict(id){
    const district=districts.find(d=>d.id===id),detail=$('#district-detail');detail.replaceChildren();
    const title=document.createElement('h3');title.textContent=district.name;
    const description=document.createElement('p');description.textContent=district.role+' · '+(district.minutes?district.minutes+' мин в пути':'рядом с домом');
    detail.append(title,description);
    for(const location of getDistrictLocations(id)){const line=document.createElement('p');line.textContent=location.label+' — '+location.description;detail.append(line);}
    for(const b of $('#districts').children)b.setAttribute('aria-pressed',String(b.dataset.district===id));
  }
  for(const district of districts){const b=document.createElement('button');b.textContent=district.name;b.dataset.district=district.id;b.addEventListener('click',()=>showDistrict(district.id));$('#districts').append(b);}
  showDistrict('north-sloboda');
  $('#return-home').addEventListener('click',()=>{if(motion.returnHome()){setMode('game');resumeAnimation();cue('door');}});
  function act(id){resumeAnimation();if(id==='entry'){if(!motion.busy)setMode('door');return;}if(motion.interact(id))cue('footstep');}
  $('#door-peek').addEventListener('click',()=>{setMode('game');act('peephole');});
  $('#door-exit').addEventListener('click',()=>{setMode('game');resumeAnimation();motion.interact('entry');});
  $('#door-cancel').addEventListener('click',()=>setMode('game'));
  function stopPeeking(){setMode('game');if(motion.actionId==='peephole'&&motion.phase==='perform')motion.leaveAction();}
  $('#peek-close').addEventListener('click',stopPeeking);
  for(const [id,label] of Object.entries({computer:'Компьютер',bed:'Кровать',sink:'Посуда',stove:'Плита',fridge:'Холодильник',passage:'Другая комната',entry:'Входная дверь','light-living':'Выключатель в комнате','light-kitchen':'Выключатель на кухне'})){
    const b=document.createElement('button');b.textContent=label;b.dataset.action=id;b.addEventListener('click',()=>act(id));
    if(config.actions[id]?.lightRoom)b.setAttribute('aria-label',label);
    $('#actions').append(b);
  }
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||mode!=='game')return;const hit=view.pick(e);resumeAnimation();if(hit.id)act(hit.id);else if(hit.hero)motion.faceCamera();else if(Number.isFinite(hit.x)){motion.move(hit.x);cue('footstep');}});
  canvas.addEventListener('pointermove',e=>{if(mode!=='game'){canvas.style.cursor='default';return;}const hit=view.pick(e);canvas.style.cursor=hit.id||hit.hero?'pointer':'crosshair';
    const action=config.actions[hit.id];$('#hover-label').textContent=action?.lightRoom?(homeTime.lights[action.lightRoom]?'Выключить':'Включить')+' свет '+(action.lightRoom==='living'?'в комнате':'на кухне'):action?.label??(hit.hero?'Повернуться к камере':'');});
  canvas.addEventListener('pointerleave',()=>$('#hover-label').textContent='');
  $('#rig-toggle').addEventListener('click',()=>{$('#inspector').hidden=!$('#inspector').hidden;$('#rig-toggle').setAttribute('aria-expanded',String(!$('#inspector').hidden));});
  $('#show-bones').addEventListener('change',e=>skeleton=e.target.checked);$('#hold').addEventListener('change',e=>hold=e.target.checked);
  $('#pause').addEventListener('click',()=>{paused=!paused;$('#pause').textContent=paused?'Продолжить':'Пауза';});
  $('#step').addEventListener('click',()=>{paused=true;$('#pause').textContent='Продолжить';update(1/30,performance.now(),true);});$('#face').addEventListener('click',()=>motion.faceCamera());
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(mode==='peephole')stopPeeking();else if(mode==='door')setMode('game');else if(mode==='game')setMode('menu');});
  function update(dt,now,step=false){
    view.setRoomLights(homeTime.lights);
    if(mode==='creator'){
      const delta=Math.atan2(Math.sin(previewTarget-previewYaw),Math.cos(previewTarget-previewYaw));previewYaw+=delta*(1-Math.exp(-dt*9));
      view.renderPreview(dt,previewYaw,$('#preview-stage').getBoundingClientRect());return;
    }
    if(mode==='peephole'){view.renderPeephole($('#peek-stage').getBoundingClientRect());return;}
    if(mode==='menu'||mode==='destinations'||mode==='door'){view.setTime(homeTime.minutes,lightPreview==='game'?homeTime.minutes:Number(lightPreview));view.render(motion,0,{paused:true});return;}
    const events=!paused||step?advanceHomeFrame(motion,homeTime,dt,hold).events:[];
    for(const event of events){
      if(sounds[event.id]&&(event.type==='swap'||(event.type==='started'&&!config.actions[event.id].fade)))cue(sounds[event.id]);
      if(event.type==='interacted'){
        const room=config.actions[event.id].lightRoom;
        message=`Свет ${room==='living'?'в комнате':'на кухне'} ${homeTime.lights[room]?'включён':'выключен'}.`;messageUntil=now+4000;saveHomeTime(storage,homeTime);
      }
      if(event.type==='completed'){message=completed[event.id]??message;messageUntil=now+4000;saveHomeTime(storage,homeTime);}
      if(event.type==='started'&&event.id==='bed')saveHomeTime(storage,homeTime);
      if(event.type==='started'&&event.id==='peephole'){setMode('peephole');view.renderPeephole($('#peek-stage').getBoundingClientRect());return;}
      if(event.type==='exited'){saveHomeTime(storage,homeTime);setMode('destinations');}
    }
    if(motion.clip==='walk'&&motion.walkDistance-lastStep>config.stride/2){cue('footstep');lastStep=motion.walkDistance;}
    const door=motion.doorOpen>.3;if(door&&!lastDoor)cue('door');lastDoor=door;
    view.setRoomLights(homeTime.lights);view.setTime(homeTime.minutes,lightPreview==='game'?homeTime.minutes:Number(lightPreview));
    view.render(motion,paused&&!step?0:dt,{skeleton,paused:paused&&!step});$('#fade').style.opacity=motion.fade;
    $('#home-time').textContent=`День ${homeTime.day} · ${homeTime.label} · ${homeTime.period} · Дом`;
    if(now-lastTimeSave>(homeTime.isSleeping?500:15000)){saveHomeTime(storage,homeTime);lastTimeSave=now;}
    $('#room').textContent=motion.position[0]<0?'КУХНЯ':'ЖИЛАЯ КОМНАТА';
    $('#state').textContent=`${motion.phase} · ${motion.clip} · x ${motion.position[0].toFixed(2)} · камера ${motion.cameraX.toFixed(2)} · ${Math.round(motion.yaw*180/Math.PI)}° · дверь ${Math.round(motion.doorOpen*100)}% · ${Math.round(frameRate)} FPS`;
    $('#wake').hidden=!motion.sleeping;
    $('#sleep-progress').hidden=!motion.sleeping;$('#sleep-progress').value=homeTime.sleepProgress;
    if(motion.sleeping)status.textContent=`Сон · до ${homeTime.sleepTargetLabel??'утра'} · время идёт быстрее${hold?' · осмотр приостановил время':''}`;
    else if(motion.phase.startsWith('entry-'))status.textContent=motion.phase.startsWith('entry-return')||motion.phase==='entry-close'?'Возвращается домой…':'Выходит из квартиры…';
    else if(motion.phase.startsWith('return'))status.textContent=motion.actionId==='bed'?'Просыпается…':'Заканчивает действие…';
    else if(motion.phase==='perform')status.textContent=names[motion.actionId]+' · клик по полу — закончить';
    else if(motion.actionId)status.textContent='Подходит: '+config.actions[motion.actionId].label.toLowerCase();
    else if(motion.phase==='walk')status.textContent='Идёт '+(motion.targetX<motion.position[0]?'влево':'вправо');
    else status.textContent=now<messageUntil?message:'Клик по полу — идти. По предмету — взаимодействовать.';
    for(const b of $('#actions').children){
      b.disabled=motion.busy;b.classList.toggle('active',b.dataset.action===motion.actionId);
      if(b.dataset.action==='passage')b.textContent=motion.position[0]<0?'Перейти в комнату':'Перейти на кухню';
      const room=config.actions[b.dataset.action]?.lightRoom;
      if(room){b.textContent=`Свет: ${room==='living'?'комната':'кухня'} · ${homeTime.lights[room]?'вкл.':'выкл.'}`;b.setAttribute('aria-pressed',String(homeTime.lights[room]));}
    }
  }
  loading.hidden=true;setMode('menu');view.render(motion,0);
  function frame(now){const raw=(now-last)/1000,dt=Math.min(raw,.25);if(raw>0)frameRate=frameRate*.9+Math.min(240,1/raw)*.1;last=now;update(dt,now);requestAnimationFrame(frame);}requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>last=performance.now());
}catch(error){console.error(error);loading.querySelector('h2').textContent='Не удалось загрузить сцену';loading.querySelector('p').textContent=error.message;loading.classList.add('error');}
