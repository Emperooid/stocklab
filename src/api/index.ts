import { mockApi } from './mockApi';

// src/api/httpApi.ts implements the real backend (theKey/myhandler gateway),
// but is NOT safe to switch to yet — several features the app depends on
// have no documented endpoint (admin Stock Value, deposit/withdrawal
// creation, bank resolution, a plain balance/profile fetch), and auth here
// is phone+PIN while the current screens collect email+password. See the
// comment at the top of httpApi.ts for the full list before flipping this.
export const api = mockApi;
