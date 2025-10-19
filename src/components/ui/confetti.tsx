import type { ReactNode } from "react"
import React, {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react"
import type {
  GlobalOptions as ConfettiGlobalOptions,
  CreateTypes as ConfettiInstance,
  Options as ConfettiOptions,
} from "canvas-confetti"
import confetti from "canvas-confetti"

import { Button } from "@/components/ui/button"
import { LiquidButton } from "../components/LiquidButton"

type Api = {
  fire: (options?: ConfettiOptions) => void
}

type Props = React.ComponentPropsWithRef<"canvas"> & {
  options?: ConfettiOptions
  globalOptions?: ConfettiGlobalOptions
  manualstart?: boolean
  children?: ReactNode
}

export type ConfettiRef = Api | null

const ConfettiContext = createContext<Api>({} as Api)

// Define component first
const ConfettiComponent = forwardRef<ConfettiRef, Props>((props, ref) => {
  const {
    options,
    globalOptions = { resize: true, useWorker: true },
    manualstart = false,
    children,
    ...rest
  } = props
  const instanceRef = useRef<ConfettiInstance | null>(null)

  const canvasRef = useCallback(
    (node: HTMLCanvasElement) => {
      if (node !== null) {
        if (instanceRef.current) return
        instanceRef.current = confetti.create(node, {
          ...globalOptions,
          resize: true,
        })
      } else {
        if (instanceRef.current) {
          instanceRef.current.reset()
          instanceRef.current = null
        }
      }
    },
    [globalOptions]
  )

  const fire = useCallback(
    async (opts = {}) => {
      try {
        await instanceRef.current?.({ ...options, ...opts })
      } catch (error) {
        console.error("Confetti error:", error)
      }
    },
    [options]
  )

  const api = useMemo(
    () => ({
      fire,
    }),
    [fire]
  )

  useImperativeHandle(ref, () => api, [api])

  useEffect(() => {
    if (!manualstart) {
      ;(async () => {
        try {
          await fire()
        } catch (error) {
          console.error("Confetti effect error:", error)
        }
      })()
    }
  }, [manualstart, fire])

  return (
    <ConfettiContext.Provider value={api}>
      <canvas ref={canvasRef} {...rest} />
      {children}
    </ConfettiContext.Provider>
  )
})

// Set display name immediately
ConfettiComponent.displayName = "Confetti"

// Export as Confetti
export const Confetti = ConfettiComponent

interface ConfettiButtonProps extends React.ComponentProps<"button"> {
  options?: ConfettiOptions &
    ConfettiGlobalOptions & { canvas?: HTMLCanvasElement }
}

const ConfettiButtonComponent = ({
  options,
  children,
  ...props
}: ConfettiButtonProps) => {
  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      await confetti({
        ...options,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
      })
    } catch (error) {
      console.error("Confetti button error:", error)
    }
  }

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  )
}

// Custom wrapper for the project's existing Button component
interface DownloadButtonWithConfettiProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: string;
  size?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DownloadButtonWithConfetti: React.FC<DownloadButtonWithConfettiProps> = ({
  onClick,
  children,
  ...props
}) => {
  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Fire confetti animation
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    // Custom confetti options for download celebration
    await confetti({
      particleCount: 100,
      spread: 70,
      origin: {
        x: x / window.innerWidth,
        y: y / window.innerHeight,
      },
      colors: ['#10B981', '#059669', '#047857', '#065F46'], // Green colors for success
      gravity: 0.8,
      drift: 0.1,
      ticks: 200,
    })

    // Call the original onClick handler
    onClick?.()
  }

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  )
}

// Custom wrapper for LiquidButton component
interface LiquidDownloadButtonWithConfettiProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: string;
  size?: string;
}

export const LiquidDownloadButtonWithConfetti: React.FC<LiquidDownloadButtonWithConfettiProps> = ({
  onClick,
  children,
  ...props
}) => {
  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Fire confetti animation
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    // Custom confetti options for download celebration
    await confetti({
      particleCount: 100,
      spread: 70,
      origin: {
        x: x / window.innerWidth,
        y: y / window.innerHeight,
      },
      colors: ['#10B981', '#059669', '#047857', '#065F46'], // Green colors for success
      gravity: 0.8,
      drift: 0.1,
      ticks: 200,
    })

    // Call the original onClick handler
    onClick?.()
  }

  return (
    <LiquidButton onClick={handleClick} {...props}>
      {children}
    </LiquidButton>
  )
}

ConfettiButtonComponent.displayName = "ConfettiButton"

export const ConfettiButton = ConfettiButtonComponent

// Export the new wrapper components
export { DownloadButtonWithConfetti, LiquidDownloadButtonWithConfetti }
