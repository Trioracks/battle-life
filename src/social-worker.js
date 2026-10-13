import {createSocialWorkerRuntime} from './social-worker-runtime.js';
const calculate=createSocialWorkerRuntime();
self.onmessage=event=>self.postMessage(calculate(event.data));
