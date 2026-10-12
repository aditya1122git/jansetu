# JanSetu Bihar — Deployment Guide

## Project structure

- `frontend/` — React + Vite user interface
- `backend/` — Express API with the official MongoDB Node.js driver
- `backend/uploads/` — uploaded supporting documents

## 1. Configure MongoDB Atlas

1. In Atlas, create a database user and allow the deployment server IP in **Network Access**.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set `MONGODB_URI` to the Atlas connection string. Keep the database name in the URI, for example `jansetu`.
4. Set a long, random `JWT_SECRET`.

Do not commit `backend/.env`; it is ignored by Git.

## 2. Install and initialize

```powershell
npm.cmd run install:all
npm.cmd run db:setup
npm.cmd run build
```

`db:setup` creates the required MongoDB indexes directly through the MongoDB driver.

## 3. One-time administrator seed

Add these values to `backend/.env` before seeding:

```dotenv
ADMIN_EMAIL="admin@jansetu.com"
ADMIN_PASSWORD="use-a-strong-password-of-at-least-8-characters"
```

Then run:

```powershell
npm.cmd run db:seed-admin
```

The command is intentionally idempotent: if that email already exists, it exits without changing the existing account or password.

## 4. Run locally

```powershell
npm.cmd start
```

Open `http://localhost:5000`. During frontend development, run `npm.cmd run dev:frontend` in another terminal; Vite proxies `/api` to port 5000.

## 5. Docker

The Compose service reads secrets from `backend/.env`:

```powershell
docker compose up -d --build
```

Uploads are stored in the `jansetu_uploads` volume. Application data is stored in MongoDB Atlas and should be backed up through Atlas backup policies.

## 6. Production notes

- Keep `ALLOW_DEMO_LOGIN=false`.
- Use HTTPS through the supplied Nginx reverse-proxy configuration.
- Restrict the Atlas network allowlist to the production server.
- Rotate `JWT_SECRET`, database credentials and admin credentials through your secret manager.
