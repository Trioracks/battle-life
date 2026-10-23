export function battleDocumentName(themeTitle,existingNames=[]){
 const base=String(themeTitle??'').trim().slice(0,64),key=s=>String(s).normalize('NFC').toLocaleLowerCase('ru'),used=new Set(existingNames.map(key));
 if(!used.has(key(base)))return base;
 for(let n=1;n<=used.size+1;n++){const suffix=' ('+n+')',candidate=base.slice(0,64-suffix.length)+suffix;if(!used.has(key(candidate)))return candidate;}
}
