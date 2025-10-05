'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/app/LoginForm';

function LoginPageContent() {
    return <LoginForm />;
}

export default function LoginPage() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginPageContent />
      </Suspense>
    </div>
  );
}
