# Deploying ArtZyla (Render + Supabase + Resend)

`render.yaml` at the repo root defines both services. In Render choose **New > Blueprint**, pick this repo, and fill in the secrets it asks for.

## 1. Supabase
- **Database**: run `npm run init-db` once from `backend/` with the production `DATABASE_URL` (session pooler URI, password URL-encoded).
- **Authentication > URL Configuration**: set *Site URL* to the frontend URL and add it (plus `/**`) to *Redirect URLs*.
- **Authentication > Email Templates**: keep the confirmation email showing both the link and `{{ .Token }}` if you want the code option.
- **Authentication > SMTP Settings**: use Resend SMTP (host `smtp.resend.com`, port 465, user `resend`, password = your Resend API key) so auth emails are not rate limited.
- **Storage**: the `artwork` bucket is created automatically by the backend on first upload.
- **Plan**: the free tier pauses after inactivity and has no backups. Use Pro before real users depend on it.
- **Admin**: sign up on the live site, then run `npm run set-admin -- you@example.com` from `backend/`.

## 2. Resend
- Verify your sending domain (add the DNS records Resend shows).
- Create an API key. Set `RESEND_API_KEY` and `EMAIL_FROM` (for example `ArtZyla <noreply@yourdomain.com>`) on the API service. Without a key, emails are only logged.

## 3. Render environment values
API service (`artzyla-api`):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (already in the blueprint) |
| `FRONTEND_URL` | exact frontend origin, no trailing slash. This is the only origin CORS allows |
| `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | from Supabase |
| `RESEND_API_KEY`, `EMAIL_FROM` | from Resend |
| `STRIPE_SECRET_KEY`, `SHIPPO_API_KEY` | only needed if you turn Online Checkout on |

Static site (`artzyla`): `VITE_API_URL` (must end in `/api`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. These are baked in at build time. If `VITE_API_URL` is missing, the production build calls `localhost`. Change one, then redeploy.

## 4. Render tier
The free web service sleeps after 15 minutes idle, so the first request takes about a minute, and the daily subscription-expiration job does not run while it sleeps. Use a paid instance for real traffic.

## 5. Before announcing
- Replace `artzyla.com` in `public/robots.txt` and `public/sitemap*.xml` if the real domain differs.
- Have a lawyer review `src/data/terms.ts` (fill in `governingLaw`), the FAQ, and the marketplace notice wording.
- In Admin Dashboard, confirm **Billing** (off = free listing) and **Online Checkout** (off = contact-only) are set the way you want.
- Open `/health` on the API, sign up, confirm the email, create a listing with an image, and send a message.
