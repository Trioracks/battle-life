import {ApartmentMotion} from './apartment-v3-motion.js?rev=8';
import {ApartmentTime,loadHomeTime,saveHomeTime} from './apartment-v3-time.js?rev=12';
import {districts,getDistrictLocations} from './calikfornia.js';
import {advanceComputerHomeFrame,advanceHomeFrame,prepareApartmentConfig,startHomeAction} from './apartment-v3-runtime.js?rev=13';
import {playSoundCue} from './sound-cues.js';
import {CameraPointer,cameraAllowsFirstPerson} from './apartment-v3-camera.js?rev=12';
import {DEFAULT_APPEARANCE,STAT_KEYS,STAT_LABELS,loadProfile} from './avatar-v3-profile.js?rev=10';
import {mountCreator,decorateCreatorButton} from './apartment-v3-creator.js?rev=12';
import {createCreatorSession} from './apartment-v3-creator-session.js?rev=12';
import {advanceVirtualPc} from './virtual-pc-runtime.js?rev=1';
import {createVirtualPcState,loadVirtualPcState,saveStudioProject,saveVirtualPcState,setPcPower} from './virtual-pc-state.js?rev=1';
import {mountVirtualPc} from './virtual-pc-ui.js?rev=1';

const $=s=>document.querySelector(s),canvas=$('#apartment'),status=$('#activity'),loading=$('#loading');
let audio=null,paused=false,skeleton=false,hold=false;
const cue=id=>{try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume();playSoundCue(id,audio);}catch{/* Sound is optional. */}};
try{
  const {createApartmentScene}=await import('./apartment-v3-scene.js?rev=12');
  const response=await fetch('./assets/apartment/v3/scene.json',{cache:'no-cache'});if(!response.ok)throw Error('Scene manifest '+response.status);
  const config=prepareApartmentConfig(await response.json()),view=await createApartmentScene(canvas,config);
  let motion=new ApartmentMotion(config),mode='menu',playing=false,previewYaw=0,previewTarget=0;
  let cameraFade=false;const lookInput=new CameraPointer();
  const cameraButton=$('#camera-mode');
  function cameraLabel(){const blocked=view.modes.mode!=='3D'&&!cameraAllowsFirstPerson(motion);cameraButton.disabled=view.modes.loading||blocked;cameraButton.title=blocked?'Вид от первого лица доступен стоя':'2D ↔ 3D (первое лицо). В 3D: правая кнопка — обзор, левая — действие.';cameraButton.textContent=view.modes.loading?'Камера: загрузка…':view.modes.error?'Камера: повторить':`Камера: ${view.modes.mode}`;}
  cameraButton.addEventListener('click',async()=>{
    const switching=view.modes.cycle(motion,view.loadMode,async apply=>{
      cameraFade=true;const overlay=$('#camera-fade');
      await overlay.animate([{opacity:0},{opacity:1}],{duration:100,fill:'forwards'}).finished;
      apply();view.render(motion,0,{paused:true});
      await overlay.animate([{opacity:1},{opacity:0}],{duration:100,fill:'forwards'}).finished;
      cameraFade=false;last=performance.now();
    });cameraLabel();await switching;cameraLabel();
  });
  canvas.addEventListener('contextmenu',e=>{if(mode==='game'&&view.modes.mode==='3D')e.preventDefault();});
  canvas.addEventListener('pointerdown',e=>{if(lookInput.start(e,mode==='game'&&view.modes.mode==='3D')){canvas.setPointerCapture(e.pointerId);e.preventDefault();}});
  function stopLook(){lookInput.stop();}
  canvas.addEventListener('pointerup',stopLook);canvas.addEventListener('pointercancel',stopLook);canvas.addEventListener('lostpointercapture',stopLook);
  let storage;try{storage=window.localStorage;}catch{/* Browsers can deny local storage. */}
  const saved=loadProfile(storage);let profile=saved.profile;
  let homeTime=loadHomeTime(storage)??new ApartmentTime(),lastTimeSave=0,lightPreview='game';
  const pcRoot=$('#virtual-pc'),savedPc=loadVirtualPcState(storage);let pcState=savedPc.state;
  function persistPc(next){pcState=createVirtualPcState(next);return saveVirtualPcState(storage,pcState);}
  function leaveComputer(shutdown=false){
    if(shutdown)persistPc(setPcPower(pcState,'off'));
    pcRoot.hidden=true;
    if(motion.actionId==='computer'&&motion.phase==='perform')motion.leaveAction();
    setMode('game');resumeAnimation();
  }
  const virtualPc=mountVirtualPc(pcRoot,{
    onPersist:next=>persistPc(next),
    onLeave:()=>leaveComputer(false),
    onShutdown:()=>leaveComputer(true),
    onSaveProject:(state,project)=>saveStudioProject(state,project),
  });
  function openComputer(){
    const alreadyOn=pcState.power==='on';persistPc(setPcPower(pcState,'on'));
    setMode('pc');pcRoot.hidden=false;
    if(alreadyOn)virtualPc.showDesktop(pcState);else virtualPc.boot(pcState);
  }
  if(profile)view.setAppearance(profile.appearance);
  let appearance={...DEFAULT_APPEARANCE},allocations=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
  const names={dining:'Ест за столом',computer:'За компьютером',bed:'Сон',sink:'Моет посуду',stove:'Готовит еду',fridge:'Берёт еду',entry:'Открывает дверь','light-living':'Нажимает выключатель в комнате','light-kitchen':'Нажимает выключатель на кухне'};
  const sounds={dining:'dishes',computer:'chair-scrape',bed:'sleep',sink:'dishes',stove:'cook',fridge:'fridge',entry:'door'};
  const completed={dining:'Поел.',computer:'Работа за компьютером закончена.',bed:'Отдохнул. Можно идти дальше.',sink:'Посуда вымыта.',stove:'Еда приготовлена.',fridge:'Взял еду из холодильника.'};
  let message='',messageUntil=0,last=performance.now(),lastStep=0,lastDoor=false,frameRate=60;
  function setMode(next){
    lookInput.stop();
    mode=next;document.body.dataset.mode=next;
    $('#main-menu').hidden=next!=='menu';$('#creator').hidden=next!=='creator';
    $('#destinations').hidden=next!=='destinations';
    $('#door-choice').hidden=next!=='door';$('#peephole').hidden=next!=='peephole';
    pcRoot.hidden=next!=='pc';
    $('#game-header').hidden=next!=='game';$('#controls').hidden=next!=='game';
    $('#inspector').hidden=true;$('#rig-toggle').setAttribute('aria-expanded','false');$('#hover-label').textContent='';
    $('#fade').style.opacity=next==='destinations'?1:0;$('#continue-game').hidden=!profile&&!playing;
    $('#save-note').textContent=playing?'Текущая игра на паузе.':profile?`Сохранён персонаж: ${profile.name}`:saved.ok?'Внешность и навыки сохраняются на этом устройстве.':'Сохранение недоступно. Можно играть без него.';
    if(next!=='creator'&&next!=='peephole'){view.setRoomLights(homeTime.lights);view.render(motion,0,{paused:true,instant:true});}
    last=performance.now();
  }
  function resumeAnimation(){paused=false;$('#pause').textContent='Пауза';}
  function enterApartment(nextProfile){
    view.modes.mode='2D';view.modes.revision++;cameraLabel();
    profile=nextProfile;motion=new ApartmentMotion(config);if(homeTime.initialRest||homeTime.isSleeping)motion.startSleeping();view.setAppearance(profile.appearance);
    playing=true;lastStep=0;lastDoor=false;hold=false;skeleton=false;$('#hold').checked=false;$('#show-bones').checked=false;
    $('#player-name').textContent=profile.name;resumeAnimation();setMode('game');cue('sleep');
  }
  function selectCreatorSection(section){
    creator.selectSection(section);const stats=section==='stats';
    $('#appearance-panel').hidden=stats;$('#stats-panel').hidden=!stats;$('#next-step').hidden=stats;$('#start-game').hidden=!stats;
    for(const name of ['appearance','clothing','stats'])$('#'+name+'-tab').setAttribute('aria-pressed',String(name===section));
    $('#next-step').textContent=section==='appearance'?'Одежда →':'Характеристики →';
    $('#creator-footer-note').textContent=stats?'Распредели 10 очков. Твоя история начнётся дома.':section==='clothing'?'Ткань, силуэт, цвет. Всё выбранное сохранится.':'Лицо, волосы и характер. Начни с главного.';
  }
  function updateStats(){
    const remaining=10-Object.values(allocations).reduce((a,b)=>a+b,0);
    $('#points-left').textContent=remaining;$('#points-badge').textContent=remaining;
    for(const key of STAT_KEYS){
      $(`#stat-${key}`).textContent=10+allocations[key]*10;
      $(`[data-stat-summary="${key}"]`).textContent=10+allocations[key]*10;
      $(`[data-increase="${key}"]`).disabled=remaining===0||allocations[key]>=4;
      $(`[data-decrease="${key}"]`).disabled=allocations[key]===0;
    }
    $('#start-game').disabled=remaining!==0||!$('#character-name').value.trim();
  }
  const creator=mountCreator($('#appearance-fields'),next=>{appearance=next;view.setAppearance(appearance);},{categoryRoot:$('#creator-categories')});
  let creatorSession=null;
  for(const [id,icon] of [['appearance-tab','face'],['clothing-tab','top'],['stats-tab','stats'],['preview-body','rotate'],['cancel-creator','back'],['start-game','confirm']])decorateCreatorButton($('#'+id),icon);
  for(const key of STAT_KEYS){
    const term=document.createElement('dt'),summary=document.createElement('dd');term.textContent=STAT_LABELS[key];summary.dataset.statSummary=key;summary.textContent='10';$('#stats-overview').append(term,summary);
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
    creatorSession=createCreatorSession(profile,storage,{enter(next){homeTime=new ApartmentTime();saveHomeTime(storage,homeTime);enterApartment(next);},restore(look){view.setAppearance(look);setMode('menu');}});
    $('#name-error').textContent=$('#allocations-error').textContent='';$('#character-name').setAttribute('aria-invalid','false');
    creator.reset();appearance=creator.selection.appearance;$('#preview-zoom').value=1;allocations=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));$('#character-name').value='';$('#creator-error').textContent='';
    previewYaw=previewTarget=0;for(const b of $('#preview-angles').children){b.classList.toggle('active',b.dataset.yaw==='0');b.setAttribute('aria-pressed',String(b.dataset.yaw==='0'));}
    view.setAppearance(appearance);selectCreatorSection('appearance');creator.selection.frame('body');updateStats();setMode('creator');$('#character-name').focus();
  });
  $('#continue-game').addEventListener('click',()=>{if(playing){view.setAppearance(profile.appearance);setMode('game');}else if(profile)enterApartment(profile);});
  $('#cancel-creator').addEventListener('click',()=>creatorSession?.cancel());
  $('#next-step').addEventListener('click',()=>selectCreatorSection(creator.selection.section==='appearance'?'clothing':'stats'));
  for(const section of ['appearance','clothing','stats'])$('#'+section+'-tab').addEventListener('click',()=>selectCreatorSection(section));
  $('#creator-form').addEventListener('submit',e=>{
    e.preventDefault();const result=creatorSession?.submit({name:$('#character-name').value,allocations,appearance});if(!result)return;
    $('#name-error').textContent=result.errors?.name??'';$('#allocations-error').textContent=result.errors?.allocations??'';
    $('#character-name').setAttribute('aria-invalid',String(Boolean(result.errors?.name)));
    if(result.errors?.name)$('#character-name').focus();else if(result.errors?.allocations)selectCreatorSection('stats');
    if(result.ok&&!result.saved){message='Персонаж создан, но браузер не разрешил сохранение.';messageUntil=performance.now()+8000;}
  });
  for(const b of $('#preview-angles').children)b.addEventListener('click',()=>{previewTarget=Number(b.dataset.yaw);for(const other of $('#preview-angles').children){other.classList.toggle('active',other===b);other.setAttribute('aria-pressed',String(other===b));}});
  $('#preview-body').addEventListener('click',()=>{creator.selection.frame('body');$('#preview-zoom').value=1;});
  $('#preview-zoom').addEventListener('input',e=>creator.selection.setZoom(Number(e.target.value)));
  const previewStage=$('#preview-stage');let previewDrag=null;
  previewStage.addEventListener('pointerdown',e=>{if(e.button!==0)return;previewDrag={id:e.pointerId,x:e.clientX};previewStage.setPointerCapture(e.pointerId);});
  previewStage.addEventListener('pointermove',e=>{if(previewDrag?.id!==e.pointerId)return;previewTarget+=(e.clientX-previewDrag.x)*.014;previewYaw=previewTarget;previewDrag.x=e.clientX;for(const b of $('#preview-angles').children){b.classList.remove('active');b.setAttribute('aria-pressed','false');}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])previewStage.addEventListener(event,()=>previewDrag=null);
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
  function act(id){resumeAnimation();if(id==='entry'){if(!motion.busy)setMode('door');return;}const result=startHomeAction(motion,homeTime,id);if(result.allowed)cue('footstep');else if(result.reason){message=result.reason;messageUntil=performance.now()+5000;}}
  $('#door-peek').addEventListener('click',()=>{setMode('game');act('peephole');});
  $('#door-exit').addEventListener('click',()=>{setMode('game');resumeAnimation();motion.interact('entry');});
  $('#door-cancel').addEventListener('click',()=>setMode('game'));
  function stopPeeking(){setMode('game');if(motion.actionId==='peephole'&&motion.phase==='perform')motion.leaveAction();}
  $('#peek-close').addEventListener('click',stopPeeking);
  for(const [id,label] of Object.entries({dining:'Обеденный стол',computer:'Компьютер',bed:'Кровать',sink:'Посуда',stove:'Плита',fridge:'Холодильник',passage:'Другая комната',entry:'Входная дверь','light-living':'Выключатель в комнате','light-kitchen':'Выключатель на кухне'})){
    if(!config.actions[id])continue;
    const b=document.createElement('button');b.textContent=label;b.dataset.action=id;b.addEventListener('click',()=>act(id));
    if(config.actions[id]?.lightRoom)b.setAttribute('aria-label',label);
    $('#actions').append(b);
  }
  canvas.addEventListener('pointerdown',e=>{if(!lookInput.canPick(e)||cameraFade||mode!=='game')return;const hit=view.pick(e);resumeAnimation();if(hit.id)act(hit.id);else if(hit.hero)motion.faceCamera();else if(Number.isFinite(hit.x)){motion.move(hit.x);cue('footstep');}});
  canvas.addEventListener('pointermove',e=>{if(mode!=='game'){canvas.style.cursor='default';return;}const delta=lookInput.move(e);if(delta){view.modes.look(...delta);canvas.style.cursor='grabbing';$('#hover-label').textContent='';return;}const hit=view.pick(e);canvas.style.cursor=hit.id||hit.hero?'pointer':'crosshair';
    const action=config.actions[hit.id];$('#hover-label').textContent=action?.lightRoom?(homeTime.lights[action.lightRoom]?'Выключить':'Включить')+' свет '+(action.lightRoom==='living'?'в комнате':'на кухне'):action?.label??(hit.hero?'Повернуться к камере':'');});
  canvas.addEventListener('pointerleave',()=>$('#hover-label').textContent='');
  $('#rig-toggle').addEventListener('click',()=>{$('#inspector').hidden=!$('#inspector').hidden;$('#rig-toggle').setAttribute('aria-expanded',String(!$('#inspector').hidden));});
  $('#show-bones').addEventListener('change',e=>skeleton=e.target.checked);$('#hold').addEventListener('change',e=>hold=e.target.checked);
  $('#pause').addEventListener('click',()=>{paused=!paused;$('#pause').textContent=paused?'Продолжить':'Пауза';});
  $('#step').addEventListener('click',()=>{paused=true;$('#pause').textContent='Продолжить';update(1/30,performance.now(),true);});$('#face').addEventListener('click',()=>motion.faceCamera());
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(mode==='peephole')stopPeeking();else if(mode==='door')setMode('game');else if(mode==='pc')virtualPc.closeWindow();else if(mode==='game')setMode('menu');});
  function update(dt,now,step=false){
    cameraLabel();
    if(cameraFade){view.render(motion,0,{paused:true});return;}
    view.setRoomLights(homeTime.lights);
    if(mode==='creator'){
      const delta=Math.atan2(Math.sin(previewTarget-previewYaw),Math.cos(previewTarget-previewYaw));previewYaw+=delta*(1-Math.exp(-dt*9));
      $('#preview-zoom').value=creator.selection.zoom;
      view.renderPreview(dt,previewYaw,$('#preview-stage').getBoundingClientRect(),creator.selection.zone,creator.selection.zoom);return;
    }
    if(mode==='peephole'){view.renderPeephole($('#peek-stage').getBoundingClientRect());return;}
    if(mode==='menu'||mode==='destinations'||mode==='door'){view.setTime(homeTime.minutes,lightPreview==='game'?homeTime.minutes:Number(lightPreview));view.render(motion,0,{paused:true});return;}
    let events=[];
    if(!paused||step){
      if(mode==='pc'){
        const frame=advanceComputerHomeFrame(motion,homeTime,pcState,dt,true);pcState=frame.pcState;virtualPc.syncState(pcState);events=frame.events;
      }else{
        events=advanceHomeFrame(motion,homeTime,dt,hold).events;
        pcState=advanceVirtualPc(pcState,homeTime).state;virtualPc.syncState(pcState);
      }
    }
    for(const event of events){
      view.modes.onMotionEvent(event);cameraLabel();
      if(sounds[event.id]&&(event.type==='swap'||(event.type==='started'&&!config.actions[event.id].fade)))cue(sounds[event.id]);
      if(event.type==='interacted'){
        const room=config.actions[event.id].lightRoom;
        message=`Свет ${room==='living'?'в комнате':'на кухне'} ${homeTime.lights[room]?'включён':'выключен'}.`;messageUntil=now+4000;saveHomeTime(storage,homeTime);
      }
      if(event.type==='completed'){message=completed[event.id]??message;messageUntil=now+4000;saveHomeTime(storage,homeTime);}
      if(event.type==='started'&&event.id==='bed')saveHomeTime(storage,homeTime);
      if(event.type==='started'&&event.id==='computer')openComputer();
      if(event.type==='started'&&event.id==='peephole'){setMode('peephole');view.renderPeephole($('#peek-stage').getBoundingClientRect());return;}
      if(event.type==='exited'){saveHomeTime(storage,homeTime);setMode('destinations');}
    }
    if(motion.clip==='walk'&&motion.walkDistance-lastStep>config.stride/2){cue('footstep');lastStep=motion.walkDistance;}
    const door=motion.doorOpen>.3;if(door&&!lastDoor)cue('door');lastDoor=door;
    view.setRoomLights(homeTime.lights);view.setTime(homeTime.minutes,lightPreview==='game'?homeTime.minutes:Number(lightPreview));
    view.render(motion,paused&&!step?0:dt,{skeleton,paused:paused&&!step});$('#fade').style.opacity=motion.fade;
    $('#home-time').textContent=`День ${homeTime.day} · ${homeTime.label} · ${homeTime.period} · Дом`;
    if(now-lastTimeSave>(homeTime.isSleeping?500:15000)){saveHomeTime(storage,homeTime);saveVirtualPcState(storage,pcState);lastTimeSave=now;}
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
