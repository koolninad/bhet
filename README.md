# Amrut Bhet

Self-hosted video conferencing built on LiveKit. A Google Meet alternative that runs entirely on your own infrastructure.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, LiveKit React SDK, Tailwind CSS |
| Backend | Fastify, LiveKit Server SDK, PostgreSQL |
| Real-time | Fastify WebSocket, LiveKit Data Channels |
| SFU | LiveKit Server (self-hosted) |
| Recording | LiveKit Egress |
| Transcription | faster-whisper (CPU) |
| TURN/STUN | coturn |
| Monorepo | pnpm + Turborepo |

## Features

- Audio/video calls with screen sharing
- Live chat with WebSocket
- Raise hand with visual indicators
- Host controls: mute all, kick, approve/deny
- Background blur (browser-based, no GPU)
- Emoji reactions via data channels
- Live transcription (Whisper)
- Meeting recording (LiveKit Egress)
- Speaker view + grid view toggle
- Pin participant
- Device selection (mic, camera, speaker)
- Network quality indicator
- Notification sounds (join/leave/hand raise)
- Recording playback page
- Mobile responsive control bar

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis
# Then start backend + frontend
cd apps/server && pnpm dev
cd apps/web && pnpm dev
```

## Docker Compose (Full Stack)

```bash
cd infra
cp .env.example .env  # edit secrets
docker compose up -d
```

## Project Structure

```
bhet/
├── apps/
│   ├── web/          # Next.js frontend
│   └── server/       # Fastify backend
├── packages/
│   └── shared/       # TypeScript types
├── infra/            # Docker, nginx, LiveKit configs
└── e2e/              # Playwright tests
```

## License

Private - All rights reserved.
