# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is **Clipup** — a full-featured project management and messaging platform (ClickUp-style). Features: Projects, Tasks (kanban/list), Goals with milestones, Spaces, team Channels/messaging, Departments, Notifications, and user settings.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Build**: esbuild
- **Auth**: express-session + bcryptjs (userId stored in localStorage after login)
- **File uploads**: multer (stored in `artifacts/api-server/uploads/`)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + React Query + Wouter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/clipup run dev` — run frontend

## Architecture

### Monorepo packages
- `lib/api-spec` — OpenAPI v3.1 spec + orval codegen config
- `lib/api-client-react` — generated React Query hooks + Zod schemas
- `lib/db` — Drizzle ORM schema + PostgreSQL connection
- `artifacts/api-server` — Express 5 API server (port 8080 in dev)
- `artifacts/clipup` — React + Vite frontend (SPA)
- `artifacts/mockup-sandbox` — Component preview server for canvas design

### Database Tables
- `users` — username, displayName, email, passwordHash, role, status, departmentId
- `departments` — name, description, color
- `channels` — name, description, type (public/private/direct), departmentId
- `channel_members` — channelId, userId
- `messages` — channelId, senderId, content, reactions (jsonb), fileUrl, etc.
- `notifications` — userId, type, title, body, isRead, channelId, taskId
- `files` — filename, originalName, mimeType, size, url, channelId, uploadedBy
- `spaces` — name, description, color, icon, ownerId
- `projects` — name, description, status, priority, color, spaceId, departmentId, ownerId, startDate, dueDate
- `tasks` — title, description, status, priority, projectId, parentTaskId, assigneeId, creatorId, dueDate, estimatedHours, actualHours, tags[]
- `task_comments` — taskId, authorId, content
- `task_watchers` — taskId, userId
- `goals` — title, description, status, ownerId, targetValue, currentValue, unit, dueDate
- `milestones` — goalId, title, targetValue, isCompleted, dueDate
- `activity_log` — type, description, actorId, targetId, targetName

### API Routes (all under /api/)
- `GET/POST /users`, `POST /users/login`, `POST /users/logout`, `GET /users/me`, `GET/PATCH /users/:id`
- `GET/POST /departments`, `GET/PATCH/DELETE /departments/:id`, `GET /departments/:id/members`
- `GET/POST /channels`, `GET/PATCH/DELETE /channels/:id`, `GET/POST /channels/:id/members`, `GET/POST /channels/:id/messages`, `GET /channels/:id/files`
- `PATCH/DELETE /messages/:id`, `POST /messages/:id/reactions`
- `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`
- `POST /files/upload`
- `GET/POST /spaces`, `GET/PATCH/DELETE /spaces/:id`
- `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `GET /projects/:id/tasks`, `GET /projects/:id/stats`
- `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, `GET/POST /tasks/:id/comments`, `GET /tasks/:id/subtasks`, `POST /tasks/:id/watchers`
- `GET/POST /goals`, `GET/PATCH/DELETE /goals/:id`, `GET/POST /goals/:id/milestones`, `PATCH /goals/:id/milestones/:milestoneId`
- `GET /stats/dashboard`, `GET /stats/activity`, `GET /stats/my-tasks?userId=N`
- `POST /seed` — dev-only seed endpoint (seeds all tables)

### Frontend Pages
- `/login` — login/register
- `/` — Dashboard (stats, activity, my tasks)
- `/spaces` — Spaces list
- `/spaces/:id` — Space detail (projects)
- `/projects` — All projects
- `/projects/:id` — Project detail (list/kanban toggle, stats)
- `/tasks` — My Tasks (grouped by status)
- `/goals` — Goals list
- `/goals/:id` — Goal detail (milestones, progress)
- `/channels` — Channel list
- `/channels/:id` — Chat interface
- `/departments` — Department list
- `/departments/:id` — Department detail
- `/notifications` — Notifications
- `/settings` — Profile settings

## Seed Data (all passwords: `secret`)
- Users: admin, aung_thu, may_thu, kyaw_zin, su_mon, thida
- 5 Departments: Engineering, Product, Marketing, HR, Finance
- 3 Spaces: Engineering Hub, Product & Design, Marketing Growth
- 5 Projects with 14 tasks total
- 5 Goals with milestones

## Notes
- bcryptjs (NOT bcrypt) — native bcrypt has build issues on Replit
- Frontend auth uses localStorage `currentUserId` (not cookies for state)
- Messages poll every 3s for real-time simulation
- Seed endpoint: POST /api/seed (dev only)
