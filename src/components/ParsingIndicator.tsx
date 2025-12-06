import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Spinner } from "./ui/spinner"; // Import the shadcn spinner

interface ParsingIndicatorProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
}

const ParsingIndicator: React.FC<ParsingIndicatorProps> = ({
  isOpen,
  message = "Parsing file...",
  subMessage = "This may take a moment."
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center justify-center p-8 bg-[var(--bg-elevated)] rounded-lg shadow-xl"
          >
            <Spinner className="h-12 w-12 text-[var(--brand)]" />
            <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              {message}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {subMessage}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ParsingIndicator;
