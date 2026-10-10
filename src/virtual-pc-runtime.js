import { FT_STUDIO_BYTES, createVirtualPcState, markFtDownloadComplete } from './virtual-pc-state.js?rev=20';

const DOWNLOAD_MINUTES = 360;
const SPEED_KB_PER_SECOND = Math.round(FT_STUDIO_BYTES / (DOWNLOAD_MINUTES * 60 * 1000));

export function gameMinuteStamp(clock) {
  if (!Number.isSafeInteger(clock?.day) || clock.day < 1 || !Number.isFinite(clock.minutes) || clock.minutes < 0 || clock.minutes >= 1440) return null;
  return (clock.day - 1) * 1440 + clock.minutes;
}

export function advanceVirtualPc(state, clock) {
  const current = createVirtualPcState(state);
  const stamp = gameMinuteStamp(clock);
  if (stamp === null || (current.lastGameMinute !== null && stamp < current.lastGameMinute)) {
    return { state: current, advancedBytes: 0 };
  }
  if (current.lastGameMinute === null || stamp === current.lastGameMinute) {
    return { state: { ...current, lastGameMinute: stamp }, advancedBytes: 0 };
  }
  const elapsedMinutes = stamp - current.lastGameMinute;
  const stamped = { ...current, lastGameMinute: stamp };
  if (stamped.power !== 'on' || stamped.download.status !== 'downloading') {
    return { state: stamped, advancedBytes: 0 };
  }
  const wantedBytes = elapsedMinutes * FT_STUDIO_BYTES / DOWNLOAD_MINUTES;
  const receivedBytes = Math.min(FT_STUDIO_BYTES, stamped.download.receivedBytes + wantedBytes);
  const advancedBytes = receivedBytes - stamped.download.receivedBytes;
  const downloading = { ...stamped, download: { status: 'downloading', receivedBytes } };
  return receivedBytes === FT_STUDIO_BYTES
    ? { state: markFtDownloadComplete(downloading), advancedBytes }
    : { state: downloading, advancedBytes };
}

export function downloadPresentation(state) {
  const current = createVirtualPcState(state);
  const receivedBytes = current.download.status === 'installed' ? FT_STUDIO_BYTES : current.download.receivedBytes;
  const remainingBytes = Math.max(0, FT_STUDIO_BYTES - receivedBytes);
  return {
    status: current.download.status,
    speedKbPerSecond: SPEED_KB_PER_SECOND,
    totalMb: FT_STUDIO_BYTES / 1000000,
    receivedMb: receivedBytes / 1000000,
    percent: Math.round(receivedBytes / FT_STUDIO_BYTES * 100),
    remainingGameMinutes: Math.ceil(remainingBytes / FT_STUDIO_BYTES * DOWNLOAD_MINUTES),
  };
}
