import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleResultsTableView} from '../src/battle-results-table-view.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
function fixture(){const d=pcDocument(),table={battleId:'makarevich-1',roundId:'selection',title:'Отбор',message:'Оценки опубликованы',availableRounds:[],judges:[{id:'one',name:'Первый судья'},{id:'two',name:'Второй судья'}],rows:[{participantId:'player',name:'Игрок',tone:'good',status:'qualified',place:1,total:15,scores:[{judgeId:'one',value:8},{judgeId:'two',value:7}],reviews:[{id:'a',judgeId:'one',comment:'Хороший ритм, поработай над концовкой.'},{id:'b',judgeId:'two',comment:''}]}],awards:[],selection:true,complete:true};const root=createBattleResultsTableView(d,{table,navigate(){}});return {root,d,table};}
test('score cells open one correct judge comment, support focus and Escape, and replace the lower review list',()=>{
 const {root,d}=fixture(),buttons=allPc(root).filter(n=>n.dataset.scoreCell);assert.equal(buttons.length,2);assert.equal(allPc(root).some(n=>n.className==='bt-details'),false);assert.equal(allPc(root).some(n=>n.textContent==='Хороший ритм, поработай над концовкой.'),false);
 buttons[0].click();assert.ok(allPc(root).some(n=>n.textContent==='Хороший ритм, поработай над концовкой.'));assert.ok(allPc(root).some(n=>n.className==='bt-score-comment'&&n.getAttribute('role')==='tooltip'));
 buttons[1].focus();fire(buttons[1],'focus');assert.equal(allPc(root).filter(n=>n.className==='bt-score-comment').length,1);assert.ok(allPc(root).some(n=>n.textContent==='Комментария нет.'));assert.equal(allPc(root).some(n=>n.textContent==='Хороший ритм, поработай над концовкой.'),false);
 fire(root,'keydown',{key:'Escape'});assert.equal(allPc(root).some(n=>n.className==='bt-score-comment'),false);assert.ok(d.activeElement===buttons[1]);root.dispose();
});
test('hidden and unpublished scores expose no comment and pagination closes the current popover',()=>{
 const {root,table}=fixture();root.dispose();const d=pcDocument();table.rows.push({...structuredClone(table.rows[0]),participantId:'hidden',masked:true,name:'Скрыт',scores:[{judgeId:'one',value:null},{judgeId:'two',value:null}],reviews:[{judgeId:'one',comment:'Ещё не опубликовано'}]});
 const view=createBattleResultsTableView(d,{table,navigate(){},uiState:{rowsPerPage:1}}),button=allPc(view).find(n=>n.dataset.scoreCell);button.click();findButton(view,'Следующая страница').click();assert.equal(allPc(view).some(n=>n.className==='bt-score-comment'),false);assert.equal(allPc(view).some(n=>n.dataset.scoreCell),false);assert.equal(allPc(view).some(n=>n.textContent==='Ещё не опубликовано'),false);view.dispose();
});
