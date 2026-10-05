import { createCampaign } from './game-state.js';

export function startScreenState(campaign) {
  const canContinue = Boolean(campaign?.player?.name);
  return { canContinue, primaryAction: canContinue ? 'continue' : 'new' };
}

export function newGameState() {
  return createCampaign();
}
