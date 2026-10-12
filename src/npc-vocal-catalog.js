// Only separately supplied and cleared NPC recordings belong here.
// Never alias these voices to the player's vocal catalog.
export const NPC_VOCAL_CATALOG=Object.freeze([]);
export const npcVocalById=id=>NPC_VOCAL_CATALOG.find(asset=>asset.id===id);
