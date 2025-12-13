import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { springTransitions } from "@/lib/animations"

// Create a context to share the open state with PopoverContent
const PopoverOpenContext = React.createContext<boolean>(false)

/**
 * Enhanced Popover Root that tracks open state for animation purposes.
 * Always controls the open state internally to ensure AnimatePresence works correctly.
 */
const Popover: React.FC<React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>> = ({
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
    <PopoverPrimitive.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      {...props}
    >
      <PopoverOpenContext.Provider value={isOpen}>
        {children}
      </PopoverOpenContext.Provider>
    </PopoverPrimitive.Root>
  )
}

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

/**
 * Spring-animated Popover Content using Framer Motion with exit animations.
 * Uses the standardized panelExpand spring (damping: 25, stiffness: 300).
 */
interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  container?: HTMLElement | null
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = "center", sideOffset = 4, children, container, ...props }, ref) => {
  const { side = "bottom" } = props
  const isOpen = React.useContext(PopoverOpenContext)

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
    <PopoverPrimitive.Portal forceMount container={container}>
      <AnimatePresence mode="wait">
        {isOpen && (
          <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            forceMount
            asChild
            {...props}
          >
            <motion.div
              key="popover-content"
              {...motionProps}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              transition={springTransitions.panelExpand}
              className={cn(
                "z-[150] w-72 rounded-xl border bg-[var(--bg-glass)] backdrop-blur-lg p-4 text-popover-foreground shadow-xl outline-none origin-[--radix-popover-content-transform-origin]",
                className
              )}
            >
              {children}
            </motion.div>
          </PopoverPrimitive.Content>
        )}
      </AnimatePresence>
    </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
