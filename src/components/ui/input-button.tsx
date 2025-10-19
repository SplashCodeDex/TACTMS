"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InputButtonContextValue {
  showInput: boolean;
  setShowInput: (show: boolean) => void;
  isLoading: boolean;
  isSuccess: boolean;
}

const InputButtonContext = React.createContext<InputButtonContextValue | undefined>(
  undefined
);

const useInputButton = () => {
  const context = React.useContext(InputButtonContext);
  if (!context) {
    throw new Error("InputButton components must be used within InputButtonProvider");
  }
  return context;
};

interface InputButtonProviderProps {
  children: React.ReactNode;
  showInput: boolean;
  setShowInput: (show: boolean) => void;
}

const InputButtonProvider: React.FC<InputButtonProviderProps> = ({
  children,
  showInput,
  setShowInput,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const value = React.useMemo(
    () => ({
      showInput,
      setShowInput,
      isLoading,
      isSuccess,
    }),
    [showInput, setShowInput, isLoading, isSuccess]
  );

  return (
    <InputButtonContext.Provider value={value}>
      {children}
    </InputButtonContext.Provider>
  );
};

interface InputButtonProps {
  children: React.ReactNode;
  className?: string;
}

const InputButton: React.FC<InputButtonProps> = ({ children, className }) => {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
};

interface InputButtonActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const InputButtonAction: React.FC<InputButtonActionProps> = ({
  children,
  onClick,
  className,
}) => {
  const { showInput, setShowInput } = useInputButton();

  return (
    <AnimatePresence mode="wait">
      {!showInput && (
        <motion.div
          key="action"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            type="button"
            variant="default"
            onClick={() => {
              setShowInput(true);
              onClick?.();
            }}
            className={cn("w-full", className)}
          >
            {children}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface InputButtonSubmitProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const InputButtonSubmit: React.FC<InputButtonSubmitProps> = ({
  children,
  onClick,
  disabled,
  className,
  type = "submit",
}) => {
  const { showInput, isLoading, isSuccess } = useInputButton();

  return (
    <AnimatePresence mode="wait">
      {showInput && (
        <motion.div
          key="submit"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            type={type}
            variant="default"
            size="sm"
            disabled={disabled || isLoading || isSuccess}
            onClick={onClick}
            className={cn(
              "shrink-0",
              (isLoading || isSuccess) && "aspect-square px-0",
              className
            )}
          >
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className="h-4 w-4" />
                </motion.span>
              ) : isLoading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </motion.span>
              ) : (
                <motion.span
                  key="text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {children}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface InputButtonInputProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const InputButtonInput: React.FC<InputButtonInputProps> = ({
  type = "email",
  placeholder = "your-email@example.com",
  value,
  onChange,
  disabled,
  autoFocus = true,
  className,
}) => {
  const { showInput, isLoading, isSuccess } = useInputButton();

  return (
    <AnimatePresence>
      {showInput && (
        <motion.div
          key="input"
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 min-w-0"
        >
          <Input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled || isLoading || isSuccess}
            autoFocus={autoFocus}
            className={cn("w-full", className)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export {
  InputButton,
  InputButtonProvider,
  InputButtonAction,
  InputButtonSubmit,
  InputButtonInput,
  useInputButton,
};