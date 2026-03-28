CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    channel VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_channel_id_idx ON events (channel, id);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id INTEGER NOT NULL,
    channel VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, channel)
);

INSERT INTO users (id, username) VALUES 
(1, 'user1'), 
(2, 'user2') 
ON CONFLICT DO NOTHING;

INSERT INTO user_subscriptions (user_id, channel) VALUES 
(1, 'alerts'),
(1, 'notifications'),
(2, 'alerts') 
ON CONFLICT DO NOTHING;

INSERT INTO events (channel, event_type, payload) VALUES
('alerts', 'SYSTEM_ALERT', '{"message": "System starting up"}'),
('notifications', 'USER_NOTIFICATION', '{"message": "Welcome user1"}'),
('alerts', 'SYSTEM_ALERT', '{"message": "All systems go"}');