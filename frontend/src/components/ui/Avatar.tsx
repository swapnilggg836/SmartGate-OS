import React from 'react';
import { initials } from '@/lib/utils';

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ firstName, lastName, avatarUrl, size = 'md' }: AvatarProps) {
  return (
    <div className={`avatar ${size}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={`${firstName} ${lastName}`} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        initials(firstName, lastName)
      )}
    </div>
  );
}
