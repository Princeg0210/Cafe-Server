import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl border border-[#E0D4C2] bg-[#FFFDF9] px-3 py-1 text-xs text-[#241A14] shadow-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-[#A8988B] focus-visible:outline-none focus-visible:border-[#B85B43] focus-visible:ring-1 focus-visible:ring-[#B85B43] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
