export function presentActionProgress(action, elapsed, duration) {
  const ratio = Math.max(0, Math.min(1, duration > 0 ? elapsed / duration : 1));
  return {
    ratio,
    percent: Math.round(ratio * 100),
    observed: (action?.minutes ?? 0) >= 30,
    label: action?.label ?? '',
    minutes: action?.minutes ?? 0,
  };
}
