'use client';

import { useState } from 'react';

export function getUserInitials(name?: string | null) {
  return (
    name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  );
}

export default function DashboardAvatar({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = size === 'sm' ? 'size-7' : size === 'lg' ? 'size-10' : 'size-9';

  if (src && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || 'User'}
        className={`${sizeClass} rounded-full object-cover`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex items-center justify-center rounded-full bg-[#6258ff] text-xs font-semibold text-white`}
    >
      {getUserInitials(name)}
    </span>
  );
}
