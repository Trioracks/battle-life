import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function assetPath(name=''){
 return path.resolve(process.env.APARTMENT_ASSETS_DIR||fileURLToPath(new URL('../../assets/apartment/v3/',import.meta.url)),name);
}
