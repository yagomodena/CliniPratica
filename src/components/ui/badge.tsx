
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: // Added success variant
          "border-transparent bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200",
        warning: // Added warning variant
          "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, // Changed from HTMLDivElement
    VariantProps<typeof badgeVariants> {}

// Pass className to cn() to allow overriding/extending base styles
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} /> // Changed from div to span
  )
}

export { Badge, badgeVariants }

