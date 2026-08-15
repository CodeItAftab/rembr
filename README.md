# Rembr

> Never miss a task again.

Rembr scans your email for task-related deadlines, converts them into structured tasks, and reminds you before they're due — so nothing important gets buried in your inbox.

## Status

🚧 In active development — Stage 0 (project setup)

## Tech stack

- **App:** React Native + Expo
- **Backend:** Supabase (Postgres + Auth)
- **Queue:** Upstash QStash
- **Cache:** Upstash Redis
- **CI/CD:** GitHub Actions
- **Testing:** Vitest (unit) + Playwright (e2e)

## Build stages

- [x] Stage 0 — Foundations & project setup
- [x] Stage 1 — Auth & app skeleton
- [x] Stage 2 — Gmail sync (on-demand)
- [ ] Stage 3 — Task extraction
- [ ] Stage 4 — Scheduled polling (cron)
- [ ] Stage 5 — Notifications & reminders
- [ ] Stage 6 — Polish for MVP

## Local development

```bash
npm install
npx expo start
```

## License

TBD