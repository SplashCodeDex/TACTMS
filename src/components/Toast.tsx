import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Info as InfoIcon,
  AlertTriangle,
  X,
} from "lucide-react";
import Button from "./Button";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "subtle" | "danger";
}
export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  actions?: ToastAction[];
}

interface ToastProps extends ToastMessage {
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="text-[var(--success-text)]" size={22} />,
  error: <XCircle className="text-[var(--danger-text)]" size={22} />,
  info: <InfoIcon className="text-[var(--secondary-accent-end)]" size={22} />,
  warning: <AlertTriangle className="text-[var(--warning-text)]" size={22} />,
};

const toastColors: Record<ToastType, string> = {
  success:
    "border-[var(--success-border)] bg-[var(--bg-card)] text-[var(--success-text)]",
  error:
    "border-[var(--danger-border)] bg-[var(--bg-card)] text-[var(--danger-text)]",
  info: "border-[var(--secondary-accent-end)] bg-[var(--bg-card)] text-[var(--text-primary)]",
  warning:
    "border-[var(--warning-border)] bg-[var(--bg-card)] text-[var(--warning-text)]",
};

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = 5000,
  actions,
  onDismiss,
}) => {
  useEffect(() => {
    if (duration && duration !== Infinity) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [id, duration, onDismiss]);

  const handleManualDismiss = () => {
    onDismiss(id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      role="alert"
      aria-live={
        type === "error" || type === "warning" ? "assertive" : "polite"
      }
      className={`w-full max-w-md p-4 rounded-xl shadow-xl border-l-4 flex flex-col mb-3 ${toastColors[type]}`}
      style={{ backdropFilter: "blur(5px)" }}
    >
      <div className="flex items-start space-x-3.5">
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
        <p
          className={`flex-grow text-sm font-medium min-w-0 break-words ${type === "info" ? "text-[var(--text-primary)]" : ""}`}
        >
          {message}
        </p>
        <button
          onClick={handleManualDismiss}
          className="ml-auto -mr-1 -my-1 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
      </div>
      {actions && actions.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-color)]/30 flex gap-2.5 justify-end">
          {actions.map((action) => (
            <Button
              key={action.label}
              onClick={() => {
                action.onClick();
                handleManualDismiss();
              }}
              size="sm"
              variant={action.variant || "subtle"}
              className="!text-xs !px-3 !py-1"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-md">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};
