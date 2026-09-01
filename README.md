# 🔐 SmartGate OS — Enterprise Leave & Gate Pass Management System

A full-stack enterprise-grade system for managing **Employee Leave**, **Exit Permissions**, **Digital Gate Passes**, **Visitor Management**, and **Security Gate Control** — with 6 distinct user roles, authority-based approval workflows, real-time notifications, and 1-click Excel/CSV exports.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Vanilla CSS |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | MySQL via Prisma ORM |
| **Auth** | JWT (Access + Refresh tokens) |
| **Real-time** | Socket.io |
| **ORM** | Prisma |
| **Monorepo** | npm Workspaces |

---

## 📁 Project Structure

```
SmartGate-OS/
├── frontend/          # Next.js 14 app (Port 3000)
├── backend/           # Express API server (Port 5000)
├── packages/
│   └── types/         # Shared TypeScript types
└── package.json       # Root workspace config
```

---

## ⚙️ Prerequisites

- **Node.js** v18+
- **MySQL** running locally on port `3306`
- MySQL database: `smartgate_db` (auto-created by Prisma)

---

## 🛠️ First-Time Setup

### 1. Clone & Install dependencies
```bash
git clone https://github.com/swapnilggg836/SmartGate-OS.git
cd SmartGate-OS
npm install
```

### 2. Configure Environment

**Backend** — create `backend/.env`:
```env
PORT=5000
DATABASE_URL="mysql://root:root@localhost:3306/smartgate_db"
JWT_ACCESS_SECRET="super-secret-access-key-2026"
JWT_REFRESH_SECRET="super-secret-refresh-key-2026"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="*"
NODE_ENV="development"
```

**Frontend** — create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Setup Database
```bash
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to MySQL
npx prisma db push

# Seed with sample data
npx tsx src/scripts/seed.ts
```

---

## ▶️ Run the Project

### Option A — Two terminals

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### Option B — From root (both together)
```bash
npm run dev
```

---

## 🌐 Access

| URL | Purpose |
|---|---|
| `http://localhost:3000` | Web Application (Frontend) |
| `http://localhost:5000/api` | REST API (Backend) |

---

## 🔑 Login Credentials

> All accounts use password: **`Password123!`**

| Role | Email | Access Level |
|---|---|---|
| 🔴 **Super Admin** | `admin@enterprise.com` | Full system control |
| 🏢 **General Manager** | `gm@enterprise.com` | Executive oversight |
| 👩‍💼 **HR Director** | `hr@enterprise.com` | HR & employee management |
| 👨‍💼 **Manager** | `manager@enterprise.com` | Team approvals |
| 👤 **Employee** | `employee@enterprise.com` | Personal self-service |
| 🛡️ **Security Guard** | `security@enterprise.com` | Gate control center |

---

## 🎯 Features by Role

### 👤 Employee
- Dashboard with leave balances, active gate pass, recent requests
- Apply for Leave (4 types: Casual, Sick, Privilege, Emergency)
- Apply for Exit Permission (temporary off-site)
- My Gate Pass — digital QR pass wallet
- My Visitors — pre-register visitors
- My Authorities — view reporting hierarchy
- My Attendance
- Notifications
- My Profile

### 👨‍💼 Manager
- All Employee features (personal side)
- My Team — real-time roster with attendance, leave & gate status
- Approvals — review leave/exit requests from direct reports
- Team leave calendar

### 👩‍💼 HR Director
- All Employee features (personal side)
- Employee Directory — full company roster
- Leave Types Configuration
- HR Approvals queue
- Attendance Reports
- Visitor Management
- Company Reports + Excel Export

### 🏢 General Manager (GM)
- All Employee features (personal side)
- Executive Dashboard — KPI matrix
- Critical & Escalated Requests only (long leave > 2 days, critical exits)
- Company Operations Summary
- Department Workforce Overview

### 🛡️ Security Guard
- All Employee features (personal side)
- Gate Security Command Center
  - Verify by Employee Code / Pass Number / QR
  - Allow Exit / Mark Return
  - Double-exit & double-return prevention
  - Emergency Evacuation Roll Call
  - Overdue alerts
- Visitor Console — walk-in registration, check-in, check-out

### 🔴 Super Admin
- All of the above
- Admin Control Center — full company governance
- User & Role Management
- Department Management
- Employee 360° Journey Dossier
- Immutable Audit Logs (with CSV export)
- System Reports

---

## 📊 Database Schema (Key Tables)

| Table | Description |
|---|---|
| `User` | Auth accounts with roles |
| `Employee` | Profile, code (EMP1000+), department |
| `Department` | Company departments |
| `AuthorityConnection` | Manager → Employee hierarchy |
| `LeaveType` / `LeaveBalance` / `LeaveRequest` | Leave management |
| `ExitRequest` | Temporary off-site permissions |
| `GatePass` / `GateLog` | Digital passes (GP-2026-XXXXX) |
| `Visitor` / `VisitorVisit` / `VisitorPass` | Visitor system (VP-2026-XXXXX) |
| `Attendance` | Daily attendance records |
| `AuditLog` | Tamper-proof compliance trail |

---

## 🧪 Run Automated Test Suite

```bash
cd backend
npx tsx src/scripts/test-master-qa-suite.ts
```

Expected: **28/28 PASS — 100% success rate**

---

## 📱 Responsive Design

- ✅ Mobile (320px – 430px) — Bottom navigation bar
- ✅ Tablet (768px – 1024px) — Hamburger drawer sidebar
- ✅ Desktop (1280px+) — Full sidebar + content

---

## 📥 Excel / CSV Exports

| Section | Page |
|---|---|
| Employee 360° Journey | `/employees/[id]/journey` |
| Staff Directory | `/employees` |
| Audit Trail | `/admin/audit` |
| Gate, Leave, Exit, Visitor Reports | `/admin/reports` |

---

## 🔒 Security

- JWT access tokens (15m) + refresh tokens (7d)
- Role-Based Access Control (RBAC) — 403 on unauthorized routes
- IDOR prevention on all user-scoped endpoints
- Immutable audit logging for all admin actions
- Double-exit & double-return state invariants at the gate

---

## 🤝 Contributing

```bash
git checkout -b feature/your-feature
git commit -m "feat: your feature"
git push origin feature/your-feature
```

---

## 📄 License

MIT © SmartGate OS 2026
