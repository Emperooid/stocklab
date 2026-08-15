import { mockApi } from './mockApi';

// TODO: once real backend endpoints are available, add src/api/httpApi.ts
// implementing the same shape as mockApi (auth/rounds/wallet) against the
// real base URL, then swap this export to it.
export const api = mockApi;
