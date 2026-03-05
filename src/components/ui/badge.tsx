import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-0.5 text-xs ui-font-semibold tracking-wider uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-[var(--color-text-accent)] to-[#7c3aed] text-white shadow-[0_0_10px_var(--color-accent-primary-soft)]",
        secondary: "border-surface-strong bg-[rgba(255,255,255,0.04)] text-[#7a7f8e]",
        destructive: "border-transparent bg-[rgba(255,59,92,0.15)] text-[#ff6b8a]",
        outline: "border-[rgba(255,255,255,0.1)] text-[#7a7f8e]",
        success: "border-transparent bg-[rgba(52,211,153,0.12)] text-[#34d399]",
        warning: "border-transparent bg-[rgba(251,191,36,0.12)] text-[#fbbf24]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
