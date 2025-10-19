"use client";

import React from "react";
import { X, ArrowLeft, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SmartDismissButtonProps {
  isCollapsed: boolean;
  isMobile: boolean;
  isSmallMobile: boolean;
  isLandscape: boolean;
  onClose?: () => void;
  className?: string;
  variant?: "close" | "back" | "minimize";
  size?: "sm" | "md" | "lg";
}

/**
 * Intelligent dismiss button that adapts to screen size, orientation, and sidebar state
 * Provides optimal UX across all devices with contextual icons and behaviors
 */
export const SmartDismissButton: React.FC<SmartDismissButtonProps> = ({
  isCollapsed,
  isMobile,
  isSmallMobile,
  isLandscape,
  onClose,
  className,
  variant = "close",
  size = "md",
}) => {
  // Intelligent icon selection based on context
  const getIcon = () => {
    if (isMobile) {
      if (isLandscape && !isCollapsed) {
        return <ArrowLeft size={getIconSize()} />; // Suggest going back in landscape
      }
      return <X size={getIconSize()} />; // Standard close on mobile
    }

    if (isCollapsed) {
      return <Minimize2 size={getIconSize()} />; // Minimize icon when collapsed
    }

    return <X size={getIconSize()} />; // Standard close when expanded
  };

  // Intelligent sizing based on screen and state
  const getIconSize = () => {
    if (isSmallMobile) return 18; // Smaller icon for very small screens
    if (isMobile) return 20; // Standard mobile size
    if (isCollapsed) return 16; // Smaller for collapsed state
    return 20; // Standard desktop size
  };

  // Intelligent button sizing
  const getButtonSize = () => {
    if (isSmallMobile) return "sm"; // Smaller button for small screens
    if (isMobile) return "md"; // Standard mobile button
    return size; // Use specified size for desktop
  };

  // Context-aware aria label
  const getAriaLabel = () => {
    if (isMobile) {
      if (isLandscape) {
        return "Return to main content";
      }
      return "Close sidebar menu";
    }

    if (isCollapsed) {
      return "Minimize sidebar";
    }

    return "Close sidebar";
  };

  // Intelligent positioning and styling
  const getButtonStyles = () => {
    const baseStyles = {
      minWidth: isSmallMobile ? "48px" : "44px",
      minHeight: isSmallMobile ? "48px" : "44px",
      touchAction: "manipulation" as const,
    };

    if (isMobile) {
      return {
        ...baseStyles,
        position: "absolute" as const,
        top: isLandscape ? "1rem" : "0.75rem",
        right: isLandscape ? "1rem" : "0.75rem",
        zIndex: 60,
      };
    }

    return baseStyles;
  };

  // Animation variants based on device and state
  const getAnimationVariants = () => {
    if (isMobile) {
      return {
        initial: { opacity: 0, scale: 0.8, x: 20 },
        animate: { opacity: 1, scale: 1, x: 0 },
        exit: { opacity: 0, scale: 0.8, x: 20 },
        transition: { duration: 0.2, ease: "easeOut" }
      };
    }

    return {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: 0.15 }
    };
  };

  const buttonContent = (
    <Button
      onClick={onClose}
      variant="ghost"
      size={getButtonSize()}
      className={cn(
        "transition-all duration-200",
        isMobile && "hover:bg-white/20 backdrop-blur-sm",
        !isMobile && "hover:bg-[var(--bg-card-subtle-accent)]",
        className
      )}
      aria-label={getAriaLabel()}
      style={getButtonStyles()}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${isCollapsed}-${isMobile}-${variant}`}
          {...getAnimationVariants()}
        >
          {getIcon()}
        </motion.div>
      </AnimatePresence>
    </Button>
  );

  // Mobile gets absolute positioning, desktop gets inline
  if (isMobile) {
    return (
      <motion.div
        className="absolute top-4 right-4 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        {buttonContent}
      </motion.div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="self-end mr-4 mb-2">
          {buttonContent}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{getAriaLabel()}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SmartDismissButton;