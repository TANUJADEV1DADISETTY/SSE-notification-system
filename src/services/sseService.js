const clients = new Map(); // userId -> res

function addClient(userId, res) {
  clients.set(userId, res);
}

function removeClient(userId) {
  clients.delete(userId);
}

function sendEvent(userId, event) {
  const client = clients.get(userId);
  if (client) {
    client.write(`id: ${event.id}\n`);
    client.write(`event: ${event.event_type}\n`);
    client.write(`data: ${JSON.stringify(event.payload)}\n\n`);
  }
}

function broadcast(channel, event, subscribers) {
  subscribers.forEach(userId => {
    sendEvent(userId, event);
  });
}

module.exports = { addClient, removeClient, broadcast };