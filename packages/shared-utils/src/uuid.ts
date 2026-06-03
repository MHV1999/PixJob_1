import { randomUUID } from 'crypto';

/** Generate a v4 UUID. Used across the entire platform. */
export function generateUUID(): string {
  return randomUUID();
}
