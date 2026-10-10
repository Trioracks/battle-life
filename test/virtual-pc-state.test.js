import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIRTUAL_PC_STORAGE_KEY,
  cancelFtDownload,
  createVirtualPcState,
  diskUsage,
  installFtStudio,
  loadVirtualPcState,
  markFtDownloadComplete,
  saveVirtualPcState,
  saveStudioProject,
  setPcPower,
  setWallpaper,
  startFtDownload,
  setDesktopIconPosition, resetDesktopIconPositions, layoutDesktopIcons,
  applyToBattle,
} from '../src/virtual-pc-state.js?rev=25';
import {openInstaller,advanceInstaller,advanceInstallation} from '../src/pc-software.js?rev=25';

test('applications reject invalid entries, trim names and never duplicate a battle',()=>{
  const state=createVirtualPcState({battleApplications:[null,{}, {battleId:'external',nickname:'MC'}, {battleId:'concrete-echo',nickname:'  Район  '}, {battleId:'concrete-echo',nickname:'Дубль'}, {battleId:'yard-cipher',nickname:' '}]});
  assert.deepEqual(state.battleApplications,[{battleId:'concrete-echo',nickname:'Район',status:'registered'}]);
  assert.deepEqual(applyToBattle(state,'concrete-echo','Повтор'),state);
  assert.deepEqual(applyToBattle(state,'unknown','Имя'),state);
  assert.deepEqual(applyToBattle(state,'open-mic-17',' '),state);
  const next=applyToBattle(state,'open-mic-17','А'.repeat(40));
  assert.equal(next.battleApplications[1].nickname.length,32);assert.equal(state.battleApplications.length,1);
});

test('old save retains projects download wallpaper and adds an empty icon layout',()=>{
  const s=createVirtualPcState({projects:[{id:'old',name:'Бит'}],download:{status:'installed'},wallpaper:'factory'});
  assert.deepEqual(s.desktopIcons,{});
  assert.equal(s.projects[0].name,'Бит'); assert.equal(s.download.status,'installed'); assert.equal(s.wallpaper,'factory');
});
test('unknown icon and nonfinite position are ignored and layout stays in bounds',()=>{
  const s=createVirtualPcState({desktopIcons:{computer:{x:9999,y:9999},bad:{x:4,y:5},underweb:{x:NaN,y:3}}});
  assert.deepEqual(Object.keys(s.desktopIcons),['computer']);
  const p=layoutDesktopIcons(['computer','documents'],s.desktopIcons,{width:640,height:868});
  assert.deepEqual(p.computer,{x:560,y:780});
  assert.deepEqual(p.documents,{x:8,y:96});
});
test('desktop positions round trip without persisting windows and reset independently',()=>{
  const s=setDesktopIconPosition(createVirtualPcState({wallpaper:'factory'}),'computer',{x:80,y:88});
  const storage=mapStorage();
  assert.equal(saveVirtualPcState(storage,{...s,windows:[{id:'computer'}]}),true);
  const restored=loadVirtualPcState(storage).state;
  assert.deepEqual(restored.desktopIcons.computer,{x:80,y:88});
  assert.equal(restored.windows,undefined);
  assert.deepEqual(resetDesktopIconPositions(restored).desktopIcons,{});
  assert.equal(restored.wallpaper,'factory');
});

function mapStorage(seed = new Map()) {
  return {
    getItem(key) { return seed.get(key) ?? null; },
    setItem(key, value) { seed.set(key, value); },
  };
}

test('a new virtual pc reserves 14 GB for the system on a 16 GB disk', () => {
  const usage = diskUsage(createVirtualPcState());
  assert.deepEqual(usage, {
    capacityMb: 16000,
    usedMb: 14000,
    freeMb: 2000,
    systemMb: 14000,
    downloadMb: 0,
    installedMb: 0,
    projectsMb: 0,
  });
});

test('power and wallpaper changes are persistent immutable pc choices', () => {
  const initial = createVirtualPcState();
  const powered = setPcPower(initial, 'on');
  const decorated = setWallpaper(powered, 'factory');
  const memory = new Map();

  assert.equal(initial.power, 'off');
  assert.equal(powered.power, 'on');
  assert.equal(decorated.wallpaper, 'factory');
  assert.equal(saveVirtualPcState(mapStorage(memory), decorated), true);

  const restored = loadVirtualPcState(mapStorage(memory));
  assert.equal(restored.ok, true);
  assert.equal(restored.state.power, 'on');
  assert.equal(restored.state.wallpaper, 'factory');
  assert.ok(memory.has(VIRTUAL_PC_STORAGE_KEY));
});

test('corrupt or blocked storage falls back to an untouched default pc', () => {
  const corrupt = new Map([[VIRTUAL_PC_STORAGE_KEY, '{not json']]);
  const restored = loadVirtualPcState(mapStorage(corrupt));

  assert.equal(restored.ok, false);
  assert.equal(restored.state.power, 'off');
  assert.equal(diskUsage(restored.state).freeMb, 2000);
  assert.equal(saveVirtualPcState({ setItem() { throw Error('blocked'); } }, restored.state), false);
});

test('cancelling an unfinished package frees its partial virtual payload', () => {
  const downloading = createVirtualPcState({
    power: 'on',
    download: { status: 'downloading', receivedBytes: 200000000 },
  });
  const cancelled = cancelFtDownload(downloading);

  assert.equal(diskUsage(downloading).freeMb, 1791.988);
  assert.equal(cancelled.download.status, 'idle');
  assert.equal(cancelled.download.receivedBytes, 0);
  assert.equal(diskUsage(cancelled).freeMb, 1991.988);
});

test('installing a completed ft studio package retains its archive and consumes 800 MB once', () => {
  const completed = createVirtualPcState({power:'on',download:{status:'ready-to-install'}});
  let installed=openInstaller(completed,'ft').state;
  for(let i=0;i<3;i++)installed=advanceInstaller(installed).state;
  installed=advanceInstallation(installed,30).state;

  assert.equal(completed.download.status, 'ready-to-install');
  assert.equal(diskUsage(completed).downloadMb, 800.012);
  assert.equal(diskUsage(completed).freeMb, 1191.988);
  assert.equal(installed.download.status, 'installed');
  assert.equal(diskUsage(installed).downloadMb, 800.012);
  assert.equal(diskUsage(installed).installedMb, 808);
  assert.equal(diskUsage(installed).freeMb, 391.988);
});

test('saving a project reserves two virtual megabytes', () => {
  const state = createVirtualPcState({ projects: [{ id: 'first' }, { id: 'second' }] });
  const saved = saveStudioProject(state, { id: 'third' });
  const usage = diskUsage(saved.state);

  assert.equal(saved.ok, true);
  assert.equal(usage.projectsMb, 6);
  assert.equal(usage.usedMb, 14006);
  assert.equal(usage.freeMb, 1994);
});

test('saving a project does not overfill the virtual disk', () => {
  const full = createVirtualPcState({
    download: { status: 'installed', receivedBytes: 0 },
    projects: Array.from({ length: 600 }, (_, index) => ({ id: `project-${index}` })),
  });
  const result = saveStudioProject(full, { id: 'one-too-many' });

  assert.equal(diskUsage(full).freeMb, 0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient-space');
  assert.equal(result.state.projects.length, 600);
});

test('old powered save retains payloads and discards only obsolete shortcut placement',()=>{
  const old={version:1,power:'on',wallpaper:'factory',download:{status:'downloading',receivedBytes:123000000},projects:[{id:'p',name:'Бит'}],draft:{id:'draft',name:'Не потерять'},lastGameMinute:22,desktopIcons:{documents:{x:8,y:96},computer:{x:12,y:16}}};
  const loaded=loadVirtualPcState(mapStorage(new Map([[VIRTUAL_PC_STORAGE_KEY,JSON.stringify(old)]]))).state;
  assert.deepEqual(loaded.projects,old.projects);assert.deepEqual(loaded.download,old.download);assert.deepEqual(loaded.draft,old.draft);assert.equal(loaded.wallpaper,old.wallpaper);assert.equal(loaded.lastGameMinute,null);assert.equal(loaded.software.client.installed,true);
  assert.deepEqual(loaded.desktopIcons,{computer:{x:12,y:16}});
  assert.equal(diskUsage(loaded).freeMb,1866.988);
});

test('overfull import keeps all projects and overwrite needs no additional space',()=>{
  const state=createVirtualPcState({download:{status:'installed'},projects:Array.from({length:700},(_,i)=>({id:String(i)}))});
  assert.equal(diskUsage(state).freeMb,0);
  const saved=saveStudioProject(state,{id:'0',name:'Исправленный'});
  assert.equal(saved.ok,true);assert.equal(saved.state.projects.length,700);
  assert.equal(saved.state.projects[0].name,'Исправленный');assert.equal(diskUsage(saved.state).usedMb,16200);
});
