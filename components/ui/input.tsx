import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn("h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none ring-accent/30 focus:ring-2", className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
