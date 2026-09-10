import test from 'node:test';
import assert from 'node:assert/strict';
import { dequeueNotification, enqueueNotification } from '../src/phone-notifications.js';

test('phone presents queued messages in first-in-first-out order', () => {
  const queue = enqueueNotification([], { sender: 'MAKAREWITCH', text: 'Заявка принята.' });
  const next = enqueueNotification(queue, { sender: 'Сеня', text: 'Не забудь поесть.' });

  assert.equal(dequeueNotification(next).notification.sender, 'MAKAREWITCH');
  assert.deepEqual(dequeueNotification(next).queue, [{ sender: 'Сеня', text: 'Не забудь поесть.' }]);
});
