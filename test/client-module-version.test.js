import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('HTML requests a versioned game module so a refreshed browser cannot retain an old rig', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /src="\.\/src\/main\.js\?rev=[^"]+"/);
});
