import React, { useState } from "react";
import { Mail, Check, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NewsletterSignupProps {
  onSubscribe?: (email: string) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  className?: string;
}

/**
 * Newsletter signup component with smooth animations
 * Perfect for church announcements, prayer requests, or community updates
 */
export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  onSubscribe,
  placeholder = "Enter your email for church updates...",
  buttonText = "Subscribe",
  className,
}) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter a valid email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (onSubscribe) {
        await onSubscribe(email);
      }

      setIsSuccess(true);
      setEmail("");

      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setShowInput(false);
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null); // Clear error when user starts typing
  };

  return (
    <div className={`w-full max-w-md ${className || ""}`}>
      <AnimatePresence mode="wait">
        {!showInput ? (
          <motion.button
            key="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowInput(true)}
            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Mail size={16} className="mr-2" />
            {buttonText}
          </motion.button>
        ) : (
          <motion.div
            key="input-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2"
          >
            <motion.input
              layoutId="email-input"
              type="email"
              placeholder={placeholder}
              value={email}
              onChange={handleEmailChange}
              disabled={isLoading || isSuccess}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            <motion.button
              layoutId="submit-button"
              onClick={handleSubmit}
              disabled={isLoading || isSuccess || !email.trim()}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isSuccess ? (
                <Check size={16} />
              ) : (
                <ArrowRight size={16} />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-600 mt-2 flex items-center gap-2"
          >
            <span className="w-1 h-1 bg-red-600 rounded-full" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Success message */}
      <AnimatePresence>
        {isSuccess && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-green-600 mt-2 flex items-center gap-2"
          >
            <Check size={14} className="text-green-600" />
            Successfully subscribed! Check your email for confirmation.
          </motion.p>
        )}
      </AnimatePresence>
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