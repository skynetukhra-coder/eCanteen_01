# eCanteen - Production Web Application

High-performance canteen management system featuring an **Express / Node.js backend** and an embedded **React 19 SPA frontend**, optimized for Hostinger (Shared Hosting / Cloud / VPS) and AWS EC2.

---

## Architecture Overview

- **Backend**: Express / Node.js REST API (`backend/`)
- **Frontend**: React 19 SPA (pre-compiled into `backend/public/`)
- **Database**: MySQL / MariaDB (database `canteen`)
- **Payment Gateway**: Easebuzz Hosted Checkout & Webhooks (SHA-512)
- **Security**: JWT Authentication, HMAC-SHA256 Wallet Integrity Seals

---

## Directory Structure

```text
├── backend/
│   ├── config/             # Database pool & Multer configuration
│   ├── controllers/        # Auth, Feedback, Menu, and Payment controllers
│   ├── middleware/         # JWT verification middleware
│   ├── models/             # Employee model
│   ├── public/             # Pre-compiled React production bundle (served by Express)
│   │   ├── assets/         # Bundled JS & CSS
│   │   ├── images/         # Static logos, QR code images
│   │   ├── index.html      # SPA entry point
│   │   └── .htaccess       # Apache rewrite rules for React client routing
│   ├── routes/             # API routes (orders, wallet, easebuzz, menu, auth, etc.)
│   ├── services/           # EasebuzzService (SHA-512) & EmailService
│   ├── uploads/            # Persistent uploaded files
│   ├── .env.example        # Environment variable template
│   ├── package.json        # Production dependencies
│   └── server.js           # Main application entry point
├── frontend/               # React 19 source code (for development)
└── .gitignore
```

---

## Quick Deployment Guide (Hostinger / cPanel / AWS EC2)

### 1. Install Dependencies
In the `backend/` directory, install production dependencies:
```bash
cd backend
npm install --omit=dev
```

### 2. Configure Environment (`backend/.env`)
Create `backend/.env` from `backend/.env.example`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=canteen
JWT_SECRET=supersecretcanteenkey12345

# Easebuzz Live Kit Configuration
EASEBUZZ_KEY=JM67759I5K
EASEBUZZ_SALT=Z8WPH0LZLV
EASEBUZZ_ENV=prod
APP_BASE_URL=https://yourdomain.com
```

### 3. Start Server
```bash
node server.js
# Or with PM2 process manager:
pm2 start server.js --name "canteen"
```
Express serves both the `/api/...` endpoints and the compiled frontend at `/`.
