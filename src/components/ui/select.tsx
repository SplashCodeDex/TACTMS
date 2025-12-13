import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { springTransitions } from "@/lib/animations"

// Create a context to share the open state with SelectContent
const SelectOpenContext = React.createContext<boolean>(false)

/**
 * Enhanced Select Root that tracks open state for animation purposes.
 * Always controls the open state internally to ensure AnimatePresence works correctly.
 */
const Select: React.FC<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>> = ({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
  ...props
}) => {
  // Always track state internally - this ensures AnimatePresence has the correct state
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)

  // Sync with controlled prop when it changes
  React.useEffect(() => {
    if (controlledOpen !== undefined) {
      setInternalOpen(controlledOpen)
    }
  }, [controlledOpen])

  const handleOpenChange = React.useCallback((open: boolean) => {
    // Always update internal state
    setInternalOpen(open)
    // Notify parent if handler provided
    onOpenChange?.(open)
  }, [onOpenChange])

  // Determine the actual open state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  return (
    <SelectPrimitive.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      {...props}
    >
      <SelectOpenContext.Provider value={isOpen}>
        {children}
      </SelectOpenContext.Provider>
    </SelectPrimitive.Root>
  )
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

/**
 * Spring-animated Select Content using Framer Motion with exit animations.
 * Uses the standardized panelExpand spring (damping: 25, stiffness: 300).
 */
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { side = "bottom" } = props as React.ComponentProps<typeof SelectPrimitive.Content>
  const isOpen = React.useContext(SelectOpenContext)

  // Determine directional animation with "Anticipation" exit
  const getMotionProps = () => {
    const offset = 50 // Distance to slide
    const exitDuration = 0.3

    // Helper for "Anticipation" exit: Scale UP (1.05) then DOWN (0.95) while fading
    const getExit = (axis: 'x' | 'y', value: number) => ({
      scale: [1, 1.05, 0.95],
      opacity: [1, 1, 0],
      [axis]: [0, 0, value],
      transition: { duration: exitDuration, times: [0, 0.3, 1] }
    })

    switch (side) {
      case "top": return {
        initial: { opacity: 0, scale: 0.95, y: offset },
        exit: getExit('y', offset)
      }
      case "bottom": return {
        initial: { opacity: 0, scale: 0.95, y: -offset },
        exit: getExit('y', -offset)
      }
      case "left": return {
        initial: { opacity: 0, scale: 0.95, x: offset },
        exit: getExit('x', offset)
      }
      case "right": return {
        initial: { opacity: 0, scale: 0.95, x: -offset },
        exit: getExit('x', -offset)
      }
      default: return {
        initial: { opacity: 0, scale: 0.95, y: -offset },
        exit: getExit('y', -offset)
      }
    }
  }
  const motionProps = getMotionProps()

  return (
    <SelectPrimitive.Portal forceMount>
      <AnimatePresence mode="wait">
        {isOpen && (
          <SelectPrimitive.Content
            ref={ref}
            position={position}
            forceMount
            asChild
            {...props}
          >
            <motion.div
              key="select-content"
              {...motionProps}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              transition={springTransitions.panelExpand}
              className={cn(
                "relative z-[150] max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl origin-[--radix-select-content-transform-origin]",
                position === "popper" &&
                "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
                className
              )}
            >
              <SelectScrollUpButton />
              <SelectPrimitive.Viewport
                className={cn(
                  "p-1",
                  position === "popper" &&
                  "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
                )}
              >
                {children}
              </SelectPrimitive.Viewport>
              <SelectScrollDownButton />
            </motion.div>
          </SelectPrimitive.Content>
        )}
      </AnimatePresence>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
