import covers from '../data/battles/covers-v1.json' with {type:'json'};
import photos from '../assets/npc-photos/manifest.json' with {type:'json'};
import lifePhotos from '../assets/npc-photos/life/manifest.json' with {type:'json'};
import {portraitKey} from './social-portraits.js?rev=59';
export function battleCover(id){const c=covers.covers.find(c=>c.id===id);return c&&/^assets\/battle-covers\/mak-cover-\d\d\.png$/.test(c.path)?{...c,src:'./'+c.path}:{id,src:null,missingAssets:[id]};}
export function npcPhoto(id,profile){const p=photos.photos.find(p=>p.id===id&&p.characterId===profile.characterId&&p.appearanceId===portraitKey(profile.appearance));return p?{...p,src:'./'+p.path}:{id,src:null,missingAssets:[id]};}
export function npcLifePhoto(id,profile){const p=lifePhotos.photos.find(p=>p.id===id&&p.characterId===profile.characterId&&p.appearanceId===portraitKey(profile.appearance));return p?{...p,src:'./'+p.path}:{id,src:null,missingAssets:[id]};}
