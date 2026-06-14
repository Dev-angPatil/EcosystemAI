import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-button transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:bg-primary-disabled disabled:text-muted",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary hover:bg-primary-active",
        secondary:
          "bg-surface-card text-on-dark hover:bg-surface-elevated border border-hairline",
        "text-link":
          "bg-transparent text-on-dark hover:bg-surface-soft",
        "icon-circular":
          "bg-surface-card text-on-dark rounded-full hover:bg-surface-elevated aspect-square border border-hairline",
      },
      size: {
        default: "h-10 px-[20px] py-[12px]",
        icon: "size-[36px]",
        sm: "h-8 rounded-sm px-3",
        none: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
