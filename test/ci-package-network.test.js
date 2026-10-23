import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CI bounds Ubuntu downloads before installing all browser dependencies and running smoke',async()=>{
 const workflow=(await readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
 const setup=workflow.indexOf('https://archive.ubuntu.com/ubuntu'),install=workflow.indexOf('npx playwright install --with-deps chromium'),smoke=workflow.indexOf('npm run qa:preview');
 assert.ok(setup>0&&setup<install&&install<smoke,'official mirror setup must precede complete installation and browser QA');
 assert.match(workflow,/Acquire::http::Timeout "30"/);assert.match(workflow,/Acquire::https::Timeout "30"/);assert.match(workflow,/Acquire::Retries "2"/);
 assert.match(workflow,/apt\.conf\.d\/zzzz-public-preview-timeouts/);
 for(const [variable,key,want] of [['preview_http_timeout','Acquire::http::Timeout','30'],['preview_https_timeout','Acquire::https::Timeout','30'],['preview_retries','Acquire::Retries','2']]){
  const assertion=`test "$(apt-config shell ${variable} ${key})" = "${variable}='${want}'"`;
  assert.ok(workflow.includes(assertion),'verify effective '+key+' before installation');
  assert.ok(workflow.indexOf(assertion)<install);
 }
 assert.doesNotMatch(workflow,/allow-unauthenticated|AllowInsecureRepositories|Verify-Peer "false"/i);
});
