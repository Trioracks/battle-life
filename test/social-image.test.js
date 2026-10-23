import test from 'node:test';
import assert from 'node:assert/strict';
import {socialImageUrl,recoverableSocialImage} from '../src/social-image.js';
import {pcDocument} from './helpers/virtual-pc-dom.js';
test('local images resolve independently of an embedding page and recover after a server outage',()=>{
 const d=pcDocument(),parent=d.createElement('div'),img=d.createElement('img');img.setAttribute('src',socialImageUrl('./assets/battle-covers/mak-cover-01.png'));parent.append(img);
 assert.match(img.getAttribute('src'),/\/assets\/battle-covers\/mak-cover-01.png\?rev=56$/);
 const retry=recoverableSocialImage(d,img,parent,'Обложка');assert.equal(retry.hidden,true);
 img.dispatchEvent(new Event('error'));assert.equal(img.hidden,true);assert.equal(retry.hidden,false);assert.ok(parent.children.includes(img));
 retry.dispatchEvent(new Event('click'));assert.match(img.getAttribute('src'),/&retry=\d+$/);img.dispatchEvent(new Event('load'));assert.equal(retry.hidden,true);assert.equal(img.hidden,false);
});
