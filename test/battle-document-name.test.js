import test from 'node:test';
import assert from 'node:assert/strict';
import {battleDocumentName} from '../src/battle-document-name.js';
test('battle text names keep their topic and allocate the first free numbered attempt from one',()=>{
 assert.equal(battleDocumentName('Не переключай',[]),'Не переключай');
 assert.equal(battleDocumentName('Не переключай',['Не переключай']),'Не переключай (1)');
 assert.equal(battleDocumentName('Не переключай',['не ПЕРЕКЛЮЧАЙ','Не переключай (1)']),'Не переключай (2)');
 assert.equal(battleDocumentName('Не переключай',['Не переключай','Не переключай (2)']),'Не переключай (1)');
});
