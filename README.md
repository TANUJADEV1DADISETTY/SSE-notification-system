# 🚀 Real-Time SSE Notification System with Event Persistence & Replay

## 📌 Overview

This project implements a real-time notification system using Server-Sent Events (SSE). It supports real-time streaming, event persistence, and replay functionality for disconnected clients.

---

## 🎯 Features

- Real-time notifications using SSE
- Event persistence in PostgreSQL
- Replay missed events using Last-Event-ID
- Channel-based subscriptions
- Dockerized setup
- Heartbeat mechanism to keep connection alive

---

## 🏗️ Architecture

Client → Express Server → SSE Manager → PostgreSQL

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Docker & Docker Compose
- SSE (Server-Sent Events)

---

## 📁 Project Structure

sse-notification-system/
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── submission.json
├── package.json
│
├── src/
│ ├── index.js
│ ├── db.js
│ ├── routes/events.js
│ ├── services/sseService.js
│ └── utils/heartbeat.js
│
└── seeds/init.sql

---

## ⚙️ Environment Variables (.env)

DATABASE_URL=postgresql://user:password@db:5432/eventsdb
PORT=8080

---

## 🐳 Docker Setup

Run the project using:

docker-compose up --build

---

## 🗄️ Database Schema

### events table

CREATE TABLE events (
id BIGSERIAL PRIMARY KEY,
channel VARCHAR(255) NOT NULL,
event_type VARCHAR(255) NOT NULL,
payload JSONB NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_channel_id ON events(channel, id);

### user_subscriptions table

CREATE TABLE user_subscriptions (
user_id INT NOT NULL,
channel VARCHAR(255) NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
PRIMARY KEY (user_id, channel)
);

---

## 🔌 API Endpoints

### 1. Publish Event

POST /api/events/publish

Body:
{
"channel": "alerts",
"eventType": "SYSTEM_ALERT",
"payload": { "message": "Hello SSE" }
}

Response:
202 Accepted

---

### 2. Subscribe

POST /api/events/channels/subscribe

Body:
{
"userId": 1,
"channel": "alerts"
}

Response:
{
"status": "subscribed",
"userId": 1,
"channel": "alerts"
}

---

### 3. Unsubscribe

POST /api/events/channels/unsubscribe

Body:
{
"userId": 1,
"channel": "alerts"
}

---

### 4. SSE Stream

GET /api/events/stream?userId=1&channels=alerts

Headers:
Content-Type: text/event-stream

Event Format:
id: 1
event: SYSTEM_ALERT
data: {"message":"Hello"}

---

### 5. Event History

GET /api/events/history?channel=alerts&limit=5

---

## 🔁 SSE Replay Logic

If client reconnects with:

Header:
Last-Event-ID: 10

Server sends:

- All events where id > 10
- Then continues real-time streaming

---

## ❤️ Heartbeat Mechanism

Every 30 seconds:

: heartbeat

Prevents connection timeout.

---

## 🧪 Testing

### Start server

docker-compose up --build

---

### Connect SSE

curl --no-buffer "http://localhost:8080/api/events/stream?userId=1&channels=alerts"

---

### Publish event

curl -X POST http://localhost:8080/api/events/publish \
-H "Content-Type: application/json" \
-d '{"channel":"alerts","eventType":"SYSTEM_ALERT","payload":{"message":"Hello SSE"}}'

---

### Replay test

curl --no-buffer -H "Last-Event-ID: 1" \
"http://localhost:8080/api/events/stream?userId=1&channels=alerts"

---

## 📦 submission.json

{
"testUsers": [
{ "id": 1 },
{ "id": 2 }
]
}

---

## ✅ Verification Checklist

- docker-compose up works
- Database tables created
- Events stored in DB
- SSE streaming works
- Replay works
- Heartbeat received
- Subscription logic works

---

## ⚡ Key Learnings

- SSE vs WebSockets
- Real-time systems design
- Persistent event storage
- Dockerized backend services
- Handling long-lived HTTP connections

---

## 👩‍💻 Author

Tanuja Devi Dadisetty

---

## 📌 Conclusion

This project demonstrates how to build a scalable, reliable real-time notification system using SSE with persistence and replay, suitable for production-level applications.
