import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import NavItem from "./NavItem";

const NavigationGroup: React.FC<{
  title: string;
  icon: React.ElementType;
  items: Array<{ icon: React.ElementType; label: string; to: string }>;
  isCollapsed: boolean;
  defaultExpanded?: boolean;
}> = ({ title, icon: GroupIcon, items, isCollapsed, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
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
    // In collapsed mode, show group icon that opens a fly-out menu
    return (
      <div className="relative" ref={flyoutRef}>
        <button
          onClick={() => setIsFlyoutOpen(!isFlyoutOpen)}
          onMouseEnter={() => setIsFlyoutOpen(true)}
          onMouseLeave={() => setTimeout(() => setIsFlyoutOpen(false), 300)}
          className="w-full flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all min-w-[48px] min-h-[48px] p-4"
          aria-label={`${title} menu`}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            touchAction: "manipulation",
          }}
        >
          <GroupIcon size={20} />
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
                  {items.map((item, index) => (
                    <NavItem
                      key={`${item.to}-${index}`}
                      icon={item.icon}
                      label={item.label}
                      to={item.to}
                      isCollapsed={false}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // In expanded mode, show collapsible group
  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
      >
        <GroupIcon size={18} className="mr-3 flex-shrink-0" />
        <span className="flex-grow text-left">{title}</span>
        {isExpanded ? (
          <ChevronUp size={16} className="flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-6 space-y-1"
          >
            {items.map((item, index) => (
              <NavItem
                key={`${item.to}-${index}`}
                icon={item.icon}
                label={item.label}
                to={item.to}
                isCollapsed={false}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NavigationGroup;
