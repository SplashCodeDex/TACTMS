import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Spinner } from "./ui/spinner"; // Import the shadcn spinner

interface ParsingIndicatorProps {
  isOpen: boolean;
}

const ParsingIndicator: React.FC<ParsingIndicatorProps> = ({ isOpen }) => {
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
            <Spinner variant="ellipsis" size={48} className="text-[var(--brand)]" />
            <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              Parsing file...
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              This may take a moment.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ParsingIndicator;
