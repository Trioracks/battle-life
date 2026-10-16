import {mkdir,writeFile} from 'node:fs/promises';
import {auditPackageTwo} from '../test/helpers/package-two-audit.js';
const out='D:/Project/Battle/artifacts/v-krugu-qa',report=auditPackageTwo();await mkdir(out,{recursive:true});await writeFile(out+'/package-two-calibration.json',JSON.stringify(report,null,2));console.log(JSON.stringify({works:report.works,judges:report.judges,reviews:report.reviewCount,summaries:report.summaries,nearRepeatDiagnostics:report.diagnostics.length},null,2));
