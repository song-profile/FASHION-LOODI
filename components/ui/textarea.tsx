import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn("min-h-24 w-full rounded-2xl border border-border bg-card px-3 py-2 text-base transition-colors placeholder:text-primary/35 disabled:opacity-50 outline-none ring-accent/20 focus:ring-2", className)}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
