import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const NavItem = React.forwardRef<
  HTMLAnchorElement,
  {
    icon: React.ElementType;
    label: string;
    to: string;
    isCollapsed: boolean;
  }
>(({ icon: Icon, label, to, isCollapsed }, ref) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const activeClass =
    "bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-white shadow-lg shadow-[var(--primary-accent-start)]/20";
  const inactiveClass =
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5";

  return (
    <Link
      to={to}
      ref={ref}
      className={`flex items-center rounded-lg text-sm font-semibold transition-all duration-200 ${isActive ? activeClass : inactiveClass} ${
        isCollapsed
          ? "justify-center min-w-[48px] min-h-[48px] p-2"
          : "w-full px-4 py-3"
      }`}
      aria-current={isActive ? "page" : undefined}
      style={{
        // Ensure minimum touch target size
        minHeight: isCollapsed ? "44px" : "auto",
        minWidth: isCollapsed ? "44px" : "auto",
        touchAction: "manipulation",
      }}
    >
      <Icon size={20} className="flex-shrink-0" />
      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, width: "auto", marginLeft: "0.75rem" }}
            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
});

export default NavItem;
