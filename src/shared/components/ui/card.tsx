import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const cardVariants = cva(
  "rounded-lg",
  {
    variants: {
      variant: {
        dark: "bg-surface-card text-on-dark border border-hairline",
        yellow: "bg-primary text-on-yellow",
        "code-window": "bg-surface-card border border-hairline text-code font-mono overflow-hidden",
      },
    },
    defaultVariants: {
      variant: "dark",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export { Card, cardVariants };
