# MoveCare AI

## Project Overview

MoveCare AI is an academic mini-project that demonstrates a digital rehabilitation platform for patients, therapists, and administrators. The application combines exercise planning, progress tracking, virtual appointments, monitoring data, notifications, and role-based access in one web application.

## Problem Statement

Traditional rehabilitation workflows can make it difficult for patients to follow home exercises, for therapists to monitor progress between consultations, and for administrators to oversee platform activity. MoveCare AI explores how a connected web platform can make rehabilitation information more accessible, measurable, and organized.

## Objectives

- Provide patients with clear exercise plans and progress records.
- Help therapists manage assigned patients, exercises, appointments, and recommendations.
- Give administrators visibility into users, therapists, exercises, appointments, and system statistics.
- Demonstrate secure authentication, role-based authorization, validation, and responsive design.

## Features

- Patient registration, login, logout, dashboard, exercise completion, progress tracking, notifications, appointments, and AI guidance.
- Therapist patient roster, patient profiles, progress review, exercise creation and assignment, appointment management, consultation history, live monitoring, and AI recommendation review.
- Admin user role management, therapist status management, exercise administration, appointment visibility, and system statistics.
- Protected frontend routes and protected backend API routes for Patient, Therapist, and Admin roles.
- MongoDB persistence with development support through MongoDB Memory Server.

## Technology Stack

- Frontend: React 19, React Router, Vite, HTML, CSS.
- Backend: Node.js, Express, ES modules.
- Database: MongoDB with Mongoose.
- Authentication: JWT and bcryptjs password hashing.
- Testing and quality checks: Vite production build, Oxlint, Node syntax checks, browser smoke tests, and isolated API integration tests.

## System Architecture

The application uses a client-server architecture:

1. The React frontend provides role-specific dashboards and sends JSON requests to the API.
2. The Express backend authenticates requests, authorizes roles, validates input, and coordinates application logic.
3. Mongoose models represent users, patient and therapist profiles, exercises, plans, appointments, progress, notifications, and monitoring sessions.
4. MongoDB stores application data. A memory database is used only for local development and testing when no database URI is configured.

## Installation

### Prerequisites

- Node.js 18 or newer.
- MongoDB for persistent development or production use.

### Setup

```bash
git clone <repository-url>
cd movecare-AI-
npm install --prefix frontend
npm install --prefix backend
```

Create the environment file described below, then start the services in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

To load sample development data:

```bash
node backend/models/seed.js
```

## Environment Variables

Create a root `.env` file. Do not commit this file.

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/movecare
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
NODE_ENV=development
```

In production, use a JWT secret of at least 32 characters, a managed MongoDB connection, and an explicit trusted frontend origin.

## API Overview

All protected endpoints require `Authorization: Bearer <token>`.

| Area | Main endpoints | Access |
|---|---|---|
| Authentication | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | Public or authenticated |
| Patient dashboard | `/api/patients/me/dashboard` | Patient |
| Exercises | `/api/exercises`, `/api/exercises/assign`, `/api/exercises/patient/assigned` | Therapist or Patient |
| Progress | `/api/progress/me`, `/api/progress/patients` | Patient or Therapist |
| Appointments | `/api/appointments`, `/api/appointments/patient`, `/api/appointments/therapist` | Patient or Therapist |
| AI | `/api/ai/recommendations`, `/api/ai/therapist/recommendations` | Patient or Therapist |
| Notifications | `/api/notifications` | Authenticated users |
| Monitoring | `/api/monitoring/patient/*`, `/api/monitoring/therapist/live` | Patient or Therapist |
| Administration | `/api/admin/overview`, `/api/admin/users/*`, `/api/admin/therapists/*`, `/api/admin/exercises/*` | Admin |

## Database Overview

The database contains the following related collections:

- `User`: identity, email, hashed password, and role.
- `Patient` and `Therapist`: role-specific profiles and assignments.
- `Exercise` and `ExercisePlan`: reusable exercises and patient plans.
- `Appointment`: consultation scheduling and status.
- `Progress`: exercise completion, pain, mobility, and notes.
- `Notification`: care updates and system messages.
- `MonitoringSession`: simulated live exercise sessions.

Mongoose schemas provide required fields, enum constraints, numeric ranges, relationships, and indexes for common progress and notification queries.

## AI Features

The recommendation service derives educational exercise suggestions from a patient's condition, age, recent pain, mobility score, and exercise history. It ranks exercises from the therapist's library and proposes a difficulty, duration, and frequency. Therapists can review recommendations for assigned patients. The AI features are decision-support demonstrations and do not diagnose conditions or replace professional clinical judgment.

## Screenshots

Screenshots can be added here for the final presentation build:

- Home page and authentication screens.
- Patient dashboard and progress charts.
- Therapist dashboard and patient progress view.
- Admin dashboard and management tables.
- Exercise and appointment workflows.

## Future Enhancements

- Integrate a production video consultation provider.
- Add therapist creation and patient assignment workflows to the admin area.
- Add automated API and browser tests to CI.
- Add audit logs, pagination, filtering, and exportable reports.
- Move authentication to secure HttpOnly cookies with refresh-token rotation.
- Integrate verified wearable or motion-sensor data instead of simulated monitoring.

## Project Documentation

- [Database schema](backend/DATABASE_SCHEMA.md)
- [Phase 14 testing report](PHASE14_TESTING_REPORT.md)