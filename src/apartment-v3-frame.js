export function advanceApartmentFrame(motion,delta,hold=false){
  if(!Number.isFinite(delta)||delta<=0)return 0;
  const elapsed=Math.min(delta,.25);let remaining=elapsed;
  // Retain elapsed time on slow frames, while keeping door/fade transitions
  // within the controller's safe 50 ms integration step.
  while(remaining>1e-8){const step=Math.min(remaining,.05);motion.tick(step,hold);remaining-=step;}
  return elapsed;
}
