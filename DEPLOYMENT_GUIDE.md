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

## 5. Docker (local)

Docker Compose reads variable substitution values from a `.env` file beside
`docker-compose.yml`, not from `backend/.env`. Create the root file without
committing it:

```powershell
Copy-Item backend/.env .env
```

Then start the service:

```powershell
docker compose up -d --build
```

Uploads are stored in the `jansetu_uploads` volume. Application data is stored in MongoDB Atlas and should be backed up through Atlas backup policies.

## 6. Hostinger VPS Docker Manager

Use **VPS -> Docker Manager -> Projects -> Compose -> Compose from URL**. The
source must be the direct Compose-file URL, not the repository home page:

```text
https://raw.githubusercontent.com/aditya1122git/jansetu/main/docker-compose.yml
```

Use a simple project name such as `jansetu-bihar`. The GitHub repository must
be public for an unauthenticated raw URL. For a private repository, either make
the file/repository accessible to Hostinger or deploy with Hostinger's GitHub
Action and a personal access token.

Set these variables in the Hostinger project environment before starting or
redeploying the container:

```dotenv
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace-with-a-long-random-secret
MAX_UPLOAD_SIZE_MB=200
APP_PORT=5000
```

Do not paste `backend/.env` into Git or commit production secrets.

### Fix `Docker project not found`

This message means the Docker Manager has no successfully created project to
deploy. Return to **Docker Manager -> Projects**, remove the failed card if it
exists, and create a new Compose project using the direct URL above. Do not use
the old deployment/preview page after project creation has failed.

If creation still fails, open **Web Console** and inspect:

```sh
cat /docker/jansetu-bihar/.build.log
```

## 7. Production notes

- Keep `ALLOW_DEMO_LOGIN=false`.
- Use HTTPS through the supplied Nginx reverse-proxy configuration.
- Restrict the Atlas network allowlist to the production server.
- Rotate `JWT_SECRET`, database credentials and admin credentials through your secret manager.
