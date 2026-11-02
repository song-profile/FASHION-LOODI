import type { ReactNode } from 'react';

export function ScreenHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="screen-header">
    <div className="flex items-center justify-between gap-3"><p className="screen-eyebrow">{eyebrow}</p>{action}</div>
    <h1>{title}</h1>
    <p className="screen-description">{description}</p>
  </header>;
}
