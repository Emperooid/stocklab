// Public key only. See .env.example — the secret key never belongs in this app.
export const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';

export function isPaystackConfigured(): boolean {
  return PAYSTACK_PUBLIC_KEY.startsWith('pk_');
}
