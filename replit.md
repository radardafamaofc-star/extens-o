# PromptPro Admin Console

## Overview

PromptPro is an admin dashboard for managing activation codes for a browser extension called "Lovable Prompt Improver." The extension uses AI to rewrite and enhance user prompts. This web app provides an authenticated admin panel where authorized users can generate, view, copy, and revoke activation codes (licenses) for the extension. It also serves the extension as a downloadable ZIP file.

The project follows a full-stack TypeScript monorepo pattern with a React frontend, Express backend, PostgreSQL database, and Replit Auth for authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a three-directory monorepo layout:
- **`client/`** — React single-page application (frontend)
- **`server/`** — Express.js API server (backend)
- **`shared/`** — Shared TypeScript types, schemas, and route definitions used by both client and server

### Frontend (`client/`)
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (dark theme by default — deep blue/purple palette)
- **Fonts**: Plus Jakarta Sans (body) and Outfit (display)
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (`server/`)
- **Framework**: Express.js running on Node.js
- **Language**: TypeScript, executed via `tsx` in development
- **Authentication**: Replit Auth (OpenID Connect via `openid-client` and Passport.js) with session storage in PostgreSQL via `connect-pg-simple`
- **API Design**: REST API with routes defined in `shared/routes.ts` using Zod schemas for input validation and response typing
- **Build**: esbuild for production bundling into `dist/index.cjs`; Vite for client build into `dist/public/`

### Database
- **Database**: PostgreSQL (required — `DATABASE_URL` environment variable must be set)
- **ORM**: Drizzle ORM with `drizzle-kit` for schema management
- **Schema Location**: `shared/schema.ts` and `shared/models/` directory
- **Key Tables**:
  - `users` — Stores authenticated user profiles (required for Replit Auth)
  - `sessions` — Stores session data (required for Replit Auth, do not drop)
  - `activation_codes` — License codes with expiry dates and active/revoked status
  - `conversations` / `messages` — Chat/conversation storage (from Replit AI integrations, may or may not be actively used)
- **Schema Push**: Use `npm run db:push` (runs `drizzle-kit push`) to sync schema to database

### Authentication Flow
- Replit Auth handles login/logout via `/api/login` and `/api/logout` endpoints
- Sessions are stored in the PostgreSQL `sessions` table
- The `isAuthenticated` middleware protects admin API routes
- Frontend checks auth state via `/api/auth/user` endpoint and redirects unauthenticated users to login

### API Routes
All API routes are prefixed with `/api/`:
- `GET /api/auth/user` — Get current authenticated user
- `GET /api/codes` — List all activation codes (authenticated)
- `POST /api/codes` — Create a new activation code with configurable expiry (authenticated)
- `POST /api/codes/:id/revoke` — Revoke an activation code (authenticated)
- `GET /api/extension/download` — Download the browser extension as a ZIP
- `POST /api/codes/validate` — Validate an activation code (used by the extension)
- `POST /api/improve` — AI prompt improvement endpoint using OpenAI

### Replit Integrations (`server/replit_integrations/`)
Pre-built integration modules provided by Replit:
- **`auth/`** — Replit Auth with OpenID Connect, Passport.js, session management
- **`chat/`** — Conversation and message CRUD with OpenAI streaming
- **`audio/`** — Voice recording, transcription, and text-to-speech via OpenAI
- **`image/`** — Image generation via OpenAI's gpt-image-1 model
- **`batch/`** — Batch processing utility with rate limiting and retries

### Development vs Production
- **Development**: `npm run dev` runs `tsx server/index.ts` with Vite dev server middleware for HMR
- **Production**: `npm run build` builds both client (Vite) and server (esbuild), then `npm start` serves the compiled bundle
- Static files are served from `dist/public/` in production

## External Dependencies

### Required Services
- **PostgreSQL Database** — Primary data store. Must be provisioned and `DATABASE_URL` environment variable set
- **OpenAI API (via Replit AI Integrations)** — Used for prompt improvement. Configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

### Required Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Secret for session encryption
- `REPL_ID` — Replit environment identifier (auto-set on Replit)
- `ISSUER_URL` — OpenID Connect issuer URL (defaults to `https://replit.com/oidc`)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — API key for OpenAI integration
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Base URL for OpenAI integration

### Key NPM Packages
- **Frontend**: React, Wouter, TanStack React Query, Radix UI, shadcn/ui, Tailwind CSS, date-fns, lucide-react, Zod
- **Backend**: Express, Drizzle ORM, Passport, openid-client, connect-pg-simple, archiver (ZIP creation), OpenAI SDK, Zod
- **Build**: Vite, esbuild, tsx