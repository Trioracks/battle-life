import {createSocialWorkerRuntime} from './social-worker-runtime.js?rev=45';
const calculate=createSocialWorkerRuntime();
self.onmessage=event=>self.postMessage(calculate(event.data));
