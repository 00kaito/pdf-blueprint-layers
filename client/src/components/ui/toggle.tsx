import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// "On" is a solid primary background so an active tool / mode is obvious at a glance. It keys off
// aria-pressed, not data-state: a TooltipTrigger with asChild overwrites data-state with its own
// "closed" / "delayed-open". aria-checked covers single-choice ToggleGroup items. Hover styles
// only apply on devices that really hover — on touch they would stick after a tap and look "on".
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors [@media(hover:hover)]:hover:bg-muted [@media(hover:hover)]:hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-sm [@media(hover:hover)]:aria-pressed:hover:bg-primary/90 [@media(hover:hover)]:aria-pressed:hover:text-primary-foreground aria-checked:bg-primary aria-checked:text-primary-foreground aria-checked:shadow-sm [@media(hover:hover)]:aria-checked:hover:bg-primary/90 [@media(hover:hover)]:aria-checked:hover:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-sm [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
