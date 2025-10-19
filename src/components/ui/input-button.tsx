"use client";

import * as React from "react";
import { motion, Transition } from "framer-motion";
import { cn } from "@/lib/utils";

interface InputButtonContextValue {
  showInput: boolean;
  setShowInput: (show: boolean) => void;
  transition: Transition;
  id: string;
}

const InputButtonContext = React.createContext<InputButtonContextValue | undefined>(
  undefined
);

interface InputButtonProviderProps {
  children: React.ReactNode;
  showInput?: boolean;
  onShowInputChange?: (show: boolean) => void;
  transition?: Transition;
}

const InputButtonProvider: React.FC<InputButtonProviderProps> = ({
  children,
  showInput: controlledShowInput,
  onShowInputChange,
  transition = { type: "spring", stiffness: 300, damping: 20 },
}) => {
  const [internalShowInput, setInternalShowInput] = React.useState(false);
  const id = React.useId();

  const showInput = controlledShowInput ?? internalShowInput;
  const setShowInput = React.useCallback((show: boolean) => {
    if (controlledShowInput === undefined) {
      setInternalShowInput(show);
    }
    onShowInputChange?.(show);
  }, [controlledShowInput, onShowInputChange]);

  return (
    <InputButtonContext.Provider value={{ showInput, setShowInput, transition, id }}>
      <div className="relative inline-flex items-center">
        {children}
      </div>
    </InputButtonContext.Provider>
  );
};

interface InputButtonActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const InputButtonAction: React.FC<InputButtonActionProps> = ({
  children,
  className,
  onClick,
  ...props
}) => {
  const context = React.useContext(InputButtonContext);
  if (!context) {
    throw new Error("InputButtonAction must be used within InputButtonProvider");
  }

  const { setShowInput, transition, id } = context;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowInput(true);
    onClick?.(e);
  };

  return (
    <motion.button
      layoutId={`${id}-button`}
      transition={transition}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "h-10 px-4 py-2",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};

interface InputButtonSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  icon?: React.ElementType;
}

const InputButtonSubmit: React.FC<InputButtonSubmitProps> = ({
  children,
  icon: Icon = () => null,
  className,
  ...props
}) => {
  const context = React.useContext(InputButtonContext);
  if (!context) {
    throw new Error("InputButtonSubmit must be used within InputButtonProvider");
  }

  const { showInput, setShowInput, transition, id } = context;

  if (!showInput) {
    return (
      <motion.div
        layoutId={`${id}-icon`}
        transition={transition}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "h-10 w-10",
          className
        )}
      >
        <Icon size={16} />
      </motion.div>
    );
  }

  return (
    <motion.button
      layoutId={`${id}-button`}
      transition={transition}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "h-10 px-4 py-2",
        className
      )}
      {...props}
    >
      {children || <Icon size={16} />}
    </motion.button>
  );
};

interface InputButtonInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (value: string) => void;
}

const InputButtonInput: React.FC<InputButtonInputProps> = ({
  className,
  onChange,
  ...props
}) => {
  const context = React.useContext(InputButtonContext);
  if (!context) {
    throw new Error("InputButtonInput must be used within InputButtonProvider");
  }

  const { showInput, transition, id } = context;
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  if (!showInput) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
    props.onChange?.(e);
  };

  return (
    <motion.input
      ref={inputRef}
      layoutId={`${id}-input`}
      transition={transition}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  );
};

export {
  InputButtonProvider,
  InputButtonAction,
  InputButtonSubmit,
  InputButtonInput,
};