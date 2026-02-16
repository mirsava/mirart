import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { UserRole } from '../types/userRoles';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const renderWithRouter = (authState: { user?: any; loading?: boolean; isAuthenticated?: boolean; refreshUser?: () => Promise<void> }) => {
  mockUseAuth.mockReturnValue({
    user: authState.user ?? null,
    loading: authState.loading ?? false,
    isAuthenticated: authState.isAuthenticated ?? false,
    refreshUser: authState.refreshUser ?? vi.fn().mockResolvedValue(undefined),
  });
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><div data-testid="protected-content">Protected</div></ProtectedRoute>} />
        <Route path="/artist-signin" element={<div>Sign In</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  it('shows loading when auth is loading', () => {
    renderWithRouter({ loading: true, isAuthenticated: false });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to sign-in when not authenticated', () => {
    renderWithRouter({ loading: false, isAuthenticated: false });
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    renderWithRouter({ loading: false, isAuthenticated: true, user: { id: 'u1' } });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('shows access denied when user lacks required role', async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', userRole: 'buyer' },
      loading: false,
      isAuthenticated: true,
      refreshUser,
    });
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute requiredUserType={UserRole.SITE_ADMIN}>
              <div data-testid="protected-content">Admin Only</div>
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    // Wait for refreshUser to complete (ProtectedRoute calls it when role mismatch)
    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
