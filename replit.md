# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is **Clipup** — an office messaging app like Telegram, with real-time conversations, departments, channels, notifications, and file sharing.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: express-session + bcryptjs
- **File uploads**: multer (stored in `artifacts/api-server/uploads/`)
- **Frontend**: React + Vite + Tailwind CSS + React Query

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/clipup run dev` — run frontend locally

## Clipup Features

- **Authentication**: Login/Register with username+password (session-based)
- **Departments**: HR, Finance, Engineering, Marketing, Operations — full CRUD
- **Channels**: Public, private, and direct message channels per department
- **Messaging**: Real-time chat (polling every 3s), message edit/delete, file attachments
- **File Uploads**: Upload files in channels, preview images inline
- **Emoji Reactions**: React to messages with emoji reactions
- **Notifications**: Bell icon with unread count, mark as read
- **Dashboard**: Stats overview and recent activity feed
- **User Status**: Online/Away/Busy/Offline indicators

## Seed Accounts

- Username: `admin`, Password: `secret` (Admin)
- Username: `aung_thu`, Password: `secret` (Engineering)
- Username: `may_thu`, Password: `secret` (HR)
- Username: `kyaw_zin`, Password: `secret` (Finance)
- Username: `su_mon`, Password: `secret` (Marketing)

## Database Schema

Tables: `users`, `departments`, `channels`, `channel_members`, `messages`, `notifications`, `files`

## Architecture

- `artifacts/clipup/` — React + Vite frontend
- `artifacts/api-server/` — Express 5 REST API backend
- `lib/api-spec/openapi.yaml` — Single source of truth for API contract
- `lib/api-client-react/` — Generated React Query hooks (do not edit manually)
- `lib/api-zod/` — Generated Zod validation schemas (do not edit manually)
- `lib/db/` — Drizzle ORM database client and schema

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
