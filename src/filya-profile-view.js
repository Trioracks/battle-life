import {FILYA_PROFILE,FILYA_CARDS} from './filya-catalog.js?rev=57';
import {filyaPublicPosts} from './filya-calendar.js?rev=57';
import {createMusicianProfileView} from './musician-profile-view.js?rev=57';
export function createFilyaProfileView(d,options){
 const state=options.getState(),now=options.getMetadata().gameMinutes??state.socialRuntime?.lastMinute??0;
 const posts=filyaPublicPosts(state,now),ids=new Set(posts.map(p=>p.cardId));
 return createMusicianProfileView(d,{...options,onAnalyze:null,profile:FILYA_PROFILE,posts,photos:FILYA_CARDS.filter(c=>ids.has(c.id)),stateKey:'filya',subtitle:'Тёма · кореш Гоблина'});
}
