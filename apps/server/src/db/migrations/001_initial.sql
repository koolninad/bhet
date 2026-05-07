BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS rooms (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                TEXT NOT NULL UNIQUE,
    host_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    scheduled_at        TIMESTAMPTZ,
    duration_minutes    INTEGER,
    max_participants    INTEGER NOT NULL DEFAULT 25,
    password_hash       TEXT,
    recording_enabled   BOOLEAN NOT NULL DEFAULT false,
    transcription_enabled BOOLEAN NOT NULL DEFAULT false,
    status              TEXT NOT NULL DEFAULT 'active',
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_host ON rooms (host_id);
CREATE INDEX idx_rooms_slug ON rooms (slug);
CREATE INDEX idx_rooms_status ON rooms (status);
CREATE INDEX idx_rooms_scheduled_at ON rooms (scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
    identity        TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'guest',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at         TIMESTAMPTZ,
    UNIQUE (room_id, identity)
);

CREATE INDEX idx_participants_room ON participants (room_id);
CREATE INDEX idx_participants_user ON participants (user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              BIGSERIAL PRIMARY KEY,
    room_id         UUID NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    sender_identity TEXT NOT NULL,
    message         TEXT NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_room ON chat_messages (room_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS recordings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    egress_id       TEXT,
    room_name       TEXT NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at        TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'pending',
    file_path       TEXT,
    file_size_bytes BIGINT,
    duration_secs   INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recordings_room ON recordings (room_id);
CREATE INDEX idx_recordings_status ON recordings (status);

CREATE TABLE IF NOT EXISTS transcriptions (
    id              BIGSERIAL PRIMARY KEY,
    room_id         UUID NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    participant_id  UUID REFERENCES participants (id) ON DELETE SET NULL,
    speaker_label   TEXT NOT NULL DEFAULT 'unknown',
    text            TEXT NOT NULL,
    language        TEXT NOT NULL DEFAULT 'auto',
    confidence      REAL,
    segment_start   REAL,
    segment_end     REAL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transcriptions_room ON transcriptions (room_id, segment_start);

COMMIT;
