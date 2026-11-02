"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Keep primary actions in the viewport, outside animated/scrolling parents. */
export function PageActions({ children, aboveNav = false }: { children: React.ReactNode; aboveNav?: boolean }) {
  const footer = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [height, setHeight] = useState(0);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !footer.current) return;
    const node = footer.current;
    const measure = () => setHeight(node.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted]);
  return <>
    <div aria-hidden="true" style={{ height: height + 12 }} />
    {mounted ? createPortal(<footer ref={footer} aria-label="화면 동작" className={`page-actions${aboveNav ? ' page-actions--above-nav' : ''}`}><div className="mx-auto w-full max-w-md space-y-2">{children}</div></footer>, document.body) : null}
  </>;
}
