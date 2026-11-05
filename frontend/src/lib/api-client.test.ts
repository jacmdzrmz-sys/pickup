import { apiClient } from './api-client';

describe('apiClient', () => {
  it('uses the public /api prefix by default for the backend service', () => {
    const baseURL = (apiClient as any).client.defaults.baseURL;

    expect(baseURL).toBe('/api');
  });
});
