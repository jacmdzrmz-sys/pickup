import clsx from 'clsx';

export default function Avatar({ name, url, size = 'md' }: { name: string; url: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const cls = clsx('shrink-0 rounded-full object-cover', size === 'sm' && 'h-7 w-7 text-xs', size === 'md' && 'h-10 w-10 text-sm', size === 'lg' && 'h-20 w-20 text-2xl');
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cls} />;
  }
  return (
    <span aria-hidden className={clsx(cls, 'flex items-center justify-center bg-dink-blue/10 font-extrabold text-dink-blue')}>
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}
