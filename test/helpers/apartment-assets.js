import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function assetPath(name=''){
 const root=path.resolve(process.env.APARTMENT_ASSETS_DIR||fileURLToPath(new URL('../../assets/apartment/v3/',import.meta.url)));
 const filename=path.resolve(root,name);
 if(filename!==root&&!filename.startsWith(root+path.sep))throw new Error('Apartment asset path escapes bundle root');
 return filename;
}
