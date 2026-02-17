import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original fetch and env
const originalFetch = globalThis.fetch;
const originalEnv = import.meta.env;

beforeEach(() => {
  vi.resetModules();
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  import.meta.env = originalEnv;
});

describe('ApiService', () => {
  it('getListings builds correct URL with filters', async () => {
    const mockResponse = { listings: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { default: apiService } = await import('./api');
    await apiService.getListings({ category: 'Painting', page: 2, limit: 10 });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/listings?category=Painting&page=2&limit=10'),
      expect.any(Object)
    );
  });

  it('getListings omits undefined and null filters', async () => {
    const mockResponse = { listings: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { default: apiService } = await import('./api');
    await apiService.getListings({ category: 'Painting', search: undefined, page: null as any });

    const callUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callUrl).toContain('category=Painting');
    expect(callUrl).not.toContain('search=');
    expect(callUrl).not.toContain('page=');
  });

  it('getUser returns user with active as boolean', async () => {
    const mockUser = { cognito_username: 'user1', email: 'a@b.com', active: 1 };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });

    const { default: apiService } = await import('./api');
    const user = await apiService.getUser('user1');

    expect(user.active).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/user1'),
      expect.any(Object)
    );
  });

  it('getListing fetches single listing by id', async () => {
    const mockListing = { id: 1, title: 'Test', user_id: 1, category: 'Painting', price: 100, in_stock: true, status: 'active', views: 0, created_at: '', updated_at: '' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockListing),
    });

    const { default: apiService } = await import('./api');
    const listing = await apiService.getListing(1);

    expect(listing.id).toBe(1);
    expect(listing.title).toBe('Test');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/listings/1'),
      expect.any(Object)
    );
  });

  it('createListing sends POST with body', async () => {
    const mockListing = { id: 1, title: 'New', user_id: 1, cognito_username: 'u1', category: 'Painting', price: 50, in_stock: true, status: 'draft', views: 0, created_at: '', updated_at: '' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockListing),
    });

    const { default: apiService } = await import('./api');
    await apiService.createListing({ title: 'New', category: 'Painting', price: 50, cognito_username: 'u1' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/listings'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"title":"New"'),
      })
    );
  });

  it('deleteListing sends DELETE request', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Deleted' }),
    });

    const { default: apiService } = await import('./api');
    await apiService.deleteListing(42, 'user1');

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain('/listings/42');
    expect(fetchCall[0]).toContain('cognitoUsername=user1');
    expect(fetchCall[1]).toMatchObject({ method: 'DELETE' });
  });

  it('throws on HTTP error with message from response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
    });

    const { default: apiService } = await import('./api');
    await expect(apiService.getListing(999)).rejects.toThrow();
  });

  it('getSubscriptionPlans fetches plans', async () => {
    const mockPlans = [{ id: 1, name: 'Starter', tier: 'starter', max_listings: 5, price_monthly: 9.99, price_yearly: 99.99 }];
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPlans),
    });

    const { default: apiService } = await import('./api');
    const plans = await apiService.getSubscriptionPlans();

    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Starter');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions/plans'),
      expect.any(Object)
    );
  });

  it('getUserSubscription returns subscription or null', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ subscription: null }),
    });

    const { default: apiService } = await import('./api');
    const res = await apiService.getUserSubscription('user1');

    expect(res.subscription).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions/user/user1'),
      expect.any(Object)
    );
  });

  it('cancelSubscription sends PUT to cancel endpoint', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Subscription cancelled.' }),
    });

    const { default: apiService } = await import('./api');
    await apiService.cancelSubscription('user1');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions/user/user1/cancel'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('createStripeCheckoutSession sends items and metadata', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ url: 'https://checkout.stripe.com/...', sessionId: 'cs_xxx' }),
    });

    const { default: apiService } = await import('./api');
    const result = await apiService.createStripeCheckoutSession(
      [{ name: 'Plan', price: 9.99, quantity: 1 }],
      { metadata: { is_subscription: 'true', plan_id: '1' } }
    );

    expect(result.url).toBeDefined();
    expect(result.sessionId).toBeDefined();
    const callBody = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.items).toHaveLength(1);
    expect(callBody.items[0].name).toBe('Plan');
    expect(callBody.metadata.is_subscription).toBe('true');
  });
});
