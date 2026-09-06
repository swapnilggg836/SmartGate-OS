import React, { useState, useEffect } from 'react';

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ firstName, lastName, avatarUrl, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const src = (!imgError && avatarUrl) ? avatarUrl : '/default-avatar.png';

  return (
    <div
      className={`avatar ${size} ${className}`}
      style={{
        overflow: 'hidden',
        position: 'relative',
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e2e8f0',
        flexShrink: 0
      }}
    >
      <img
        src={src}
        alt={`${firstName || ''} ${lastName || ''}`}
        onError={() => setImgError(true)}
        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
      />
    </div>
  );
}
