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

Tests use mocks and MockMvc slices; no database is needed.

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
