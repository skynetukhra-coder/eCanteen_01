# eCanteen - Production Web Application

High-performance canteen management system featuring a **Laravel 12 REST API backend** and an embedded **React 19 SPA frontend**, optimized for cPanel/hPanel and shared/cloud hosting (Hostinger, Apache, Nginx).

---

## Architecture Overview

- **Backend**: Laravel 12 (PHP 8.2+) REST API
- **Frontend**: React 19 SPA (pre-compiled into `public/`)
- **Database**: MySQL (compatible with existing `canteen` schema)
- **Payment Gateway**: Easebuzz Hosted Checkout (SHA-512)
- **Security**: JWT Authentication, HMAC-SHA256 Wallet Integrity Seals

---

## Directory Layout

```text
├── app/                  # Laravel Controllers, Models, and Services
│   ├── Http/Controllers # API Controllers (Auth, Menu, Orders, Wallet, Easebuzz, etc.)
│   ├── Models/           # Eloquent Models matching MySQL schema
│   └── Services/         # EasebuzzService and WalletService
├── config/               # App configuration
├── database/             # Migrations and seeders
├── public/               # Web Document Root
│   ├── assets/           # Compiled React 19 JavaScript & CSS bundles
│   ├── images/           # Application images and QR codes
│   ├── index.html        # Single Page Application entry point
│   ├── index.php         # Laravel entry point
│   └── .htaccess         # Apache front controller routing
├── routes/
│   ├── api.php           # All /api endpoints
│   └── web.php           # SPA fallback router
├── .env.example          # Environment template
├── .htaccess             # Root rewrite rule routing requests to public/
└── composer.json         # PHP dependencies
```

---

## Hostinger / Production Deployment Guide

### 1. Upload or Clone
Deploy the repository into your hosting directory (e.g. `public_html` or domain folder):
```bash
git clone https://github.com/skynetukhra-coder/eCanteen_01.git .
```

### 2. Configure Environment (`.env`)
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```
Ensure the following variables are configured:
```ini
APP_NAME=eCanteen
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=canteen
DB_USERNAME=your_mysql_username
DB_PASSWORD=your_mysql_password

JWT_SECRET=supersecretcanteenkey12345
WALLET_HMAC_SECRET=canteen_wallet_integrity_key

EASEBUZZ_KEY=PCG0NDPL0
EASEBUZZ_SALT=S4KSFDOFV
EASEBUZZ_ENV=test
```

### 3. Install Dependencies & Generate Application Key
Run composer via SSH (or Hostinger Terminal):
```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
```

### 4. Cache Configurations for High Performance
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 5. File Permissions
Ensure the web server has write access to the storage and cache directories:
```bash
chmod -R 775 storage bootstrap/cache
```

### 6. Apache / Domain Configuration
- If your domain's **Document Root** can be changed in Hostinger: Point it directly to `public/`.
- If your Document Root is fixed to the repo root: The included root `.htaccess` will automatically rewrite all requests to `public/`.

---

## License
Proprietary / Internal Use.
