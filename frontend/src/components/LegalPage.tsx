import type { ReactNode } from 'react';

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">Last updated {updated}</p>
      <div className="legal mt-6 space-y-4 text-gray-800 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_a]:font-semibold [&_a]:text-blue-700 [&_a]:underline">
        {children}
      </div>
    </main>
  );
}
