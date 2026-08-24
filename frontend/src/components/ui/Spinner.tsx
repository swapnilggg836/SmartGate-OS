import React from 'react';

export function Spinner({ size = 'md', white = false }: { size?: 'sm' | 'md' | 'lg'; white?: boolean }) {
  return <div className={`spinner ${size} ${white ? 'white' : ''}`} />;
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
      <Spinner size="lg" />
      <p style={{ color: 'var(--slate-400)', fontSize: '0.8125rem' }}>Loading…</p>
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div className="skeleton" style={{ height: 14, borderRadius: 4, width: i === 0 ? '80%' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}
