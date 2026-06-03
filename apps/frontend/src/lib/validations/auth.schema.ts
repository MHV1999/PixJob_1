import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/,
      'Password must contain uppercase, lowercase, number and special character',
    ),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required').max(320),
  password: z.string().min(1, 'Password is required').max(72),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(6, 'Invalid token').max(128),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;
