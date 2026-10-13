// Only separately supplied and cleared NPC recordings belong here.
// Never alias these voices to the player's vocal catalog.
import voices from '../data/audio/npc-voices.json' with {type:'json'};
export const NPC_VOICE_REGISTRY=Object.freeze(voices);
export const NPC_VOCAL_CATALOG=Object.freeze(voices.voices.flatMap(v=>v.parts??[]));
export const npcVocalById=id=>NPC_VOCAL_CATALOG.find(asset=>asset.id===id);
