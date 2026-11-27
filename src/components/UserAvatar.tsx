import React, { useEffect, useMemo, useState } from 'react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  sizeClass?: string;
  textSizeClass?: string;
  className?: string;
  alt?: string;
}

export function getAvatarInitials(name: string): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'K';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function getSafeHttpUrl(raw?: string | null): string | null {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  sizeClass = 'w-9 h-9',
  textSizeClass = 'text-xs',
  className = '',
  alt,
}) => {
  const safeUrl = useMemo(() => getSafeHttpUrl(avatarUrl), [avatarUrl]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [safeUrl]);

  const initials = useMemo(() => getAvatarInitials(name), [name]);

  return (
    <span
      className={`${sizeClass} rounded-full bg-teal-700 text-white ${textSizeClass} font-bold inline-flex items-center justify-center shrink-0 overflow-hidden select-none ${className}`.trim()}
    >
      {safeUrl && !hasError ? (
        <img
          src={safeUrl}
          alt={alt || name || 'Avatar'}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
};
