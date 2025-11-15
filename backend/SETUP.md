# Backend Setup Guide

Follow these steps to set up and run the backend server:

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Configure Database

Create a `.env` file in the `backend` directory with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=mirart
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Important**: Replace `your_mysql_password_here` with your actual MySQL root password.

## Step 3: Make Sure MySQL is Running

Ensure your MySQL server is running on your machine. You can check by running:
```bash
mysql --version
```

## Step 4: Initialize the Database

Run the database initialization script to create the database and tables:

```bash
npm run init-db
```

This will:
- Create the `mirart` database (if it doesn't exist)
- Create all necessary tables (users, listings, orders, dashboard_stats)

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

You should see: `{"status":"ok","message":"MirArt API is running"}`

## Troubleshooting

### "Access denied for user" error
- Check your MySQL password in the `.env` file
- Make sure MySQL is running
- Verify your MySQL user has permission to create databases

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
