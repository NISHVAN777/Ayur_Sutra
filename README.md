# AYURSUTRA
### Panchakarma Patient Management and Therapy Scheduling Software

> **A modern, full-stack, production-quality healthcare web application designed specifically for Ayurvedic clinics managing contiguous multi-day Panchakarma therapies.**

---

## 🌿 Executive Summary & Problem Solved

Traditional clinic appointment systems treat each booking as an isolated event. In authentic Ayurvedic healthcare, **Panchakarma is a contiguous multi-day journey** (e.g., 7-Day Basti, 14-Day Detoxification, 21-Day Rasayana).

**AyurSutra solves the critical operational challenges of Panchakarma clinics:**
1. **Multi-Day Continuity**: Scheduling one course (e.g., "7-Day Basti Therapy") automatically generates all Day 1 through Day 7 sessions atomically.
2. **Double-Booking Prevention**: Checks therapist and treatment suite availability across the **entire multi-day span** before committing to the database.
3. **Atomic Transaction Rollback**: If Day 1, 2, and 3 are available but Day 4 has a scheduling conflict, the entire operation is rolled back with zero residual records and a clear `409 Conflict` explanation.
4. **Session Rescheduling & Cancellation**: Admin can reschedule or cancel sessions with conflict validation, reason tracking, audit logs, and automatic patient notifications.
5. **Course Lifecycle Controls**: Admin can pause and resume active courses safely without deleting completed sessions or clinical notes.
6. **Automatic Course Completion**: Courses automatically transition to `COMPLETED` when all required sessions are finished.
7. **Day-by-Day Patient Visibility**: Patients track their dynamic healing progress percentage, daily regimen timeline, and view their assigned doctor's profile.
8. **Therapist Clinical Workflow**: "My Day" dashboard enables practitioners to review health notes, record observations, and mark sessions complete with timestamped logs.
9. **Domain-Restricted AI Assistant**: Gemini AI chatbot with authenticated patient schedule context injection and strict medical safety boundaries (English only).

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, TanStack Query, Lucide Icons |
| **Backend** | Node.js, Express.js, TypeScript, REST APIs |
| **Database** | SQLite, `better-sqlite3`, Drizzle ORM (Zero PostgreSQL or external database server requirement) |
| **Database Location** | `data/ayursutra.db` (Local, persistent, WAL mode enabled) |
| **Authentication** | `bcryptjs` password hashing, JWT in Secure HTTP-Only Cookies, Role-Based Access Control |
| **Validation** | Zod schema validation |
| **AI Integration** | `@google/genai` (Google Gemini 2.5 Flash) with intelligent English fallback |
| **Testing** | Vitest, Supertest (36 Automated Integration Tests) |
| **Task Automation** | `node-cron` for automated reminder generation |

---

## ⚡ Quick Start & Run Commands

```bash
# 1. Install dependencies
npm run install:all

# 2. Run migrations and seed standardized database
npm run db:migrate
npm run db:seed

# 3. Start development servers
npm run dev
```

- **Frontend App**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:5000`

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@ayursutra.com` | `Admin@123` | Dr. Shankaran (Clinic Director) |
| **THERAPIST** | `therapist@ayursutra.com` | `Therapist@123` | Dr. Rajesh Kumar (Panchakarma Specialist) |
| **PATIENT** | `patient@ayursutra.com` | `Patient@123` | Arun Sharma (Active 7-Day Basti Therapy) |

---

## 🧪 Automated Testing Suite (36/36 Tests Passing)

```bash
npm test
```

### Verified Test Suites:
1. `src/tests/enhancements.test.ts` (8 tests: Reschedule, Conflict 409, Cancellation, Therapist Change, Room Change, Pause/Resume, Course Completion, Therapist Profile)
2. `src/tests/scheduling_engine.test.ts` (6 tests: Multi-day availability, 7-day atomic generation, Double-booking conflict 409, Mandatory atomic rollback, Cancelled slot reusability)
3. `src/tests/auth.test.ts` (9 tests: Password hashing, login, tokens, cookies, role checks)
4. `src/tests/rbac_isolation.test.ts` (6 tests: Admin access, Patient isolation 403, Therapist boundary)
5. `src/tests/session_progress.test.ts` (4 tests: Session completion, clinical notes, dynamic progress %, next session)
6. `src/tests/chat_ai.test.ts` (3 tests: English schedule context injection, dietary advice, history retrieval)
