/**
 * Shippo configuration
 * Get API key from https://app.goshippo.com/ -> Settings -> API
 * Use test key for development (prefix shippo_test_)
 */
const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY || '';

export const shippoConfig = {
  apiKey: SHIPPO_API_KEY,
  isConfigured: Boolean(SHIPPO_API_KEY),
  baseUrl: 'https://api.goshippo.com',
};
