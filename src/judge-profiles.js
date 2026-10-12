import data from '../data/judges/profiles.json' with { type:'json' };
import {judgeReferenceKnowledge} from './cultural-references.js?rev=39';

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export const JUDGE_PROFILES = freeze(data.profiles.map(profile=>({...profile,knowledge:judgeReferenceKnowledge(profile.id)})));
const profilesById = new Map(JUDGE_PROFILES.map(p=>[p.id,p]));

export function judgeProfile(id) {
  const profile = profilesById.get(id);
  return profile ? structuredClone(profile) : null;
}

/** Reject incomplete panels before any live result is generated. Never invent a fallback on lookup. */
export function validateJudgeCoverage(rounds,profiles) {
  const diagnostics = [];
  const seen = new Set();
  for (const profile of profiles) {
    const {id,weights,formatAdherence} = profile;
    if (seen.has(id)) diagnostics.push({code:'duplicate-profile',judgeId:id});
    seen.add(id);
    const values = ['text','performance','music','sound'].map(k=>weights?.[k]);
    if (values.some(w=>!Number.isFinite(w) || w<=0) || Math.abs(values.reduce((a,b)=>a+b,0)-1)>1e-9) {
      diagnostics.push({code:'invalid-weights',judgeId:id});
    }
    if (!Number.isFinite(formatAdherence) || formatAdherence<0 || formatAdherence>1) {
      diagnostics.push({code:'invalid-adherence',judgeId:id});
    }
    if (!Number.isFinite(profile.strictnessOffset)) diagnostics.push({code:'invalid-strictness',judgeId:id});
  }
  for (const round of rounds) for (const judgeId of round.judgeIds) {
    if (!seen.has(judgeId)) diagnostics.push({code:'missing-profile',judgeId});
  }
  return diagnostics;
}
