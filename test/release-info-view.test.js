import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
test('release information is readable in menu, includes audio limitation and disposes only its own content',async()=>{
 const {mountReleaseInfo}=await import('../src/release-info-view.js');const doc=pcDocument(),root=doc.createElement('div'),button=doc.createElement('button');root.append(button);
 const view=mountReleaseInfo(root,{buildInfo:{version:'0.1.0-preview.1',revision:'b773a928a5de456b5edf3e0521d8c5223cc352ad',profile:'public-preview'}});
 const nodes=allPc(root);assert.ok(nodes.some(n=>n.textContent?.includes('0.1.0-preview.1 · b773a92')));assert.ok(nodes.some(n=>n.textContent==='Музыка и вокал отключены в тестовой веб-версии'));
 const label=nodes.find(n=>n.className==='release-info');assert.equal(label.getAttribute('tabindex'),'0');assert.equal(label.getAttribute('aria-label'),'Версия и ограничения веб-превью');
 view.dispose();assert.deepEqual(root.children,[button]);
});
