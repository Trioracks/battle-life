import test from 'node:test';
import assert from 'node:assert/strict';
import {socialFeedPage,mountSocialFeed} from '../src/social-feed-page.js';
import {pcDocument} from './helpers/virtual-pc-dom.js';
test('a feed shows three then ten more per request, with a separate pinned announcement',()=>{
 const posts=Array.from({length:30},(_,i)=>({id:'post-'+i})),all=[{id:'pin'},...posts];let count=3;
 for(const expected of [3,13,23,30]){const p=socialFeedPage(all,{visibleCount:count,pinnedId:'pin'});assert.equal(p.items.length,expected);assert.equal(p.items.some(x=>x.id==='pin'),false);assert.equal(p.hasMore,expected<30);count=p.nextVisibleCount;}
});
test('showing more appends ten rows without rebuilding existing audio or comment nodes',()=>{
 const d=pcDocument(),root=d.createElement('main'),state={},posts=Array.from({length:25},(_,i)=>({id:'p'+i})),feed=mountSocialFeed(root,{posts,uiState:state,renderPost:p=>{const n=d.createElement('article');n.textContent=p.id;return n;}});assert.equal(feed.items.children.length,3);const first=feed.items.children[0];feed.more.click();assert.equal(feed.items.children.length,13);assert.equal(feed.items.children[0],first);assert.equal(state.visibleCount,13);
});
