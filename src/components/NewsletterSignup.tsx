"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import {
  InputButton,
  InputButtonAction,
  InputButtonProvider,
  InputButtonSubmit,
  InputButtonInput,
} from "@/components/ui/input-button";

interface NewsletterSignupProps {
  onSubscribe?: (email: string) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  className?: string;
  isCollapsed?: boolean;
}

/**
 * Newsletter signup component using shadcn/ui InputButton compound component
 * Perfect for church announcements, prayer requests, or community updates
 */
export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  onSubscribe,
  placeholder = "Enter your email for church updates...",
  buttonText = "Subscribe",
  className,
  isCollapsed = false,
}) => {
  const [showInput, setShowInput] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [success, setSuccess] = React.useState(false);
  const [value, setValue] = React.useState("");

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!showInput) {
        setShowInput(true);
        return;
      }

      if (!value.trim()) {
        return;
      }

      startTransition(async () => {
        try {
          // Call the onSubscribe prop if provided
          if (onSubscribe) {
            await onSubscribe(value);
          } else {
            // Default simulation
            await sleep(2000);
          }

          setSuccess(true);
          await sleep(2000);
          setSuccess(false);
          setShowInput(false);
          setValue("");
        } catch (error) {
          console.error("Newsletter signup error:", error);
        }
      });
    },
    [showInput, value, onSubscribe]
  );

  return (
    <div className={`w-full ${isCollapsed ? "max-w-[44px]" : "max-w-md"} ${className || ""}`}>
      <form onSubmit={handleSubmit} className="w-full flex items-center justify-center">
        <InputButtonProvider showInput={showInput} setShowInput={setShowInput}>
          <InputButton>
            <InputButtonAction>
              <Mail size={isCollapsed ? 20 : 16} className={isCollapsed ? "" : "mr-2"} />
              {!isCollapsed && buttonText}
            </InputButtonAction>
            <InputButtonSubmit
              type="submit"
              disabled={pending}
              className={pending || success ? "aspect-square px-0" : ""}
            >
              {success ? "✓" : pending ? "⟳" : "→"}
            </InputButtonSubmit>
          </InputButton>
          <InputButtonInput
            type="email"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            autoFocus
          />
        </InputButtonProvider>
      </form>
    </div>
  );
};

/**
 * Newsletter signup skeleton for loading states
 */
export const NewsletterSignupSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-md space-y-2">
      <div className="h-10 w-full rounded-lg bg-primary/10 animate-pulse" />
      <div className="h-4 w-[200px] bg-muted animate-pulse" />
    </div>
  );
};