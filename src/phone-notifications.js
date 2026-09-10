export function enqueueNotification(queue, notification) {
  if (!notification?.sender || !notification?.text) throw new Error('Уведомлению нужны отправитель и текст.');
  return [...queue, { sender: notification.sender, text: notification.text }];
}

export function dequeueNotification(queue) {
  return { notification: queue[0] ?? null, queue: queue.slice(1) };
}
