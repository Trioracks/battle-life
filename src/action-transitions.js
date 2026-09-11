import { routeBetweenRooms } from './apartment-layout.js';

const actionPhases = Object.freeze([
  Object.freeze({ id: 'walk', seconds: 1 }),
  Object.freeze({ id: 'turn', seconds: .28 }),
  Object.freeze({ id: 'start', seconds: .36 }),
  Object.freeze({ id: 'perform', seconds: Infinity }),
]);

export function createActionTransition({ actionId, fromRoom, toRoom }) {
  return Object.freeze({
    actionId,
    route: Object.freeze(routeBetweenRooms(fromRoom, toRoom)),
    phases: actionPhases,
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
