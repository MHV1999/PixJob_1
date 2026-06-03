import type { Metadata, ReactNode } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage(): ReactNode {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-600">PixJob</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>
        <div className="rounded-xl border bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
