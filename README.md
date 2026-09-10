# لقاء (Liqaa) — Frontend

![Angular](https://img.shields.io/badge/Angular-21.2-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)

**لقاء** is an Arabic-first web application that helps communities in Egypt report missing-person cases, publish found-person updates, communicate securely, and use AI-assisted face matching to reconnect people with their families.

This is the **frontend repository**. It contains the Angular SPA only; the REST API, database, background jobs, AWS integrations, and payments are maintained in a separate backend repository.

## Contents

- [Features](#features)
- [Roles and case rules](#roles-and-case-rules)
- [Technology and architecture](#technology-and-architecture)
- [Project structure](#project-structure)
- [Routes](#routes)
- [Local setup](#local-setup)
- [Backend integration](#backend-integration)
- [Scripts and security](#scripts-and-security)
- [Future work](#future-work)

## Features

### Public and account experience

- Arabic home, platform guide, privacy policy, found-person gallery, and case listings.
- Email/password registration, email-confirmation OTP, password reset, login, restored sessions, and Google sign-in.
- Profile, avatar, phone, home/current location, and visited-profile management.
- National-ID front/back upload for the verified-user request flow.
- Protected routes plus dedicated access-denied and not-found pages.

### Cases and AI

- Browse, filter, inspect, create, edit, and follow Urgent, Long-Term, and Unknown cases according to the current user's permissions.
- Image/video attachment forms, client-side validation, and API-provided duplicate-detection feedback.
- AI face-search interface backed by AWS Rekognition through the API.
- Duplicate-group history for matching Unknown cases and found-person case pages.

### Communication and administration

- Real-time SignalR chat, chat lists, read states, and case-context chat entry points.
- SignalR in-app notifications.
- Guest donation flow with result, success, and failure pages.
- Complaint submission plus permission-controlled administration screens for dashboards, users, roles, cases, donations, complaints, audit logs, and chat monitoring.

## Roles and case rules

The backend is the authorization source of truth. The SPA mirrors it with route guards and permission-aware UI.

| Role | Main access |
| --- | --- |
| `User` | Urgent cases, chat, permitted AI search, donations, and complaints. |
| `VerifiedUser` | A user whose ID was approved by an administrator; can additionally create Long-Term and Unknown cases. |
| `Moderator` | Moderation access assigned through permissions. |
| `Admin` | User, case, complaint, donation, report, role, and chat administration according to permissions. |
| `SuperAdmin` | Highest administrative access. |

| Case type | Creator | Publishing rule |
| --- | --- | --- |
| Urgent | Any authenticated user | Published immediately; expires after 48 hours; one creation per 14 days per user. |
| Long-Term | Verified user | Requires administrative approval. |
| Unknown | Verified user | Requires administrative approval; matching submissions can be grouped and the newest update is public. |

The API checks face images against AWS Rekognition before case creation. The UI shows the blocking/warning results and supports business-rule-approved force-create flows.

## Technology and architecture

| Area | Implementation |
| --- | --- |
| Framework | Angular 21.2, standalone components, lazy-loaded routes |
| Language/state | TypeScript 5.9, Angular Signals, RxJS 7.8 |
| Forms | Reactive Forms and Arabic/Egyptian-ID validators |
| Real time | `@microsoft/signalr` |
| Authentication | JWT decoding/interceptor, auth and permission guards, Google login |
| Maps | Leaflet, Google Maps types, geocoding/location services |
| UI | Tailwind CSS 4, Font Awesome, Prime Icons, SweetAlert2, image cropper |
| Testing | Vitest via Angular's unit-test builder |

```text
Browser
  └─ Angular standalone application
       ├─ core/     configuration, guards, interceptors, layouts, global services
       ├─ shared/   reusable components, directives, pipes, validators, helpers
       └─ features/ independently routed product areas
              ├─ public, auth, user-profile
              ├─ urgent-cases, long-term-cases, unknown-cases, founded
              ├─ ai-search, chat, donations, complaints
              └─ admin-dashboard
                    ├─ REST API over HTTPS
                    └─ SignalR hubs for notifications and chat
```

`app.config.ts` registers scroll-restored routing, JWT and global-loading interceptors, Arabic locale data, Google login, and a startup session check.

## Project structure

```text
src/
├─ app/
│  ├─ core/
│  │  ├─ cache/          request/state caching helpers
│  │  ├─ constants/      permissions, API paths, governorates, dictionaries
│  │  ├─ guards/         authentication and permission guards
│  │  ├─ interceptors/   JWT and global loading
│  │  ├─ layouts/        main, authentication, and administration layouts
│  │  ├─ models/         API/domain response models
│  │  ├─ pages/          403 and 404 pages
│  │  └─ services/       auth, notification, location, geocoding, and shared services
│  ├─ shared/            reusable UI, directives, pipes, helpers, and validators
│  ├─ features/          routed business features
│  ├─ app.config.ts      root providers
│  └─ app.routes.ts      root routes
├─ environments/         development and production endpoint configuration
├─ main.ts               bootstrap entry point
└─ styles.css            global styles
```

## Routes

| Path | Area | Access |
| --- | --- | --- |
| `/`, `/home`, `/about`, `/privacy-policy` | Platform information | Public |
| `/auth/login`, `/auth/register`, `/auth/confirm-email`, `/auth/forgot-password` | Identity | Public |
| `/urgent`, `/long-term`, `/unknown`, `/founded` | Case experiences | Public listing/details; mutations are guarded |
| `/aisearch` | AI face search | API authorization applies |
| `/profile`, `/chat` | Personal profile and chat | Authenticated |
| `/donation` | Donation and payment result | Public |
| `/admin` | Administration | Permission guarded |

Exact permission names are defined in `src/app/core/constants/Permissions`; the backend enforces them for every sensitive operation.

## Local setup

### Prerequisites

- Node.js 20+
- npm 10+ (the project records npm 11.6.2)
- A running Liqaa backend API and its SignalR hubs

### Install and run

```bash
git clone <your-frontend-repository-url>
cd SafeTrace-Angular21
npm install
npm start
```

`npm start` runs `ng serve --ssl --open`, normally at `https://localhost:4200/`.

### Configure endpoints

Set local values in `src/environments/environment.development.ts`:

```ts
export const environment = {
  production: false,
  baseUrl: 'https://localhost:7041',
  apiBaseUrl: 'https://localhost:7041/api',
  filesBaseUrl: 'https://<your-s3-bucket>.s3.amazonaws.com',
  signalRHubUrl: 'https://localhost:7041/SafeTrace.Application/Hubs/notifications',
  chatHubUrl: 'https://localhost:7041/chatHub',
  googleMapsApiKey: '<restricted-browser-key>',
  googleClientId: '<google-oauth-client-id>',
};
```

Set production equivalents in `environment.production.ts`, then run `npm run build`; Angular writes the optimized output to `dist/`.

## Backend integration

The SPA expects:

- REST endpoints rooted at `/api`.
- Notification hub: `/SafeTrace.Application/Hubs/notifications`.
- Chat hub: `/chatHub`.
- CORS permission for the SPA's HTTPS origin and credentials.
- JWT access-token authentication and refresh-token cookie support.

The supplied local settings match the backend HTTPS launch profile at `https://localhost:7041`; the backend CORS configuration includes `https://localhost:4200`.

## Scripts and security

| Command | Purpose |
| --- | --- |
| `npm start` | Start the SSL development server and open the browser. |
| `npm run build` | Create a production build. |
| `npm run watch` | Build continuously using development settings. |
| `npm test` | Run unit tests. |

- Frontend guards are UX controls, not security boundaries: the API must authorize every action.
- Never commit AWS credentials, payment or SMTP secrets, OAuth secrets, or unrestricted Google Maps keys.
- Restrict browser-facing Maps keys by allowed referrer and use HTTPS for authentication, cookies, uploads, and SignalR.

## Future work

| Feature | Priority | Notes |
| --- | --- | --- |
| Governmental integration | High | Surface cross-checks against local police missing-persons databases in the case UI. |
| Progressive Web App (PWA) | Medium | Installable app experience with push notifications. |

## 👥 Team Members

| Name                   | GitHub                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| Esraa Taha             | [@Gargera](https://github.com/Gargera)                           |
| Yousef Abdullah        | [@yousef721](https://github.com/yousef721)                       |
| Basma Allaa            | [@basmaallaa](https://github.com/basmaallaa)                     |
| Mohamed Gamal Elemam   | [@Mohamed-Gamal-Elemam](https://github.com/Mohamed-Gamal-Elemam) |
| Amany Hisham           | [@amanyhisham](https://github.com/amanyhisham)                   |
| Yousef Farouk          | [@ysfrk10](https://github.com/ysfrk10)                           |
| Toqa Mahmoud           | [@ToqaMahmoud787](https://github.com/ToqaMahmoud787)             |
| Mohamed Saeed          | [@Mohmaed-Saaed](https://github.com/Mohmaed-Saaed)               |


---

ITI Full Stack .NET & Generative AI graduation project, 2026.
