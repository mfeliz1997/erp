'use client';

import { useTransition } from 'react';
import { toggleEmployeeAlertAction } from '@/modules/fiscal/actions';

export function ToggleAlertAction({ employeeId, isActive }: { employeeId: string, isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => toggleEmployeeAlertAction(employeeId, isActive))}
      disabled={isPending}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
        isActive ? 'bg-black' : 'bg-gray-200'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="sr-only">Toggle alert</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          isActive ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}