# ArtZyla Backend API

Backend API for the ArtZyla marketplace built with Express.js and MySQL.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Create a `.env` file in the `backend` directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=mirart
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 3. Initialize Database

Make sure MySQL is running, then initialize the database schema:

```bash
npm run init-db
```

Or manually run the SQL schema:

```bash
mysql -u root -p < database/schema.sql
```

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

- `GET /api/users/:cognitoUsername` - Get user profile
- `POST /api/users` - Create or update user profile
- `PUT /api/users/:cognitoUsername` - Update user profile

### Listings

- `GET /api/listings` - Get all listings (with optional query params: category, subcategory, status, userId, search)
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create new listing
- `PUT /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing
- `GET /api/listings/user/:cognitoUsername` - Get user's listings

### Dashboard

- `GET /api/dashboard/:cognitoUsername` - Get dashboard statistics and recent data

## Database Schema

The database includes the following tables:

- **users** - User profiles and account information
- **listings** - Artwork listings
- **orders** - Order management
- **dashboard_stats** - Cached dashboard statistics

See `database/schema.sql` for full schema details.

## Notes

- User authentication is handled by AWS Cognito
- The `cognito_username` is used to link database records with Cognito users
- All prices are stored as DECIMAL(10, 2)
- Dashboard stats are cached for performance but recalculated on each request

