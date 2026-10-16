import {spawnSync,execFileSync} from 'node:child_process';

// Python 3 is a test-only stdlib prerequisite. BATTLE_PYTHON names one executable.
let selected;
export function execPython(args,options={}){
 if(!selected){
  const candidates=process.env.BATTLE_PYTHON?[[process.env.BATTLE_PYTHON,[]]]:[['python3',[]],['python',[]],...(process.platform==='win32'?[['py',['-3']]]:[])];
  for(const [command,prefix]of candidates){const result=spawnSync(command,[...prefix,'-B','-c','import sys;sys.exit(0 if sys.version_info.major == 3 else 1)'],{encoding:'utf8',windowsHide:true});if(result.status===0){selected={command,prefix};break;}}
  if(!selected)throw new Error('Python 3 is required for public builder/geometry tests. Install Python 3 or set BATTLE_PYTHON to its executable.');
 }
 return execFileSync(selected.command,[...selected.prefix,...args],{windowsHide:true,...options});
}
