const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 8080;

// Track active connections
// Active connections structure: Array of { userId, channels: Set<string>, res }
let activeConnections = [];

// Clean up disconnected clients
const removeConnection = (res) => {
  activeConnections = activeConnections.filter(c => c.res !== res);
};

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 5. Publish Event
app.post('/api/events/publish', async (req, res) => {
  const { channel, eventType, payload } = req.body;
  
  if (!channel || !eventType || !payload) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      'INSERT INTO events (channel, event_type, payload) VALUES ($1, $2, $3) RETURNING *',
      [channel, eventType, JSON.stringify(payload)]
    );
    const newEvent = result.rows[0];

    // Push to active listening connections
    activeConnections.forEach(conn => {
      if (conn.channels.has(channel)) {
        conn.res.write(`id: ${newEvent.id}\nevent: ${newEvent.event_type}\ndata: ${JSON.stringify(newEvent.payload)}\n\n`);
      }
    });

    res.status(202).send();
  } catch (error) {
    console.error('Error publishing event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Subscribe
app.post('/api/events/channels/subscribe', async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) {
    return res.status(400).json({ error: 'Missing userId or channel' });
  }

  try {
    await db.query(
      'INSERT INTO user_subscriptions (user_id, channel) VALUES ($1, $2) ON CONFLICT (user_id, channel) DO NOTHING',
      [userId, channel]
    );
    res.status(201).json({ status: "subscribed", userId, channel });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Unsubscribe
app.post('/api/events/channels/unsubscribe', async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) {
    return res.status(400).json({ error: 'Missing userId or channel' });
  }

  try {
    await db.query(
      'DELETE FROM user_subscriptions WHERE user_id = $1 AND channel = $2',
      [userId, channel]
    );
    res.status(200).json({ status: "unsubscribed", userId, channel });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 12. History
app.get('/api/events/history', async (req, res) => {
  const channel = req.query.channel;
  if (!channel) return res.status(400).json({ error: 'Missing channel parameter' });

  const limit = parseInt(req.query.limit, 10) || 50;
  const afterId = req.query.afterId ? parseInt(req.query.afterId, 10) : 0;

  try {
    const result = await db.query(
      'SELECT id, channel, event_type as "eventType", payload, created_at as "createdAt" FROM events WHERE channel = $1 AND id > $2 ORDER BY id ASC LIMIT $3',
      [channel, afterId, limit]
    );
    res.status(200).json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. Stream Endpoint
app.get('/api/events/stream', async (req, res) => {
  const userId = req.query.userId;
  const channelsQuery = req.query.channels;

  if (!userId || !channelsQuery) {
    return res.status(400).json({ error: 'Missing userId or channels parameter' });
  }

  const requestedChannels = channelsQuery.split(',').filter(c => c.trim().length > 0);

  try {
    const subResult = await db.query(
      'SELECT channel FROM user_subscriptions WHERE user_id = $1 AND channel = ANY($2::varchar[])',
      [userId, requestedChannels]
    );
    
    // The user should only receive events for these verified channels
    const validChannels = new Set(subResult.rows.map(r => r.channel));

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Flush headers to establish connection immediately
    res.flushHeaders && res.flushHeaders();

    const lastEventId = req.header('Last-Event-ID');
    if (lastEventId) {
      // Replay missed events
      const parsedLastId = parseInt(lastEventId, 10);
      if (!isNaN(parsedLastId) && validChannels.size > 0) {
        const replayResult = await db.query(
          'SELECT * FROM events WHERE channel = ANY($1::varchar[]) AND id > $2 ORDER BY id ASC',
          [Array.from(validChannels), parsedLastId]
        );
        for (const record of replayResult.rows) {
          res.write(`id: ${record.id}\nevent: ${record.event_type}\ndata: ${JSON.stringify(record.payload)}\n\n`);
        }
      }
    }

    // Add to active connections
    const newConnection = { userId, channels: validChannels, res };
    activeConnections.push(newConnection);

    req.on('close', () => {
      removeConnection(res);
    });

  } catch (error) {
    console.error('Error establishing stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

// 9. Heartbeat
setInterval(() => {
  activeConnections.forEach(conn => {
    conn.res.write(': heartbeat\n\n');
  });
}, 30000);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});