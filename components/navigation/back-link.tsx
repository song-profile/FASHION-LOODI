import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
export function BackLink({ href = '/closet', label = '뒤로' }: { href?: string; label?: string }) {
  return <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft size={18} /><span>{label}</span></Link>;
}
