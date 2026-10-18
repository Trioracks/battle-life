import {SOURCE_GAINS_DB as legacy} from './source-levels-v1.js?rev=43';
import {USER_EXPERIMENTAL_GAINS_DB} from './source-levels-user-experimental-v1.js?rev=43';
import additionalParts from '../assets/audio/ft/jura-experimental-v2/manifest.json?rev=47' with {type:'json'};
// Additive calibration only: released values and saved descriptors never migrate.
export const SOURCE_GAINS_DB=Object.freeze({...legacy,...USER_EXPERIMENTAL_GAINS_DB,...Object.fromEntries(additionalParts.parts.map(p=>[p.id,p.calibration.gainDb])),
 'jura-experimental-20261018-drumm':-16.98,'jura-experimental-20261018-drumm-2':-18.66,
 'jura-experimental-20261018-bass':-8.86,'jura-experimental-20261018-bass-2':-10.11,
 'jura-experimental-20261018-lead':-8.61,'jura-experimental-20261018-lead-2':-8.87});
