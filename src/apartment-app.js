import {ApartmentMotion} from './apartment-v3-motion.js?rev=39';
import {ApartmentTime,loadHomeTime,saveHomeTime as saveHomeTimeRaw} from './apartment-v3-time.js?rev=39';
import {districts,getDistrictLocations} from './calikfornia.js?rev=39';
import {advanceComputerHomeFrame,advanceHomeFrame,prepareApartmentConfig,startHomeAction} from './apartment-v3-runtime.js?rev=39';
import {playSoundCue} from './sound-cues.js?rev=39';
import {CameraPointer,cameraAllowsFirstPerson} from './apartment-v3-camera.js?rev=39';
import {DEFAULT_APPEARANCE,loadProfile,saveProfile} from './avatar-v3-profile.js?rev=39';
import {mountCreator,decorateCreatorButton} from './apartment-v3-creator.js?rev=39';
import {createNewGameSession} from './apartment-v3-new-game.js?rev=39';
import {advanceVirtualPcDurably,gameMinuteStamp,createSubmissionTransferClock} from './virtual-pc-runtime.js?rev=39';
import {createVirtualPcState,loadVirtualPcState,saveStudioProject,saveVirtualPcState,setPcPower} from './virtual-pc-state.js?rev=39';
import {mountVirtualPc} from './virtual-pc-ui.js?rev=39';
import {PcLifecycle,pcNeedsSceneFrame,moveInRoom,beginPcCutscene,preparePcWorkPose} from './virtual-pc-lifecycle.js?rev=39';
import {PcSounds} from './virtual-pc-sounds.js?rev=39';
import {playIndoorFootstep} from './indoor-footsteps.js?rev=39';
import {createFootstepCadence} from './footstep-cadence.js?rev=39';
import {restoreMusicNeeds,workBlockReason,effectiveBeatSkill} from './beat-production.js?rev=39';
import {advanceInstallation} from './pc-software.js?rev=39';
import {createBeatWorkPanel} from './beat-work-view.js?rev=39';
import {normalizeGenreProgression,genreById,genreCap} from './genre-progression.js?rev=39';
import {createBeatWorkAudio} from './beat-work-audio.js?rev=39';
import {createLyricWorkAudio} from './lyric-work-audio.js?rev=39';
import {creativeWorkDescriptor,advanceCreativeWork} from './home-creative-work.js?rev=39';
import {workCameraFrame} from './work-camera.js?rev=39';
import {pauseCreativeChain,creativeChainProgress} from './creative-workflow.js?rev=39';
import {pauseStudy} from './rap-analysis.js?rev=39';
import {effectiveVocalSkill} from './vocal-production.js?rev=39';
import {effectiveWritingSkill} from './lyric-production.js?rev=39';
import {consumeFood} from './home-food.js?rev=39';
import {createCharacterSpeech,workNeedSpeech} from './character-speech.js?rev=39';
import {mountHomeNeedsView,mountCharacterSpeech} from './home-needs-view.js?rev=39';
import {migrateNoviceSave} from './home-profile-migration.js?rev=39';
import {mountHomeWardrobeView} from './home-wardrobe-view.js?rev=39';
import {mountPhoneHud} from './phone-hud.js?rev=39';
import {nextSafeResultReaction,completeResultReaction} from './social-result-reaction.js?rev=39';
import {captureDesktopReturn} from './desktop-return-state.js?rev=39';
import {createPlayerPortraitController,portraitKey} from './social-portraits.js?rev=39';

const $=s=>document.querySelector(s),canvas=$('#apartment'),status=$('#activity'),loading=$('#loading');
let audio=null,paused=false,skeleton=false,hold=false,stepVariation=0;
const cue=id=>{try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume().catch(()=>{});if(id==='footstep')playIndoorFootstep(audio,stepVariation++);else playSoundCue(id,audio);}catch{/* Sound is optional. */}};
try{
  const {createApartmentScene}=await import('./apartment-v3-scene.js?rev=39');
  const response=await fetch('./assets/apartment/v3/scene.json',{cache:'no-cache'});if(!response.ok)throw Error('Scene manifest '+response.status);
  const config=prepareApartmentConfig(await response.json()),view=await createApartmentScene(canvas,config);
  const footsteps=createFootstepCadence(config.stride);
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
  const migration=migrateNoviceSave(storage);let migrationReady=migration.ok;
  function saveHomeTime(_storage,clock){return migrationReady&&saveHomeTimeRaw(storage,clock);}
  const saved=loadProfile(storage);let profile=saved.profile;
  let homeTime=loadHomeTime(storage)??new ApartmentTime(),lastTimeSave=0,lastInstallationSave=0,lightPreview='game';
  const pcRoot=$('#virtual-pc'),savedPc=loadVirtualPcState(storage);let pcState=savedPc.state;
  let pcStorageWarning=migration.ok?(savedPc.ok?'':'Сохранение виртуального ПК недоступно.'):migration.error;
  let virtualPc,workReward=0,workFinished=false,lastWorkJob=null,lastWorkBeat=null,lastWorkCamera=null,resultEpisode=null,failedReactionId=null;
  const submissionTransferClock=createSubmissionTransferClock();
  function advanceOutgoingTransfer(activeSeconds=0,forcePhase=null){
    const phase=forcePhase??[mode,pcLifecycle.snapshot.phase,pcState.power,paused,document.hidden].join(':');
    const transfer=submissionTransferClock.tick(pcState,{activeSeconds,powered:pcState.power==='on',paused:paused||document.hidden||!['game','pc'].includes(mode),phase},next=>persistPc(next,{atomic:true}));
    if(transfer.changed){pcState=transfer.state;virtualPc.syncState(pcState);}
  }
  const fridgeRoot=document.createElement('section'),speechRoot=document.createElement('div');document.body.append(fridgeRoot,speechRoot);canvas.tabIndex=0;
  const speech=createCharacterSpeech({beep:()=>{if(audio?.state==='running'&&!document.hidden)playSoundCue('speech',audio);}}),speechView=mountCharacterSpeech(speechRoot);
  const fridgeView=mountHomeNeedsView(fridgeRoot,{
    returnFocus:canvas,onClose:()=>{if(motion.actionId==='fridge'&&motion.phase==='perform')motion.leaveAction();last=performance.now();},
    onConsume:id=>{const result=consumeFood(pcState,id);if(result.ok){persistPc(result.state);virtualPc.syncState(pcState);}fridgeView.update(pcState,pcStorageWarning);},
  });
  const wardrobeRoot=document.createElement('section');document.body.append(wardrobeRoot);
  const wardrobeView=mountHomeWardrobeView(wardrobeRoot,{
    returnFocus:canvas,onPreview:look=>view.setAppearance(look),
    onApply:next=>{if(!migrationReady)return {ok:false,error:migration.error||'Автосохранение отключено до восстановления.'};const saved=saveProfile(storage,next);if(saved.ok){profile=saved.profile;void requestPlayerPortrait();}return saved;},
    onClose:()=>{if(motion.actionId==='wardrobe'&&motion.phase==='perform')motion.leaveAction();last=performance.now();},
  });
  const homeModalOpen=()=>fridgeView.isOpen||wardrobeView.isOpen;
  function persistPc(next,{atomic=false}={}){
    const previous=pcState;
    pcState=createVirtualPcState(next);
    const saved=migrationReady&&saveVirtualPcState(storage,pcState);
    if(atomic&&!saved)pcState=previous;
    pcStorageWarning=saved?'':migrationReady?'Сохранение виртуального ПК недоступно.':migration.error||'Автосохранение отключено до восстановления.';
    virtualPc?.setPersistenceWarning(pcStorageWarning);
    if(fridgeView.isOpen)fridgeView.update(pcState,pcStorageWarning);
    return saved;
  }
  const pcSounds=new PcSounds();let pcPrepareError=false;
  fetch('./assets/audio/pc/manifest.json?rev=21').then(r=>r.ok?r.json():{}).then(clips=>{pcSounds.clips=clips;}).catch(()=>{});
  function returnFromComputer(){
    pcRoot.hidden=true;
    if(pcState.power==='off')virtualPc.completeShutdown();
    if(motion.actionId==='computer'&&motion.phase==='perform')motion.leaveAction();
    setMode('game');resumeAnimation();
  }
  const pcLifecycle=new PcLifecycle({view,getState:()=>pcState,setPower:power=>persistPc(setPcPower(pcState,power)),sounds:pcSounds,onRoom:returnFromComputer,onError:()=>{pcPrepareError=true;message='Не удалось подготовить экран. Попробуйте сесть за ПК ещё раз.';messageUntil=performance.now()+6000;}});
  virtualPc=mountVirtualPc(pcRoot,{
    onPersist:(next,options)=>persistPc(next,options),
    onLeave:()=>pcLifecycle.leave(),
    onShutdown:()=>pcLifecycle.shutdown(),
    onAppSound:cue=>pcSounds.play(cue),
    onWork:()=>{if(!preparePcWorkPose(motion))return false;const started=pcLifecycle.work();if(started){if(pcState.writing.job)void lyricWorkAudio.unlock();workReward=0;workFinished=false;lastWorkJob=null;lastWorkBeat=null;lastWorkCamera=null;resumeAnimation();saveHomeTime(storage,homeTime);persistPc(pcState);}return started;},
    onSaveProject:(state,project)=>saveStudioProject(state,project),
    onResultViewed:()=>{failedReactionId=null;},
  });
  virtualPc.setPersistenceWarning(pcStorageWarning);
  const portraitController=createPlayerPortraitController({getState:()=>pcState,getAppearance:()=>profile?.appearance,render:look=>view.capturePlayerPortrait(look),save:next=>{const saved=persistPc(next,{atomic:true});if(saved)virtualPc.syncState(pcState);return saved;}});
  const requestPlayerPortrait=()=>portraitController.request();
  const portraitMetadata=()=>({portraitKey:profile?portraitKey(profile.appearance):null,requestPlayerPortrait});
  const phoneRoot=document.createElement('aside');phoneRoot.hidden=true;document.body.append(phoneRoot);
  const phoneView=mountPhoneHud(phoneRoot,{
    getState:()=>pcState.phone,
    onChange:phone=>{const saved=persistPc({...pcState,phone},{atomic:true});if(saved)virtualPc.syncState(pcState);return saved;},
    playVibration:()=>{if(audio?.state==='running'&&!document.hidden)playSoundCue('phone-vibrate',audio);},
  });
  const workAudio=createBeatWorkAudio(virtualPc.audioSession.forOwner('creative-work'));
  const lyricWorkAudio=createLyricWorkAudio();
  const syncWorkAudio=(hidden=document.hidden)=>{
    const {writing,project,job}=creativeWorkDescriptor(pcState,profile?.skills),phase=pcLifecycle.snapshot.phase;
    const beatSound=workAudio.sync({phase:writing?'idle':phase,hidden,beat:writing?null:project,job:writing?null:job});
    const textSound=lyricWorkAudio.sync({phase:writing?phase:'idle',hidden,job:writing?job:null});return writing?textSound:beatSound;
  };
  const workPanel=createBeatWorkPanel(document,{
    onCancel:()=>{if(pcLifecycle.finishWork({blocked:true})){pcState=pauseStudy(pauseCreativeChain(pcState));virtualPc.syncState(pcState);syncWorkAudio();saveHomeTime(storage,homeTime);persistPc(pcState);}},
    onEnableAudio:()=>pcState.writing.job?lyricWorkAudio.enableAudio():workAudio.enableAudio(),
  });
  const workHud=workPanel.element;workHud.hidden=true;document.body.append(workHud);let lastWorkSave=0;
  function openComputer(){
    virtualPc.showDesktop(pcState);virtualPc.presentTransition(pcLifecycle.snapshot);
    setMode('pc');pcRoot.hidden=false;
    virtualPc.syncHost({playerName:profile?.name??'Игрок',clockLabel:homeTime.label,gameDay:homeTime.day,gameMinutes:gameMinuteStamp(homeTime),skills:profile?.skills,...portraitMetadata()});
    void pcLifecycle.seated();
  }
  pcRoot.addEventListener('click',event=>{const target=event.target.closest?.('button,[role="menuitem"]');if(target&&!target.disabled&&target.getAttribute('aria-disabled')!=='true'&&!pcLifecycle.snapshot.locked)void pcSounds.play('click');});
  if(profile)view.setAppearance(profile.appearance);
  let appearance={...DEFAULT_APPEARANCE};
  const names={wardrobe:'Выбирает одежду',dining:'Ест за столом',computer:'За компьютером',bed:'Сон',sink:'Моет посуду',stove:'Готовит еду',fridge:'Берёт еду',entry:'Открывает дверь','light-living':'Нажимает выключатель в комнате','light-kitchen':'Нажимает выключатель на кухне'};
  const sounds={dining:'dishes',computer:'chair-scrape',bed:'sleep',sink:'dishes',stove:'cook',fridge:'fridge',entry:'door'};
  const completed={dining:'Поел.',computer:'Работа за компьютером закончена.',bed:'Отдохнул. Можно идти дальше.',sink:'Посуда вымыта.',stove:'Еда приготовлена.',fridge:'Взял еду из холодильника.'};
  let message='',messageUntil=0,last=performance.now(),lastDoor=false,frameRate=60;
  function setMode(next){
    lookInput.stop();
    if(next!=='game'){fridgeView.close();wardrobeView.close();}
    mode=next;document.body.dataset.mode=next;
    phoneRoot.hidden=!playing||!['game','pc'].includes(next);phoneView.update();
    $('#main-menu').hidden=next!=='menu';$('#creator').hidden=next!=='creator';
    $('#destinations').hidden=next!=='destinations';
    $('#door-choice').hidden=next!=='door';$('#peephole').hidden=next!=='peephole';
    pcRoot.hidden=next!=='pc';
    $('#game-header').hidden=next!=='game';$('#controls').hidden=next!=='game';
    $('#inspector').hidden=true;$('#rig-toggle').setAttribute('aria-expanded','false');$('#hover-label').textContent='';
    $('#fade').style.opacity=next==='destinations'?1:0;$('#continue-game').hidden=!profile&&!playing;
    $('#save-note').textContent=!migrationReady?pcStorageWarning:playing?'Текущая игра на паузе.':profile?`Сохранён персонаж: ${profile.name}`:saved.ok?'Внешность и навыки сохраняются на этом устройстве.':'Сохранение недоступно. Можно играть без него.';
    if(next!=='creator'&&next!=='peephole'){view.setRoomLights(homeTime.lights);view.render(motion,0,{paused:true,instant:true});}
    last=performance.now();
  }
  function resumeAnimation(){paused=false;$('#pause').textContent='Пауза';}
  function enterApartment(nextProfile){
    pcLifecycle.reset();
    speech.clear();
    view.modes.reset();cameraLabel();
    profile=nextProfile;motion=new ApartmentMotion(config);if(homeTime.initialRest||homeTime.isSleeping){motion.startSleeping();view.modes.onMotionEvent({id:'bed',type:'started'});}view.setAppearance(profile.appearance);
    playing=true;footsteps.reset();lastDoor=false;hold=false;skeleton=false;$('#hold').checked=false;$('#show-bones').checked=false;
    $('#player-name').textContent=profile.name;resumeAnimation();setMode('game');cue('sleep');
    void requestPlayerPortrait();
  }
  function selectCreatorSection(section){
    creator.selectSection(section);const clothing=section==='clothing';
    $('#next-step').hidden=clothing;$('#start-game').hidden=!clothing;
    for(const name of ['appearance','clothing'])$('#'+name+'-tab').setAttribute('aria-pressed',String(name===section));
    $('#creator-footer-note').textContent=clothing?'Ткань, силуэт, цвет. Всё выбранное станет твоим.':'Лицо, волосы и характер. Все навыки начнут с 10.';
  }
  function updateStats(){
    $('#start-game').disabled=!$('#character-name').value.trim();
  }
  const creator=mountCreator($('#appearance-fields'),next=>{appearance=next;view.setAppearance(appearance);},{categoryRoot:$('#creator-categories')});
  let creatorSession=null;
  for(const [id,icon] of [['appearance-tab','face'],['clothing-tab','top'],['preview-body','rotate'],['cancel-creator','back'],['start-game','confirm']])decorateCreatorButton($('#'+id),icon);
  $('#character-name').addEventListener('input',updateStats);
  $('#new-game').addEventListener('click',()=>{
    creatorSession=createNewGameSession(profile,storage,{enter(next,home){
      homeTime=home.homeTime;pcState=home.pcState;migrationReady=home.migrationReady;virtualPc.reset(pcState);
      pcStorageWarning=home.pcSaved?'':'Сохранение виртуального ПК недоступно.';
      virtualPc.setPersistenceWarning(pcStorageWarning);enterApartment(next);
      if(!home.homeSaved||!home.pcSaved){message='Новая игра начата, но браузер не подтвердил сохранение.';messageUntil=performance.now()+8000;}
    },restore(look){view.setAppearance(look);setMode('menu');}});
    $('#name-error').textContent='';$('#character-name').setAttribute('aria-invalid','false');
    creator.reset();appearance=creator.selection.appearance;$('#preview-zoom').value=1;$('#character-name').value='';$('#creator-error').textContent='';
    previewYaw=previewTarget=0;for(const b of $('#preview-angles').children){b.classList.toggle('active',b.dataset.yaw==='0');b.setAttribute('aria-pressed',String(b.dataset.yaw==='0'));}
    view.setAppearance(appearance);selectCreatorSection('appearance');creator.selection.frame('body');updateStats();setMode('creator');$('#character-name').focus();
  });
  $('#continue-game').addEventListener('click',()=>{if(playing){view.setAppearance(profile.appearance);setMode('game');}else if(profile)enterApartment(profile);});
  $('#cancel-creator').addEventListener('click',()=>creatorSession?.cancel());
  $('#next-step').addEventListener('click',()=>selectCreatorSection('clothing'));
  for(const section of ['appearance','clothing'])$('#'+section+'-tab').addEventListener('click',()=>selectCreatorSection(section));
  $('#creator-form').addEventListener('submit',e=>{
    e.preventDefault();const result=creatorSession?.submit({name:$('#character-name').value,appearance});if(!result)return;
    $('#name-error').textContent=result.errors?.name??'';
    $('#character-name').setAttribute('aria-invalid',String(Boolean(result.errors?.name)));
    if(result.errors?.name)$('#character-name').focus();
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
  function act(id){if(homeModalOpen()||pcLifecycle.pending||pcLifecycle.snapshot.phase!=='room')return;resumeAnimation();if(id==='computer'&&workBlockReason(pcState)){message=workBlockReason(pcState);messageUntil=performance.now()+6000;speech.say(workNeedSpeech(pcState));return;}if(id==='entry'){if(!motion.busy)setMode('door');return;}const result=id==='computer'?{allowed:beginPcCutscene(motion)}:startHomeAction(motion,homeTime,id);if(result.allowed){if(id==='computer'){pcPrepareError=false;virtualPc.prepareAudio();pcSounds.unlock().catch(()=>{});pcLifecycle.prepare();}}else if(result.reason){message=result.reason;messageUntil=performance.now()+5000;}}
  $('#door-peek').addEventListener('click',()=>{setMode('game');act('peephole');});
  $('#door-exit').addEventListener('click',()=>{setMode('game');resumeAnimation();motion.interact('entry');});
  $('#door-cancel').addEventListener('click',()=>setMode('game'));
  function stopPeeking(){setMode('game');if(motion.actionId==='peephole'&&motion.phase==='perform')motion.leaveAction();}
  $('#peek-close').addEventListener('click',stopPeeking);
  for(const [id,label] of Object.entries({dining:'Обеденный стол',computer:'Компьютер',wardrobe:'Шкаф',bed:'Кровать',sink:'Посуда',stove:'Плита',fridge:'Холодильник',passage:'Другая комната',entry:'Входная дверь','light-living':'Выключатель в комнате','light-kitchen':'Выключатель на кухне'})){
    if(!config.actions[id])continue;
    const b=document.createElement('button');b.textContent=label;b.dataset.action=id;b.addEventListener('click',()=>act(id));
    if(config.actions[id]?.lightRoom)b.setAttribute('aria-label',label);
    $('#actions').append(b);
  }
  canvas.addEventListener('pointerdown',e=>{if(homeModalOpen()||!lookInput.canPick(e)||cameraFade||mode!=='game')return;const hit=view.pick(e);resumeAnimation();if(hit.id)act(hit.id);else if(hit.hero)motion.faceCamera();else if(Number.isFinite(hit.x))moveInRoom(motion,pcLifecycle,hit.x);});
  canvas.addEventListener('pointermove',e=>{if(mode!=='game'){canvas.style.cursor='default';return;}const delta=lookInput.move(e);if(delta){view.modes.look(...delta);canvas.style.cursor='grabbing';$('#hover-label').textContent='';return;}const hit=view.pick(e);canvas.style.cursor=hit.id||hit.hero?'pointer':'crosshair';
    const action=config.actions[hit.id];$('#hover-label').textContent=action?.lightRoom?(homeTime.lights[action.lightRoom]?'Выключить':'Включить')+' свет '+(action.lightRoom==='living'?'в комнате':'на кухне'):action?.label??(hit.hero?'Повернуться к камере':'');});
  canvas.addEventListener('pointerleave',()=>$('#hover-label').textContent='');
  $('#rig-toggle').addEventListener('click',()=>{$('#inspector').hidden=!$('#inspector').hidden;$('#rig-toggle').setAttribute('aria-expanded',String(!$('#inspector').hidden));});
  $('#show-bones').addEventListener('change',e=>skeleton=e.target.checked);$('#hold').addEventListener('change',e=>hold=e.target.checked);
  $('#pause').addEventListener('click',()=>{paused=!paused;$('#pause').textContent=paused?'Продолжить':'Пауза';});
  $('#step').addEventListener('click',()=>{paused=true;$('#pause').textContent='Продолжить';update(1/30,performance.now(),true);});$('#face').addEventListener('click',()=>motion.faceCamera());
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.key!=='Escape')return;if(mode==='peephole')stopPeeking();else if(mode==='door')setMode('game');else if(mode==='pc')virtualPc.closeWindow();else if(mode==='game')setMode('menu');});
  function update(dt,now,step=false){
    advanceOutgoingTransfer(dt);
    virtualPc.tickOutgoingMessage(0,{paused:paused||document.hidden||mode!=='pc'});
    if(mode!=='game'||cameraFade||document.hidden||(paused&&!step)||homeModalOpen())footsteps.reset();
    if(mode!=='game'||cameraFade||document.hidden){speech.tick(0,{present:false});speechView.update(speech.snapshot);}
    cameraLabel();
    view.setComputerPresentation(pcLifecycle.snapshot,pcState,profile?.name??'Игрок');
    // Installation belongs to the powered PC, including while room dialogs are open.
    if(['game','pc'].includes(mode)&&(!paused||step)&&!document.hidden&&pcState.power==='on'&&pcState.software.installer?.step==='install'){
      const installation=advanceInstallation(pcState,dt);pcState=installation.state;virtualPc.syncState(pcState);
      if(installation.completed||!installation.ok||now-lastInstallationSave>=1000){persistPc(pcState);lastInstallationSave=now;}
    }
    if(cameraFade){view.render(motion,0,{paused:true});return;}
    view.setRoomLights(homeTime.lights);
    if(mode==='creator'){
      const delta=Math.atan2(Math.sin(previewTarget-previewYaw),Math.cos(previewTarget-previewYaw));previewYaw+=delta*(1-Math.exp(-dt*9));
      $('#preview-zoom').value=creator.selection.zoom;
      view.renderPreview(dt,previewYaw,$('#preview-stage').getBoundingClientRect(),creator.selection.zone,creator.selection.zoom);return;
    }
    if(wardrobeView.isOpen){view.renderPreview(dt,wardrobeView.yaw,wardrobeView.previewRect,'body',1);return;}
    if(mode==='peephole'){view.renderPeephole($('#peek-stage').getBoundingClientRect());return;}
    if(mode==='menu'||mode==='destinations'||mode==='door'){view.setTime(homeTime.minutes,lightPreview==='game'?homeTime.minutes:Number(lightPreview));view.render(motion,0,{paused:true});return;}
    let events=[];
    if(mode==='pc'&&!paused&&!document.hidden&&!resultEpisode){
      const pending=nextSafeResultReaction(pcState,{atDesktop:true,creativeJob:creativeWorkDescriptor(pcState,profile?.skills).job,transitionPhase:pcLifecycle.snapshot.phase,modalOpen:Boolean(virtualPc.confirmClose||virtualPc.shutdownModal||virtualPc.submissionModal||virtualPc.uninstallModal)});
      if(pending&&pending.id!==failedReactionId&&pcLifecycle.react()){
        resultEpisode={reaction:pending,ui:captureDesktopReturn(pcRoot),speaking:false,elapsed:0,returning:false};
        virtualPc.audioSession.stopAll();resumeAnimation();
      }
    }
    syncWorkAudio();
    if((!paused||step)&&!document.hidden&&!homeModalOpen()){
      if(mode==='pc'&&pcLifecycle.snapshot.phase.startsWith('reaction')){
        // A reaction spends presentation time only: no clock, work progress, needs or XP.
      }else if(mode==='pc'&&pcLifecycle.snapshot.phase.startsWith('work')){
        const creative=creativeWorkDescriptor(pcState,profile?.skills);
        if(pcLifecycle.snapshot.phase==='working'&&creative.job){
          lastWorkJob={...creative.job};lastWorkBeat=creative.project;
          const r=advanceCreativeWork(pcState,dt,homeTime,profile?.skills);pcState=r.state;homeTime.advanceMinutes(r.minutes);pcState=advanceVirtualPcDurably(pcState,homeTime,next=>persistPc(next,{atomic:true}),{heroSkills:profile?.skills}).state;virtualPc.syncState(pcState);
          if(creative.chainProgress)workReward+=r.practiceGained??0;
          if(r.finished){if(!creative.chainProgress)workReward=r.practiceGained;workFinished=true;lastWorkJob.elapsed=lastWorkJob.total;}
          if(r.finished||r.blocked){pcLifecycle.finishWork({blocked:r.blocked});syncWorkAudio();if(r.blocked){message=r.reason||workBlockReason(pcState);messageUntil=now+10000;speech.say(workNeedSpeech(pcState),{afterRoom:true});}}
          if(r.finished||r.blocked||now-lastWorkSave>1000){saveHomeTime(storage,homeTime);persistPc(pcState);lastWorkSave=now;}
        }
      }else if(mode==='pc'){
        const frame=advanceComputerHomeFrame(motion,homeTime,pcState,dt,true,next=>persistPc(next,{atomic:true}),{heroSkills:profile?.skills});pcState=frame.pcState;virtualPc.syncState(pcState);events=frame.events;
      }else{
        const before=homeTime.day*1440+homeTime.minutes,wasSleeping=motion.sleeping;
        events=advanceHomeFrame(motion,homeTime,dt,hold).events;
        if(wasSleeping)pcState=restoreMusicNeeds(pcState,'sleep',homeTime.day*1440+homeTime.minutes-before);
        if(events.some(e=>e.type==='completed'&&e.id==='dining'))pcState=restoreMusicNeeds(pcState,'meal');
        pcState=advanceVirtualPcDurably(pcState,homeTime,next=>persistPc(next,{atomic:true}),{heroSkills:profile?.skills}).state;virtualPc.syncState(pcState);
      }
    }
    for(const event of events){
      view.modes.onMotionEvent(event);cameraLabel();
      if(sounds[event.id]&&(event.type==='swap'||(event.type==='started'&&!config.actions[event.id].fade)))cue(sounds[event.id]);
      if(event.type==='interacted'){
        const room=config.actions[event.id].lightRoom;
        message=`Свет ${room==='living'?'в комнате':'на кухне'} ${homeTime.lights[room]?'включён':'выключен'}.`;messageUntil=now+4000;saveHomeTime(storage,homeTime);
      }
      if(event.type==='completed'){if(!(event.id==='computer'&&pcPrepareError)){message=completed[event.id]??message;messageUntil=now+4000;}saveHomeTime(storage,homeTime);}
      if(event.type==='started'&&event.id==='bed')saveHomeTime(storage,homeTime);
      if(event.type==='started'&&event.id==='fridge')fridgeView.open(pcState,pcStorageWarning);
      if(event.type==='started'&&event.id==='wardrobe')wardrobeView.open(profile,migrationReady?'':pcStorageWarning);
      if(event.type==='started'&&event.id==='computer')openComputer();
      if(event.type==='started'&&event.id==='peephole'){setMode('peephole');view.renderPeephole($('#peek-stage').getBoundingClientRect());return;}
      if(event.type==='exited'){saveHomeTime(storage,homeTime);setMode('destinations');}
    }
    pcLifecycle.tick(dt,{paused:paused&&!step,hidden:document.hidden});pcLifecycle.restore(motion.phase);
    if(resultEpisode&&pcLifecycle.snapshot.phase==='reaction-speaking'&&!document.hidden&&!paused){
      if(!resultEpisode.speaking){speech.say(resultEpisode.reaction.speech);resultEpisode.speaking=true;}
      resultEpisode.elapsed+=dt;
      if(resultEpisode.elapsed>=5.2){pcLifecycle.finishReaction();resultEpisode.returning=true;}
    }
    $('#camera-fade').style.opacity=pcLifecycle.snapshot.blackout??0;
    const workSound=syncWorkAudio(),workPhase=pcLifecycle.snapshot.phase;
    workHud.hidden=workPhase!=='working'&&!(workFinished&&['work-cover','work-in'].includes(workPhase));
    if(!workHud.hidden){
      const creative=creativeWorkDescriptor(pcState,profile?.skills),beat=lastWorkBeat??creative.project;
      const shownJob=creative.job??lastWorkJob;
      const genres=normalizeGenreProgression(pcState.music.genres),genreId=shownJob?.genreProfile?.id??beat?.genreProfile?.id??'experimental';
      const chainProgress=pcState.creativeWork?.items.some(i=>i.projectId===beat?.id)&&!shownJob?.output&&!['diss','story','chorus','adapt'].includes(shownJob?.kind)?creativeChainProgress(pcState,beat?.id):null;
      workPanel.update({beat,job:shownJob,chainProgress,needs:pcState.music.needs,skill:shownJob?.output?.draft?effectiveVocalSkill(pcState,profile?.skills,shownJob.kind):beat?.kind==='lyrics'?effectiveWritingSkill(pcState,profile?.skills):effectiveBeatSkill(pcState,profile?.skills),genreProgress:{name:genreById(genreId).name,xp:genres.xp[genreId],cap:genreCap(genres,genreId)},clockLabel:homeTime.label,reward:workFinished?workReward:0,finished:workFinished,...workSound});
    }
    virtualPc.presentTransition(pcLifecycle.snapshot);
    if(resultEpisode?.returning&&pcLifecycle.snapshot.phase==='desktop'){
      const done=completeResultReaction(pcState,resultEpisode.reaction.id);
      if(done.ok&&persistPc(done.state,{atomic:true}))virtualPc.syncState(pcState);
      else failedReactionId=resultEpisode.reaction.id;
      resultEpisode.ui.restore();resultEpisode=null;
    }
    view.setComputerPresentation(pcLifecycle.snapshot,pcState,profile?.name??'Игрок');
    const cameraWork=workCameraFrame(creativeWorkDescriptor(pcState,profile?.skills));
    if(cameraWork)lastWorkCamera=cameraWork;else if(workFinished&&lastWorkCamera)lastWorkCamera={...lastWorkCamera,progress:1};
    view.setWorkCamera(['work-reveal','working','work-cover'].includes(workPhase)?lastWorkCamera:null);
    if(footsteps.update({clip:motion.clip,walkDistance:motion.walkDistance,paused:mode!=='game'||(paused&&!step)||document.hidden||homeModalOpen()}))cue('footstep');
    const door=motion.doorOpen>.3;if(door&&!lastDoor)cue('door');lastDoor=door;
    view.setRoomLights(homeTime.lights);view.setTime(homeTime.minutes,lightPreview==='game'?homeTime.minutes:Number(lightPreview));
    motion.workPerformance=creativeWorkDescriptor(pcState,profile?.skills).performance;
    if(pcNeedsSceneFrame(pcLifecycle.snapshot,mode))view.render(motion,(paused&&!step)||homeModalOpen()||document.hidden?0:dt,{skeleton,paused:(paused&&!step)||homeModalOpen()||document.hidden});cameraLabel();$('#fade').style.opacity=motion.fade;
    virtualPc.beatAudio.setRoomFrame(view.getComputerAudioFrame({desktop:mode==='pc'&&pcLifecycle.snapshot.phase==='desktop'}));
    const headAnchor=view.getHeadScreenPosition(),firstPerson=view.modes.mode==='3D',roomReady=pcLifecycle.snapshot.phase==='room'&&motion.actionId!=='computer'&&motion.fade<.01;
    const reacting=mode==='pc'&&pcLifecycle.snapshot.phase==='reaction-speaking';
    speech.tick(paused?0:dt,{hidden:document.hidden,present:reacting||mode==='game'&&!cameraFade&&roomReady&&!homeModalOpen()&&(firstPerson||headAnchor.visible),roomReady:reacting||roomReady,audioAllowed:audio?.state==='running'});
    speechView.update(speech.snapshot,headAnchor,{firstPerson:reacting?false:firstPerson,width:innerWidth,height:innerHeight,bottomLimit:reacting?innerHeight-40:$('#controls').getBoundingClientRect().top-12});
    virtualPc.syncHost({playerName:profile?.name??'Игрок',clockLabel:homeTime.label,gameDay:homeTime.day,gameMinutes:gameMinuteStamp(homeTime),skills:profile?.skills,...portraitMetadata()});
    virtualPc.tickOutgoingMessage(dt,{paused:paused||document.hidden||mode!=='pc'});
    $('#home-time').textContent=`${homeTime.dateLabel} · ${homeTime.label} · ${homeTime.period} · Дом`;
    phoneRoot.hidden=!playing||!['game','pc'].includes(mode);phoneView.update();
    if(now-lastTimeSave>(homeTime.isSleeping?500:15000)){saveHomeTime(storage,homeTime);persistPc(pcState);lastTimeSave=now;}
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
    else status.textContent=now<messageUntil?message:`Клик по полу — идти. Сытость ${Math.round(pcState.music.needs.satiety)} · энергия ${Math.round(pcState.music.needs.energy)}.`;
    for(const b of $('#actions').children){
      b.disabled=motion.busy||homeModalOpen();b.classList.toggle('active',b.dataset.action===motion.actionId);
      if(b.dataset.action==='passage')b.textContent=motion.position[0]<0?'Перейти в комнату':'Перейти на кухню';
      const room=config.actions[b.dataset.action]?.lightRoom;
      if(room){b.textContent=`Свет: ${room==='living'?'комната':'кухня'} · ${homeTime.lights[room]?'вкл.':'выкл.'}`;b.setAttribute('aria-pressed',String(homeTime.lights[room]));}
    }
  }
  loading.hidden=true;setMode('menu');view.render(motion,0);
  function frame(now){const raw=(now-last)/1000,dt=Math.min(raw,.25);if(raw>0)frameRate=frameRate*.9+Math.min(240,1/raw)*.1;last=now;update(dt,now);requestAnimationFrame(frame);}requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){advanceOutgoingTransfer(0,'hidden');virtualPc.tickOutgoingMessage(0,{paused:true});syncWorkAudio(true);virtualPc.audioSession.stopAll();saveHomeTime(storage,homeTime);persistPc(pcState);}});
  window.addEventListener('pagehide',event=>{advanceOutgoingTransfer(0,'pagehide');virtualPc.tickOutgoingMessage(0,{paused:true});if(!event.persisted)phoneView.dispose();});
  window.addEventListener('pagehide',event=>{saveHomeTime(storage,homeTime);persistPc(pcState);syncWorkAudio(true);virtualPc.audioSession.stopAll();if(event.persisted){pcSounds.stop();return;}wardrobeView.dispose();fridgeView.dispose();speechView.dispose();workAudio.dispose();lyricWorkAudio.dispose();workPanel.dispose();pcLifecycle.reset();pcSounds.dispose();virtualPc.dispose();view.dispose();});
  window.addEventListener('pageshow',event=>{if(event.persisted)last=performance.now();});
}catch(error){console.error(error);loading.querySelector('h2').textContent='Не удалось загрузить сцену';loading.querySelector('p').textContent=error.message;loading.classList.add('error');}
