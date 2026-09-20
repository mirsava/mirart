# Backend Setup Guide

Follow these steps to set up and run the backend server:

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Configure Supabase

Copy `.env.example` to `.env` and fill it in (see `README.md` for where each value lives in the Supabase dashboard):

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres.<project-ref>:<url-encoded-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SMTP Configuration (for sending emails)
# Leave empty to use mock mode (emails will be logged to console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_EMAIL=noreply@artzyla.com
```

Use the **Session pooler** connection string; the direct database host is IPv6-only.

## Step 3: Configure Supabase Auth emails

The app asks users to type the verification code from their email, so the **Confirm signup** and **Reset password** email templates (Authentication -> Email Templates) must include `{{ .Token }}`.
For production, configure a custom SMTP provider (Authentication -> SMTP); Supabase's built-in mailer is heavily rate limited.

## Step 4: Initialize the Database

```bash
npm run init-db
```

This creates all tables, indexes, triggers and row-level-security settings from `database/schema.sql`. It is safe to re-run.

## Step 5: Start the Backend Server

For development (with auto-reload):
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:3001`

## Step 6: Verify It's Working

Open your browser or use curl to check the health endpoint:
```
http://localhost:3001/health
```

You should see: `{"status":"ok","message":"ArtZyla API is running"}`

## Troubleshooting

### "password authentication failed" or "ENOTFOUND" errors
- Check the password in `DATABASE_URL` (URL-encode special characters such as `@`)
- Use the Session pooler host (`aws-0-<region>.pooler.supabase.com`) and the `postgres.<project-ref>` user; the direct `db.<ref>.supabase.co` host is IPv6-only

### "Cannot find module" errors
- Run `npm install` again in the backend directory

### Port already in use
- Change the `PORT` in `.env` to a different number (e.g., 3002)
- Or stop the process using port 3001

## Next Steps

Once the backend is running:
1. Your frontend can now connect to the API
2. User signups will automatically save to the database
3. Dashboard will show real data from the database
