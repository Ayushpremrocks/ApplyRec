# ApplyRec Spring Boot Backend

Spring Boot 3 / Java 17 REST API for ApplyRec. See the [root README](../README.md) for the
full environment-variable reference, API table and deployment guide.

## Run locally

```bash
export SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/applyrec'
export SPRING_DATASOURCE_USERNAME='postgres'
export SPRING_DATASOURCE_PASSWORD='postgres'
export JWT_SECRET="$(openssl rand -base64 48)"   # >= 32 bytes required
export SPRING_PROFILES_ACTIVE=dev
./mvnw spring-boot:run
```

Starts on `http://localhost:8080`. Set `APP_DEV_SEED_ENABLED=true` (with the `dev` profile)
to seed `test@applyrec.com / test123` into an empty database.

## Test

```bash
./mvnw test
```

Unit and MockMvc tests use mocks. The `*IT` integration tests (migrations on production-like
data, full API flows, password reset, reminders) run against an embedded PostgreSQL 18 that Maven
downloads once; no Docker or local database is required, and no remote database is touched.

## Build

```bash
./mvnw clean package          # -> target/app.jar
docker build -t applyrec-api . # production image (non-root, SPRING_PROFILES_ACTIVE=prod)
```

## Design notes

- Errors: services throw typed exceptions (`NotFoundException`, `BadRequestException`,
  `ConflictException`, `UnauthorizedException`); `GlobalExceptionHandler` turns them and all
  framework errors into `{"error": "..."}` JSON.
- Security: stateless JWT; unauthenticated requests get a JSON `401`. CORS origins come from
  `APP_CORS_ALLOWED_ORIGINS`.
- Schema: Flyway migrations in `src/main/resources/db/migration`; Hibernate `ddl-auto=none`.
- Email: `EmailSender` is Resend when `RESEND_API_KEY` is set, otherwise a logger (bodies are only
  logged with the `dev` profile). Reminder job: `InterviewReminderService` (every 10 min, 24h lookahead).
- Rate limits: `RateLimiter` (in-memory, per instance) — failed logins per email, auth calls per IP.
