# ADR-001: React 18 & Vite 6 Frontend Architecture

## Status
Accepted

## Context
OpsPilot AI requires a highly responsive, modern, component-driven single page application (SPA) capable of handling real-time chat streaming, interactive citation drawers, complex data tables, and dynamic routing across multi-tenant organizations.

## Decision
We chose React 18 with Vite 6, TypeScript 5, Tailwind CSS, TanStack Query v5, Zustand v5, and React Router v6. We explicitly avoided full-stack meta-frameworks like Next.js to preserve a clean decoupling between the static frontend SPA and the decoupled Node.js API gateway.

## Consequences
- Fast developer iteration and sub-second HMR with Vite.
- Static production output (`dist/`) hostable on Amazon S3 behind CloudFront edge CDN with Origin Access Control.
- Clean separation of concerns: the browser application communicates purely via authenticated REST APIs.
