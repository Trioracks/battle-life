import {PC_IDENTITY} from './pc-identity.js?rev=45';
import {pcElement as el} from './virtual-pc-dom.js?rev=45';

export function formatDiskGb(mb) {
  return (Math.max(0,Number.isFinite(mb)?mb:0)/1000).toFixed(1).replace('.',',')+' ГБ';
}
export function diskAmount(mb) {
  return `${formatDiskGb(mb)} (${Math.floor(Math.max(0,mb))} МБ)`;
}

export function mountDiskUsage(root) {
  const d=root.ownerDocument;
  const wrap=el(d,'span',{className:'pc-disk-usage'});
  const capacity=el(d,'span'),used=el(d,'span'),free=el(d,'span'),system=el(d,'span',{className:'pc-disk-system'});
  const meter=el(d,'span',{className:'pc-disk-meter',attributes:{role:'meter','aria-label':'Занято на диске C:','aria-valuemin':'0'}});
  const fill=el(d,'span',{className:'pc-disk-fill',attributes:{'aria-hidden':'true'}});
  meter.append(fill);wrap.append(capacity,meter,used,free,system);root.append(wrap);
  let disposed=false;
  return {
    update(usage) {
      if(disposed)return;
      const occupied=Math.min(usage.capacityMb,usage.usedMb);
      capacity.textContent='Ёмкость '+formatDiskGb(usage.capacityMb);
      used.textContent='Занято '+diskAmount(usage.usedMb);
      free.textContent='Свободно '+diskAmount(usage.freeMb);
      system.textContent=PC_IDENTITY.name+': '+formatDiskGb(usage.systemMb);
      meter.setAttribute('aria-valuemax',String(usage.capacityMb));
      meter.setAttribute('aria-valuenow',String(occupied));
      meter.setAttribute('aria-valuetext',`${used.textContent}; ${free.textContent}`);
      fill.style.setProperty('width',(usage.capacityMb>0?100*occupied/usage.capacityMb:0)+'%');
    },
    dispose(){disposed=true;wrap.remove();}
  };
}
