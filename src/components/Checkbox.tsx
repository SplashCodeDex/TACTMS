import React from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    onChange,
    disabled = false,
    className = "",
}) => {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`
        relative flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${checked
                    ? "bg-[var(--primary-accent-start)] border-[var(--primary-accent-start)]"
                    : "bg-transparent border-[var(--text-muted)] hover:border-[var(--primary-accent-start)]"
                }
        ${className}
      `}
        >
            <AnimatePresence>
                {checked && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "backOut" }}
                    >
                        <Check size={14} className="text-white stroke-[3]" />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
};

export default Checkbox;
