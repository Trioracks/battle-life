import { routeBetweenRooms } from './apartment-layout.js';

const actionPhases = Object.freeze([
  Object.freeze({ id: 'walk', seconds: 1 }),
  Object.freeze({ id: 'turn', seconds: .28 }),
  Object.freeze({ id: 'start', seconds: .36 }),
  Object.freeze({ id: 'perform', seconds: Infinity }),
]);

const fadePhases = Object.freeze([
  Object.freeze({ id: 'walk', seconds: 1 }),
  Object.freeze({ id: 'turn', seconds: .28 }),
  Object.freeze({ id: 'fade-out', seconds: .2 }),
  Object.freeze({ id: 'swap-pose', seconds: .04 }),
  Object.freeze({ id: 'fade-in', seconds: .2 }),
  Object.freeze({ id: 'start', seconds: .36 }),
  Object.freeze({ id: 'perform', seconds: Infinity }),
]);

export function actionUsesDeskSeat(actionId) {
  return actionId === 'microphone';
}

export function createActionTransition({ actionId, fromRoom, toRoom, transition = 'visible' }) {
  return Object.freeze({
    actionId,
    route: Object.freeze(routeBetweenRooms(fromRoom, toRoom)),
    transition,
    phases: transition === 'desk-fade' || transition === 'bed-fade' ? fadePhases : actionPhases,
  });
}

export function transitionPhaseAt(transition, elapsedSeconds) {
  let remaining = Math.max(0, Number(elapsedSeconds) || 0);
  for (const phase of transition.phases) {
    if (remaining < phase.seconds) return phase;
    remaining -= phase.seconds;
  }
  return Object.freeze({ id: 'complete', seconds: 0 });
}

export function phaseAfterApproach(transition, elapsedSeconds) {
  const approach = transition.phases.find((phase) => phase.id === 'walk');
  return transitionPhaseAt(transition, (approach?.seconds ?? 0) + Math.max(0, Number(elapsedSeconds) || 0));
}
