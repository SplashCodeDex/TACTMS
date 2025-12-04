import { toast as sonnerToast } from "sonner";

export type AppToastType = "success" | "error" | "info" | "warning";

export interface AppToastAction {
  label: string;
  onClick: () => void;
}

export interface AppToastOptions {
  id?: string | number;
  message: string;
  type?: AppToastType;
  duration?: number; // ms
  actions?: AppToastAction[]; // Only the first action is mapped natively by Sonner
  description?: string;
}

// Centralized toast helper built on Sonner.
// Note: Sonner supports a single primary action; if more are passed, only the first is used.
export function showToast({ id, message, type = "info", duration, actions, description }: AppToastOptions): string | number {
  const primaryAction = actions && actions.length > 0 ? actions[0] : undefined;

  const baseOptions = {
    id,
    duration,
    description,
    action: primaryAction
      ? { label: primaryAction.label, onClick: primaryAction.onClick }
      : undefined,
  } as const;

  switch (type) {
    case "success":
      return sonnerToast.success(message, baseOptions);
    case "error":
      return sonnerToast.error(message, baseOptions);
    case "warning":
      return sonnerToast.warning(message, baseOptions);
    case "info":
    default:
      return sonnerToast(message, baseOptions);
  }
}

export function dismissToast(id?: string | number) {
  // If id is omitted, Sonner will dismiss the most recent toast
  // but we keep the signature flexible for convenience.
  return sonnerToast.dismiss(id);
}

export const toast = {
  show: showToast,
  dismiss: dismissToast,
};
