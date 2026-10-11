export function createPcIcon(document,id,{size=32}={}) {
  const known=['computer','documents','notebook','folder','disk','project','underweb','torent','studio','settings','display','power','start','minimize','maximize','restore','close'];
  const icon=document.createElement('img');
  icon.setAttribute('src','./assets/ui/virtual-pc/icons/'+(known.includes(id)?id:'project')+'.svg');
  icon.setAttribute('alt','');icon.setAttribute('width',size);icon.setAttribute('height',size);
  icon.setAttribute('draggable','false');icon.className='pc-graphic';return icon;
}
