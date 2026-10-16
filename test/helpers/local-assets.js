import fs from 'node:fs';
import path from 'node:path';

// Deliberately no default asset drive: callers must opt in to a real local root.
export function assertNoLinks(filename){
 let current=path.resolve(filename);
 while(true){const info=fs.lstatSync(current);if(info.isSymbolicLink())throw new Error(`Links are forbidden: ${current}`);const parent=path.dirname(current);if(parent===current)break;current=parent;}
 return filename;
}
export function validateLocalAssetRoot(root){
 if(typeof root!=='string'||!root||!path.isAbsolute(root))throw new Error('An explicit absolute BATTLE_LOCAL_ASSET_ROOT is required');
 const resolved=path.resolve(root);assertNoLinks(resolved);if(!fs.statSync(resolved).isDirectory())throw new Error('Local asset root must be a directory');return resolved;
}
export function localAssetPath(relativePath,root=process.env.BATTLE_LOCAL_ASSET_ROOT){
 const base=validateLocalAssetRoot(root),relative=typeof relativePath==='string'?relativePath.replace(/^\.\//,''):'';
 if(!relative||/[\\:\x00-\x1f]/.test(relative)||path.posix.isAbsolute(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)))throw new Error('Unsafe relative asset path');
 const filename=path.resolve(base,...relative.split('/'));if(!filename.startsWith(base+path.sep))throw new Error('Asset path escapes root');assertNoLinks(filename);return filename;
}
