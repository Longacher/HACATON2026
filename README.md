# Отклик — платформа доверительных обращений (хакатон)

- `app/` — нативный клиент (React Native 0.87)
- `server/` — бэкенд FastAPI + PWA + docker-compose

## Быстрый старт сервера

```bash
cd server
docker compose up --build
```

Фронт: http://localhost:5173 · API: http://localhost:8000/docs

Тестовые учётки: `operator1/oper123`, `expert_psy/exp123`, `admin/admin123`.

## Приложение

```bash
cd app
npm install
npx react-native run-android
```

API-адрес: `src/api.ts` (`API_URL`: эмулятор — `http://10.0.2.2:8000`).
