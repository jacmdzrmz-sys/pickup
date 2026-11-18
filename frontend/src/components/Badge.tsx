import clsx from 'clsx';
import type { ReactNode } from 'react';

const TONES = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-900',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
  red: 'bg-red-100 text-red-800',
};

export default function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide', TONES[tone])}>
      {children}
    </span>
  );
}

export function CourtStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'reserved':
      return <Badge tone="green">RESERVED</Badge>;
    case 'drop_in':
      return <Badge tone="purple">DROP-IN</Badge>;
    case 'first_come':
      return <Badge tone="amber">FIRST COME, FIRST SERVED</Badge>;
    default:
      return <Badge tone="gray">OTHER / PRIVATE</Badge>;
  }
}

export function SettingBadge({ setting }: { setting: string }) {
  return setting === 'indoor' ? <Badge tone="blue">INDOOR</Badge> : <Badge tone="green">OUTDOOR</Badge>;
}
