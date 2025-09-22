import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        success: "status-success",
        warning: "status-warning", 
        error: "status-error",
        pending: "status-pending",
        default: "bg-muted text-muted-foreground border-muted/20",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-4 py-2 text-sm",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    }
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ 
  children, 
  variant, 
  size, 
  className, 
  showDot = true 
}: StatusBadgeProps) {
  return (
    <div className={cn(statusBadgeVariants({ variant, size, className }))}>
      {showDot && (
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === "success" && "bg-success",
          variant === "warning" && "bg-warning", 
          variant === "error" && "bg-destructive",
          variant === "pending" && "bg-primary",
          variant === "default" && "bg-muted-foreground"
        )} />
      )}
      {children}
    </div>
  );
}