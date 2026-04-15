# LeanPulse Development Plan

This document outlines the architecture and implementation steps to develop the LeanPulse exam application based on the requirements gathered from the provided architecture document. 

## Goal
To build a highly reliable, anti-fraud exam application. The application consists of a student interface for taking exams under strict browser constraints (auto-fullscreen, blur detection, visibility changes) and a real-time teacher dashboard to monitor students and manage active sessions.

## User Review Required

> [!IMPORTANT]
> This is a multi-service application requiring several external services (as per the architecture doc). Before we begin, please review the stack and confirm:
> - **Database Configuration:** Should we use a local `SQLite` database for initial local development to get started quickly, or are you ready to provide a Neon (PostgreSQL) connection string now?
> - **Directory Structure:** Should we put both the Next.js Frontend and NestJS Backend in the same repository (e.g., in `frontend/` and `backend/` folders) to make local development easier?
> - **First Steps:** Should we begin by generating the `NestJS` backend foundation and Database schema, or do you prefer to start with a beautiful mock of the `Next.js` frontend prototype first?

## Proposed Changes

We will split the workspace into two distinct sub-projects: `frontend` and `backend`.

### Backend (`backend/` - NestJS)
- **Framework:** `NestJS` (Node.js) using Typescript.
- **Database ORM:** Prisma ORM connecting to PostgreSQL (or SQLite locally).
- **Real-Time:** `Socket.io` Gateway for real-time exam monitoring and violation alerts.
- **Core Entities:**
  - `Student` / `Exam` / `Question` / `Answer`
  - `ExamSession` (Tracks status: active, blocked, finished)
  - `Violation` (Tracks blur, tab change, exit fullscreen)

### Frontend (`frontend/` - Next.js)
- **Framework:** `Next.js` (React), `TailwindCSS` (for modern, vibrant, and premium designs using glassmorphism and smooth animations).
- **Pages & Flow:**
  - **Student Access:** Simple login (Name + Email) to start an exam.
  - **Lockdown Exam Area:** Forces fullscreen. Listens to `fullscreenchange`, `visibilitychange`, and `blur` events to detect cheating. If a violation happens, it alerts the backend immediately.
  - **Teacher Dashboard:** A real-time monitoring panel displaying which students are taking the exam, alerting on violations, and allowing the teacher to block/unblock students or end their exam.

## Open Questions

> [!WARNING]
> Please provide your thoughts on these integration questions:
> 1. Do you already have API keys for Resend/SendGrid for the email feature, or should we just mock the email sending with console logs initially?
> 2. How should the Teacher Access be protected for now? A simple hardcoded password, or should we build a full teacher authentication system?

## Verification Plan

### Automated Steps
- Ensure both `frontend` and `backend` projects initialize successfully and compile without errors (`npm run build`).

### Manual Verification
1. Open the teacher dashboard on one screen.
2. Join an exam as a student on another screen.
3. Attempt to minimize the window or change tabs as the student. 
4. Verify that the teacher dashboard instantly receives a "violation detected" WebSocket event and that the student's exam gets blocked.
