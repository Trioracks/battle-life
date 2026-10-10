import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';

test('FT production update invalidates the entry and changed audio/model/view modules',async()=>{
 const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
 assert.match(await read('index.html'),/apartment-app\.js\?rev=21/);
 assert.match(await read('index.html'),/desktop-apps\.css\?rev=21/);
 for(const [file,modules]of [
  ['src/virtual-pc-ui.js',['beat-studio-view','beat-audio','beat-production','ft-studio-view']],
  ['src/virtual-pc-state.js',['beat-production']],
  ['src/apartment-app.js',['virtual-pc-ui','beat-work-audio','beat-work-view','beat-production']],
  ['src/beat-audio.js',['beat-playback','beat-beginner-bank']],
 ])for(const module of modules)assert.ok((await read(file)).includes(module+'.js?rev=21'),file+' must invalidate '+module);
});

test('HTML loads the new versioned apartment entry; legacy campaign remains accessible',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/src="\.\/src\/apartment-app\.js\?rev=[^"]+"/);
  assert.match(html,/href="\.\/virtual-pc\.css\?rev=[^"]+"/);
  assert.match(html,/<section id="virtual-pc" hidden/);
  await access(new URL('../src/apartment-app.js',import.meta.url));
  const legacy=await readFile(new URL('../legacy.html',import.meta.url),'utf8');
  assert.match(legacy,/id="creator-modal"/);
  assert.match(legacy,/src="\.\/src\/main\.js\?rev=[^"]+"/);
});
