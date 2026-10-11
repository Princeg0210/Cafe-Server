import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#FAF6EE] text-[#B85B43] border border-[#E0D4C2]",
        secondary:
          "bg-[#F3EDE2] text-[#4A392F] border border-[#E6DCCF]",
        success:
          "bg-emerald-50 text-emerald-800 border border-emerald-200",
        warning:
          "bg-amber-50 text-amber-800 border border-amber-200",
        destructive:
          "bg-rose-50 text-rose-800 border border-rose-200",
        outline:
          "border border-[#E0D4C2] text-[#665448]",
        solid:
          "bg-[#B85B43] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
