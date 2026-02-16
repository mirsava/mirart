# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing across both frontend and backend.

## Running Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (re-runs on file changes)
npm run test

# Run tests with UI
npm run test:ui

# Run only frontend tests
npm run test:run -- src/

# Run only backend tests
npm run test:run -- backend/

# Run a specific test file
npm run test:run -- src/services/api.test.ts
```

## Test Structure

### Frontend Tests (`src/`)

- **API Service** (`src/services/api.test.ts`) – Tests the API client with mocked `fetch`
- **Components** (`src/components/*.test.tsx`) – PageHeader, ProtectedRoute
- **Contexts** (`src/contexts/*.test.tsx`) – CartContext
- **Theme** (`src/theme.test.ts`) – Theme configuration

### Backend Tests (`backend/`)

- **Health** (`backend/health.test.js`) – Health check endpoint
- **Subscriptions** (`backend/routes/subscriptions.test.js`) – Subscription CRUD, cancel, admin plans
- **Listings** (`backend/routes/listings.test.js`) – Listings list and detail

Backend tests use mocked database (`pool.execute`) and Stripe. The app is exported from `server.js` when `NODE_ENV=test` (server does not listen).

## Configuration

- **Frontend**: `vite.config.js` – `environment: 'jsdom'`, setup in `src/test/setup.ts`
- **Backend**: `environmentMatchGlobs: [['backend/**', 'node']]` – Node environment for backend tests
- **Setup**: `src/test/setup.ts` – Mocks `window.matchMedia`, `ResizeObserver`; skips in Node

## Writing New Tests

### Frontend (React)

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders title', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Backend (API routes)

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

process.env.NODE_ENV = 'test';
const { app } = await import('../server.js');

describe('My API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/my-route').expect(200);
    expect(res.body).toBeDefined();
  });
});
```

## Mock Conventions

- **MySQL2 `pool.execute`**: Returns `[rows, fields]`. Use `mockResolvedValueOnce([[row1, row2]])` for rows.
- **Stripe**: Mocked in `backend/config/stripe.js` for subscription tests.
- **Fetch**: Mock `globalThis.fetch` in API service tests.
