import Link from 'next/link';
import type { ComponentProps } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from './button';

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link className={buttonVariants({ variant, size, className })} {...props} />;
}
