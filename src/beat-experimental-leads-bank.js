import manifest from '../assets/audio/ft/experimental-leads-v1/manifest.json' with {type:'json'};

export const EXPERIMENTAL_LEAD_BANK=Object.freeze(manifest.parts.map(part=>Object.freeze({...part})));
export const EXPERIMENTAL_LEAD_RECIPES=Object.freeze(manifest.recipes.map(recipe=>Object.freeze({...recipe})));
