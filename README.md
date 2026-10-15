# eCanteen - Production Web Application

High-performance canteen management system featuring an **Express / Node.js backend** and an embedded **React 19 SPA frontend**, optimized for Hostinger Shared Hosting (Node.js App), Cloud/cPanel, and AWS EC2.

---

## Architecture Overview

- **Backend**: Express / Node.js REST API (`server.js`)
- **Frontend**: React 19 SPA (pre-compiled into `public/`, served by Express)
- **Database**: MySQL / MariaDB (database `canteen`)
- **Payment Gateway**: Easebuzz Hosted Checkout & Webhooks (SHA-512)
- **Security**: JWT Authentication, HMAC-SHA256 Wallet Integrity Seals

---

## Directory Structure

```text
├── config/             # Database pool & Multer configuration
├── controllers/        # Auth, Feedback, Menu, and Payment controllers
├── middleware/         # JWT verification middleware
├── models/             # Employee model
├── public/             # Pre-compiled React production bundle (served by Express)
│   ├── assets/         # Bundled JS & CSS
│   ├── images/         # Static logos, QR code images
│   ├── index.html      # SPA entry point
│   └── .htaccess       # Apache rewrite rules for React client routing
├── routes/             # API routes (orders, wallet, easebuzz, menu, auth, etc.)
├── services/           # EasebuzzService (SHA-512) & EmailService
├── uploads/            # Persistent uploaded files (with .gitkeep)
├── .env.example        # Environment variable template
├── .gitignore          # Excludes node_modules, .env, and uploaded media
├── package.json        # Production dependencies & start script
├── README.md           # Documentation
└── server.js           # Main application entry point
```

---

## Quick Deployment Guide (Hostinger Node.js / cPanel / AWS EC2)

### 1. Hostinger Shared Hosting Setup
1. In Hostinger hPanel, go to **Advanced > Node.js**.
2. Create/Configure Node.js application:
   - **Node.js version**: 18.x or 20.x
   - **Application Root**: `/` (or your subdomain directory where files are placed)
   - **Application Startup File**: `server.js`
3. Click **npm install** (or run `npm install --omit=dev` via SSH).

### 2. Configure Environment (`.env`)
Create `.env` at the root directory based on `.env.example`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=canteen
JWT_SECRET=your_jwt_secret_key

# Easebuzz Live Kit Configuration
EASEBUZZ_KEY=JM67759I5K
EASEBUZZ_SALT=Z8WPH0LZLV
EASEBUZZ_ENV=prod
APP_BASE_URL=https://yourdomain.com
```

### 3. Run Application
Hostinger's Node.js manager runs `node server.js` automatically.
Express serves both the `/api/...` endpoints and the compiled React frontend at `/`.
