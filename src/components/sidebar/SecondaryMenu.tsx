import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper function for feature descriptions
const getFeatureDescription = (feature: string): string => {
    const descriptions: Record<string, string> = {
      "Events": "Manage church events and calendar",
      "Worship": "Worship team resources and planning",
      "Bible Study": "Study materials and group management",
      "Prayer Requests": "Community prayer coordination",
      "Small Groups": "Small group directories and schedules",
      "Bulletin": "Weekly bulletin and announcements",
      "Giving Trends": "Financial trends and analytics",
    };
    return descriptions[feature] || "Additional church feature";
  };

const SecondaryMenu: React.FC<{
  title: string;
  items: Array<{
    icon: React.ElementType;
    label: string;
    to: string;
    badge?: string;
    onClick?: () => void;
  }>;
  isCollapsed: boolean;
}> = ({ title, items, isCollapsed }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = React.useState(false);
  const flyoutRef = React.useRef<HTMLDivElement>(null);

  // Close flyout when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target as Node)) {
        setIsFlyoutOpen(false);
      }
    };

    if (isFlyoutOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFlyoutOpen]);

  if (isCollapsed) {
    return (
      <div className="relative" ref={flyoutRef}>
        <button
          onClick={() => setIsFlyoutOpen(!isFlyoutOpen)}
          onMouseEnter={() => setIsFlyoutOpen(true)}
          onMouseLeave={() => setTimeout(() => setIsFlyoutOpen(false), 300)}
          className="w-full flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all min-w-[48px] min-h-[48px] p-4"
          aria-label={`${title} menu`}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            touchAction: "manipulation",
          }}
        >
          <Settings size={18} />
        </button>

        {/* Fly-out menu */}
        <AnimatePresence>
          {isFlyoutOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-full top-0 ml-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg z-50"
              onMouseEnter={() => setIsFlyoutOpen(true)}
              onMouseLeave={() => setIsFlyoutOpen(false)}
            >
              <div className="p-2">
                <div className="px-2 py-1.5 text-sm font-semibold text-[var(--text-secondary)] border-b border-[var(--border-color)] mb-2">
                  {title}
                </div>
                <div className="space-y-1">
                  {items.map((item, index) =>
                    item.onClick ? (
                      <button
                        key={`${item.label}-${index}`}
                        onClick={item.onClick}
                        className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
                        aria-label={item.label}
                      >
                        <item.icon size={16} className="mr-3 flex-shrink-0" />
                        <span className="flex-grow">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    ) : (
                      <Link
                        key={`${item.to}-${index}`}
                        to={item.to}
                        className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
                        aria-label={item.label}
                      >
                        <item.icon size={16} className="mr-3 flex-shrink-0" />
                        <span className="flex-grow">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
              aria-label={`${title} menu`}
            >
              <Settings size={16} className="mr-3" />
              <span className="flex-grow text-left">{title}</span>
              {isVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Additional church features and tools</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 space-y-1"
          >
            {items.map((item, index) => (
              <TooltipProvider key={`${item.label}-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {item.onClick ? (
                      <button
                        onClick={item.onClick}
                        className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
                        aria-label={item.label}
                      >
                        <item.icon size={16} className="mr-3 flex-shrink-0" />
                        <span className="flex-grow">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    ) : (
                      <Link
                        to={item.to}
                        className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
                        aria-label={item.label}
                      >
                        <item.icon size={16} className="mr-3 flex-shrink-0" />
                        <span className="flex-grow">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>
                      {item.label} - {getFeatureDescription(item.label)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecondaryMenu;
