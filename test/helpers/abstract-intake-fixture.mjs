import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Tiny originals deliberately use the real naming irregularities, not importer helpers.
export async function makeAbstractIntakeFixture(root) {
  if (path.parse(path.resolve(root)).root.toLowerCase() !== 'd:\\') throw new Error('Fixtures must stay on D:');
  const abstractRoot = path.join(root, 'Абстракт');
  const experimentalRoot = path.join(root, 'Эксперементал');
  const libraryRoot = path.join(root, 'source-library');
  const put = async (file, content = file) => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  for (const [family, count] of [['Track 01', 9], ['Track 02', 11], ['Track 03', 7], ['Track 04', 20]]) {
    for (let index = 1; index <= count; index++) {
      for (const role of ['bass', family === 'Track 03' ? 'drumm' : index === 1 ? 'Drum' : 'drum', 'lead']) {
        await put(path.join(abstractRoot, family, `${role} ${index}.mp3`));
      }
    }
  }
  for (let index = 1; index <= 18; index++) {
    await put(path.join(abstractRoot, 'Даня Войс', `Даниил - REC${index === 1 ? '' : `_${index}`}.wav`));
  }
  for (const index of [2,3,8,9,10,11,12,13,15,16,17,19,20,21,22,25,26,27,29,31,33,34,35,37,39,41,42,43,45,47,48,51,52]) {
    await put(path.join(abstractRoot, 'Даня Войс', `Даниил - Track ${index}.wav`));
  }
  for (let index = 1; index <= 49; index++) {
    await put(path.join(abstractRoot, 'Капа Войс', `Капа - REC${index === 1 ? '' : `_${index}`}.wav`), index === 9 ? '' : `kapa-${index}`);
  }
  await put(path.join(abstractRoot, 'Капа Войс', 'Капа - Track 1.wav'), '');
  for (let index = 1; index <= 13; index++) await put(path.join(experimentalRoot, `lead ${index}.mp3`));
  const excludedPaths = [
    path.join(abstractRoot, 'Генерация минуса и голосов.mp3'),
    path.join(abstractRoot, 'Track 04', 'FL.flp'),
    path.join(abstractRoot, 'Track 02', 'Архивные фрагменты Stems.zip'),
    path.join(abstractRoot, 'Track 04', 'Архивные фрагменты Stems (1)', 'bass 1.mp3'),
    path.join(experimentalRoot, 'bass 1.mp3'),
    path.join(experimentalRoot, 'drums 1.mp3'),
  ];
  for (const file of excludedPaths) await put(file, `excluded:${file}`);
  await mkdir(libraryRoot, { recursive: true });
  return { abstractRoot, experimentalRoot, libraryRoot, excludedPaths };
}
