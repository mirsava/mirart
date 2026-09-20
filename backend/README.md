# ArtZyla Backend API

Backend API for the ArtZyla marketplace built with Express.js and Supabase (Postgres + Auth).

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env` in the `backend` directory and fill it in:

- `DATABASE_URL`: the **Session pooler** connection string from Supabase (Project Settings -> Database). The pooler is IPv4 compatible; the direct `db.<ref>.supabase.co` host is IPv6-only. URL-encode any special characters in the password.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Project Settings -> API. The service role key is a secret; never expose it to the browser.

### 3. Initialize Database

Creates every table, index, trigger and RLS setting in one go. It is idempotent, so it is safe to re-run:

```bash
npm run init-db
```

`database/schema.sql` is the single source of truth for the schema.

To make yourself an admin after signing up: `npm run set-admin -- you@example.com`.
To empty every table (and optionally the Supabase Auth users): `npm run reset-db` (add `-- --include-auth`).

### 4. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

### Users

- `GET /api/users/:authUserId` - Get user profile
- `POST /api/users` - Create or update user profile
- `PUT /api/users/:authUserId` - Update user profile

### Listings

- `GET /api/listings` - Get all listings (with optional query params: category, subcategory, status, userId, search)
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create new listing
- `PUT /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing
- `GET /api/listings/user/:authUserId` - Get user's listings

### Dashboard

- `GET /api/dashboard/:authUserId` - Get dashboard statistics and recent data

## Database Schema

The database includes the following tables:

- **users** - User profiles and account information
- **listings** - Artwork listings
- **orders** - Order management
- **dashboard_stats** - Cached dashboard statistics

See `database/schema.sql` for full schema details.

## Notes

- User authentication is handled by Supabase Auth. `users.auth_user_id` is the Supabase user UUID (`auth.users.id`); a database trigger creates the `users` row on sign-up.
- The API verifies the `Authorization: Bearer <access token>` header; roles come from `users.user_type` (`artist`, `buyer`, `admin`), never from client-supplied parameters.
- All prices are stored as NUMERIC(10, 2)
- Dashboard stats are cached for performance but recalculated on each request

## SEO Sitemap Operations

Configure the canonical site URL for sitemap generation:

```env
SITE_URL=https://artzyla.com
```

If `SITE_URL` is not set, the backend falls back to `FRONTEND_URL`.

Dynamic sitemap endpoints:

- `GET /sitemap.xml` and `GET /api/sitemap.xml`
- `GET /sitemap-static.xml` and `GET /api/sitemap-static.xml`
- `GET /sitemap-listings.xml` and `GET /api/sitemap-listings.xml`

Post-deploy sitemap check and ping:

```bash
npm run seo:ping
```

This command validates sitemap availability and pings Bing with the sitemap index URL.

Google no longer supports sitemap ping endpoints; submit `https://artzyla.com/sitemap.xml` in Google Search Console.

