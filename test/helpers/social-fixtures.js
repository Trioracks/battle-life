import {submissionFixture} from './submission-fixtures.js';
import {captureTrackVersion} from '../../src/track-version.js';
export function subscriptionFixture(){
 const captured=captureTrackVersion(submissionFixture(),{projectId:'beat',nowMinute:600});
 return {...captured.state,social:{...captured.state.social,personalAudioIds:[captured.versionId]}};
}
