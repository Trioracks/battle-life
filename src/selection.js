const judgeProfiles = Object.freeze([
  { name: 'Великая Моль', bias: -.2, comment: 'Слышно, куда автор ведёт мысль.' },
  { name: 'Север', bias: .15, comment: 'По звуку и настроению это попадает в площадку.' },
  { name: 'Кубрик', bias: .35, comment: 'Есть за что оставить в отборе.' },
]);

function clamp(value) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function scoreSelection(track, tournament) {
  if (track?.stage !== 'submitted') throw new Error('Судить можно только отправленный трек.');
  const focusFit = track.focus === 2 ? .55 : track.focus === 1 || track.focus === 3 ? .2 : -.4;
  const researchFit = track.useResearch ? .65 : 0;
  const genreFit = track.genre === 'boom-bap' ? .2 : -.55;
  const base = track.quality * 1.1 + focusFit + researchFit + genreFit;
  const scores = judgeProfiles.map((judge) => {
    const value = clamp(base + judge.bias);
    const comment = value >= 6 ? judge.comment : value <= 3 ? 'В этот раз материал не собрался и не попал в формат.' : 'Есть отдельные моменты, но пока не хватает цельности.';
    return { judge: judge.name, value, comment };
  });
  const total = scores.reduce((sum, score) => sum + score.value, 0);
  return { scores, total, passed: total >= tournament.hiddenPass };
}
