import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B85B43]/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.99] select-none touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-[#B85B43] text-white hover:bg-[#9c4b36] shadow-xs hover:shadow-sm",
        secondary:
          "bg-[#FAF6EE] text-[#4A392F] hover:bg-[#F0E8DA] border border-[#E0D4C2]",
        outline:
          "border border-[#E0D4C2] bg-white text-[#241A14] hover:bg-[#FAF7F0] hover:border-[#D4C6B3]",
        ghost:
          "text-[#665448] hover:text-[#241A14] hover:bg-[#EBE2D4]",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-700 shadow-xs",
        success:
          "bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs",
        link:
          "text-[#B85B43] underline-offset-4 hover:underline p-0 h-auto font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7.5 px-3 text-[11px] rounded-lg",
        lg: "h-10 px-5 text-sm",
        icon: "h-8 w-8 p-0 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
