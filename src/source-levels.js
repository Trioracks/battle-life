import {SOURCE_GAINS_DB as legacy} from './source-levels-v1.js?rev=41';
import {USER_EXPERIMENTAL_GAINS_DB} from './source-levels-user-experimental-v1.js?rev=41';
// Additive calibration only: released values and saved descriptors never migrate.
export const SOURCE_GAINS_DB=Object.freeze({...legacy,...USER_EXPERIMENTAL_GAINS_DB});
