const express = require("express");
const router = express.Router();
const pool = require("../db");
const { addClient, removeClient, broadcast } = require("../services/sseService");
const startHeartbeat = require("../utils/heartbeat");


// 🔹 Publish Event
router.post("/publish", async (req, res) => {
  const { channel, eventType, payload } = req.body;

  if (!channel || !eventType || !payload) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const result = await pool.query(
    "INSERT INTO events(channel, event_type, payload) VALUES($1,$2,$3) RETURNING *",
    [channel, eventType, payload]
  );

  const event = result.rows[0];

  const subs = await pool.query(
    "SELECT user_id FROM user_subscriptions WHERE channel=$1",
    [channel]
  );

  const users = subs.rows.map(r => r.user_id);

  broadcast(channel, event, users);

  res.sendStatus(202);
});


// 🔹 Subscribe
router.post("/channels/subscribe", async (req, res) => {
  const { userId, channel } = req.body;

  await pool.query(
    "INSERT INTO user_subscriptions(user_id, channel) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [userId, channel]
  );

  res.status(201).json({ status: "subscribed", userId, channel });
});


// 🔹 Unsubscribe
router.post("/channels/unsubscribe", async (req, res) => {
  const { userId, channel } = req.body;

  await pool.query(
    "DELETE FROM user_subscriptions WHERE user_id=$1 AND channel=$2",
    [userId, channel]
  );

  res.json({ status: "unsubscribed", userId, channel });
});


// 🔹 SSE Stream
router.get("/stream", async (req, res) => {
  const userId = parseInt(req.query.userId);
  const channels = req.query.channels.split(",");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  addClient(userId, res);

  const heartbeat = startHeartbeat(res);

  const lastId = req.headers["last-event-id"];

  if (lastId) {
    const replay = await pool.query(
      "SELECT * FROM events WHERE channel = ANY($1) AND id > $2 ORDER BY id ASC",
      [channels, lastId]
    );

    replay.rows.forEach(event => {
      res.write(`id: ${event.id}\n`);
      res.write(`event: ${event.event_type}\n`);
      res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
    });
  }

  req.on("close", () => {
    removeClient(userId);
    clearInterval(heartbeat);
  });
});


// 🔹 History
router.get("/history", async (req, res) => {
  const { channel, afterId = 0, limit = 50 } = req.query;

  const result = await pool.query(
    "SELECT * FROM events WHERE channel=$1 AND id>$2 ORDER BY id ASC LIMIT $3",
    [channel, afterId, limit]
  );

  res.json({ events: result.rows });
});

module.exports = router;