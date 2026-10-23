import manifest from '../assets/audio/ft/abstract-v1/manifest.json' with {type:'json'};

export const ABSTRACT_BANK=Object.freeze(manifest.parts.map(part=>Object.freeze({...part,indices:Object.freeze([...part.indices])})));
export const ABSTRACT_RECIPES=Object.freeze(manifest.recipes.map(recipe=>Object.freeze({...recipe,indices:Object.freeze([...recipe.indices])})));
const families=manifest.families.map(family=>ABSTRACT_RECIPES.filter(recipe=>recipe.family===family.id));
function unit(value){
 if(!Number.isFinite(value))throw new TypeError('Abstract random draw must be a finite number.');
 return Math.max(0,Math.min(.999999,value));
}

// Draw the family first so a larger source family does not crowd out the others.
export function chooseAbstractRecipe(random=Math.random){
 const family=families[Math.floor(unit(random())*families.length)];
 return family[Math.floor(unit(random())*family.length)];
}
