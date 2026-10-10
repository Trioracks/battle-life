import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';

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
