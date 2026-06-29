# ApplyRec 📋

> A full-stack job application tracker — log, filter, and manage every application in one place.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

**ApplyRec** is a full-stack web application that helps job seekers track their job applications from start to finish. It provides a Kanban-style board view and a list view to organise applications by status, with search, filtering, and sorting capabilities.

---

## Features

- 🔐 **JWT Authentication** — Secure signup / login with token-based sessions
- 📋 **Kanban Board** — Drag-friendly Trello-style board grouped by application status
- 📊 **Statistics Dashboard** — At-a-glance summary of total, active, and offer applications
- ➕ **Application Management** — Create, edit, and delete job applications
- 🔍 **Search & Filter** — Filter by status, role, and salary range; sort by newest / oldest
- 🎉 **Celebration Modals** — Animated modal when you land an offer
- 🔔 **Toast Notifications** — Non-intrusive success / error feedback
- 📦 **Dockerised Backend** — Ready-to-deploy Spring Boot image

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, CSS Modules |
| **Backend** | Spring Boot 3.2, Java 17, Spring Security |
| **Database** | PostgreSQL (with Flyway migrations) |
| **Auth** | JWT (JJWT 0.11.5, HMAC-SHA) |
| **ORM** | Spring Data JPA / Hibernate |
| **Build** | Maven 3 |
| **Containerisation** | Docker (multi-stage build) |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | Render |

---

## Project Structure

```
ApplyRec/
├── Backend/                     # Spring Boot application
│   ├── src/
│   │   └── main/
│   │       ├── java/com/applyrec/
│   │       └── resources/
│   ├── Dockerfile
│   └── pom.xml
└── Frontend/                    # React application
    ├── public/
    └── src/
        ├── components/          # Reusable UI components
        │   ├── ApplicationCard
        │   ├── ApplicationForm
        │   ├── AdvancedFilters
        │   ├── CelebrationModal
        │   ├── FilterBar
        │   ├── OfferModal
        │   ├── SearchBar
        │   ├── SortOptions
        │   ├── Statistics
        │   ├── Toast
        │   └── TrelloBoard
        ├── pages/               # Route-level pages
        │   ├── Landing
        │   ├── Login
        │   ├── Signup
        │   └── Dashboard
        └── services/            # API service layer
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Java | 17+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ |

---

### Backend Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/<your-username>/ApplyRec.git
   cd ApplyRec/Backend
   ```

2. **Configure environment variables** (see [Environment Variables](#environment-variables))

3. **Run the application**

   ```bash
   mvn spring-boot:run
   ```

   The API will be available at `http://localhost:8080`.

4. **Or build and run the JAR**

   ```bash
   mvn clean package -DskipTests
   java -jar target/applyrec-backend-0.0.1-SNAPSHOT.jar
   ```

---

### Frontend Setup

1. **Navigate to the frontend directory**

   ```bash
   cd ApplyRec/Frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Edit .env and set REACT_APP_API_URL if needed
   ```

4. **Start the development server**

   ```bash
   npm start
   ```

   The app will be available at `http://localhost:3000`.

---

## Environment Variables

### Backend

| Variable | Description | Example |
|---|---|---|
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://host:5432/dbname?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `db_user` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `db_password` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `a-long-random-secret` |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | `dev` or `prod` |

### Frontend

| Variable | Description | Default |
|---|---|---|
| `REACT_APP_API_URL` | Base URL for the backend API | `http://localhost:8080/api` |

---

## API Reference

All application endpoints require the `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/signup` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Login and receive JWT |
| `POST` | `/api/applications` | Yes | Create a new application |
| `GET` | `/api/applications` | Yes | List all applications for the user |
| `GET` | `/api/applications/roles` | Yes | List distinct roles from saved applications |
| `GET` | `/api/applications/{id}` | Yes | Get a single application |
| `PUT` | `/api/applications/{id}` | Yes | Update an application |
| `PATCH` | `/api/applications/{id}/status` | Yes | Update application status only |
| `DELETE` | `/api/applications/{id}` | Yes | Delete an application |

---

## Deployment

### Backend — Render (Docker)

1. Connect your GitHub repository to a new **Render Web Service**.
2. Select **Docker** as the runtime — Render will use `Backend/Dockerfile` automatically.
3. Set the following environment variables in the Render dashboard:

   | Variable | Value |
   |---|---|
   | `SPRING_DATASOURCE_URL` | Your PostgreSQL connection string |
   | `SPRING_DATASOURCE_USERNAME` | Database username |
   | `SPRING_DATASOURCE_PASSWORD` | Database password |
   | `JWT_SECRET` | A strong, random secret |
   | `SPRING_PROFILES_ACTIVE` | `prod` |

   > **Note:** Render automatically injects the `PORT` environment variable. The app binds to `${PORT:8080}` by default.

### Frontend — Vercel

1. Import the repository into **Vercel** and set the **Root Directory** to `Frontend`.
2. Add the following environment variable:

   | Variable | Value |
   |---|---|
   | `REACT_APP_API_URL` | `https://<your-render-service>.onrender.com/api` |

3. Deploy — Vercel will run `npm run build` automatically.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

> Made with ☕ and determination.
