# ApplyRec 📋

> A full-stack job application tracker — log, filter, and manage every application in one place.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

**ApplyRec** helps job seekers track applications from start to finish. It provides a Kanban-style board and a grid view, with search, filtering and sorting.

---

## Features

- 🔐 **JWT Authentication** — signup / login with token-based sessions; expired sessions redirect to login
- 📋 **Kanban Board** — drag cards between status columns (optimistic updates with rollback on failure)
- 📊 **Statistics** — totals per status across all your applications
- ➕ **Application Management** — create, edit and delete applications
- 🔍 **Search & Filter** — by company, status, role and salary range (LPA, decimals supported); multiple sort orders
- 🎉 **Celebration Modal** — when you land an offer
- 📦 **Dockerised Backend** — non-root, memory-aware Spring Boot image

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router 7, Vite 6, CSS Modules, Vitest |
| **Backend** | Spring Boot 3.2, Java 17, Spring Security |
| **Database** | PostgreSQL (Flyway migrations) |
| **Auth** | JWT (JJWT 0.11.5, HS256) |
| **Build** | Maven (wrapper included) |
| **Hosting** | Vercel (frontend), Render (backend, Docker) |

---

## Project Structure

```
ApplyRec/
├── Backend/                         # Spring Boot API
│   ├── src/main/java/com/applyrec/
│   │   ├── config/                  # Security, CORS, dev seed data
│   │   ├── controller/              # REST endpoints
│   │   ├── dto/                     # Request/response records
│   │   ├── entity/                  # JPA entities
│   │   ├── exception/               # Typed exceptions + global JSON error handler
│   │   ├── repository/              # Spring Data repositories
│   │   ├── security/                # JWT filter/service
│   │   └── service/                 # Business logic
│   ├── src/main/resources/db/migration/   # Flyway SQL migrations
│   ├── src/test/                    # Unit + MVC slice tests
│   ├── Dockerfile
│   ├── mvnw / mvnw.cmd
│   └── pom.xml
└── Frontend/                        # React (Vite) app
    ├── index.html
    ├── vite.config.js
    ├── vercel.json
    └── src/
        ├── components/              # UI components
        ├── pages/                   # Landing, Login, Signup, Dashboard
        ├── services/                # API client
        └── utils/                   # Date + filtering helpers
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Java | 17+ |
| Node.js | 20+ |
| PostgreSQL | 14+ (local or hosted) |

Maven is not required — use the bundled `./mvnw` (or `mvnw.cmd` on Windows).

### Backend

```bash
cd Backend
export SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/applyrec'
export SPRING_DATASOURCE_USERNAME='postgres'
export SPRING_DATASOURCE_PASSWORD='postgres'
export JWT_SECRET="$(openssl rand -base64 48)"   # must be >= 32 bytes
export SPRING_PROFILES_ACTIVE=dev
# Optional: seed a demo account (test@applyrec.com / test123) into an EMPTY database
export APP_DEV_SEED_ENABLED=true
./mvnw spring-boot:run
```

PowerShell equivalent: `$env:JWT_SECRET = "..."` etc., then `.\mvnw.cmd spring-boot:run`.

The API listens on `http://localhost:8080`.

### Frontend

```bash
cd Frontend
npm install
cp .env.example .env      # optional; defaults to http://localhost:8080/api
npm run dev
```

The app is served at `http://localhost:3000`.

---

## Testing

```bash
cd Backend && ./mvnw test     # JUnit + MockMvc (no database needed)
cd Frontend && npm test       # Vitest
```

---

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `SPRING_DATASOURCE_URL` | ✅ | JDBC URL, e.g. `jdbc:postgresql://host:5432/db?sslmode=require` (**not** `postgres://…`) |
| `SPRING_DATASOURCE_USERNAME` | ✅ | Database user |
| `SPRING_DATASOURCE_PASSWORD` | ✅ | Database password |
| `JWT_SECRET` | ✅ | ≥ 32 bytes; the app refuses to start otherwise. Generate: `openssl rand -base64 48` |
| `APP_CORS_ALLOWED_ORIGINS` | ✅ in prod | Comma-separated frontend origins (patterns allowed), e.g. `https://applyrec.vercel.app` |
| `SPRING_PROFILES_ACTIVE` | | `prod` in production (default in the Docker image), `dev` locally |
| `APP_DEV_SEED_ENABLED` | | `true` seeds a demo account — only honoured with the `dev` profile. Never set in prod |
| `DB_POOL_SIZE` | | Max DB connections in `prod` (default `5`) |
| `PORT` | | HTTP port (default `8080`; set automatically by Render) |
| `JAVA_OPTS` | | JVM flags (Docker image defaults to `-XX:MaxRAMPercentage=75 …`) |

### Frontend

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend base URL including `/api`. Baked in at **build time** — redeploy after changing. | `http://localhost:8080/api` |

---

## API Reference

All `/api/applications/**` endpoints require `Authorization: Bearer <token>`.
Errors are always JSON: `{"error": "message"}` with an appropriate status (400, 401, 404, 409, 500).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/signup` | No | Register (`email`, `password` 6–72 chars) → `201` + token |
| `POST` | `/api/auth/login` | No | Login → token |
| `POST` | `/api/applications` | Yes | Create → `201` + `application` |
| `GET` | `/api/applications` | Yes | List; optional `status`, `role`, `minSalary`, `maxSalary` (decimals) |
| `GET` | `/api/applications/roles` | Yes | Distinct roles |
| `GET` | `/api/applications/{id}` | Yes | Get one |
| `PUT` | `/api/applications/{id}` | Yes | Update → `application` |
| `PATCH` | `/api/applications/{id}/status` | Yes | Update status only → `application` |
| `DELETE` | `/api/applications/{id}` | Yes | Delete |

Salary is stored in LPA as `DECIMAL(6,2)` (0 – 9999.99).

---

## Deployment

### 1. Database
Create a PostgreSQL database (Neon, Render Postgres, Supabase…). Convert the provider's
`postgres://user:pass@host:port/db` URL to `jdbc:postgresql://host:port/db?sslmode=require`
and pass the user/password separately. Flyway creates the schema on first start.

### 2. Backend — Render (Docker)
1. New **Web Service** → connect the repo → **Root Directory** `Backend`, runtime **Docker**.
2. Health check path: `/api/health`.
3. Environment: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`,
   `JWT_SECRET`, `APP_CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app`.
   (`SPRING_PROFILES_ACTIVE=prod` is already set in the image.)

Any Docker host works the same way:
```bash
docker build -t applyrec-api Backend
docker run -p 8080:8080 --env-file prod.env applyrec-api
```

### 3. Frontend — Vercel
1. Import the repo → **Root Directory** `Frontend` (framework auto-detected as Vite).
2. Environment variable: `VITE_API_URL=https://<your-render-service>.onrender.com/api`.
3. Deploy. `vercel.json` handles SPA routing and caching headers.

After the frontend URL is known, make sure it is in the backend's `APP_CORS_ALLOWED_ORIGINS`.

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Run both test suites before pushing
3. Open a Pull Request

---

> Made with ☕ and determination.
