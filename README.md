# Chaos Proxy

A hand-built HTTP proxy (Node.js + TypeScript) that sits between a client and a backend service, capable of injecting realistic network faults (delays, failures, gradual degradation) for chaos-engineering-style testing.

## Status: Work in progress

## Architecture
- `target-service/` — a stand-in backend the proxy forwards requests to
- `proxy/` — the core chaos proxy (in progress)
- `control-api/` — REST API to configure chaos rules (coming soon)
- `dashboard/` — live React dashboard (coming soon)