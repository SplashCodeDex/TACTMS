import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BotMessageSquare,
  Cpu,
  Star,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  LogIn,
  PieChart,
  Check,
  Database,
  LayoutDashboard,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Users,
  FileText,
  BarChart3,
  Heart,
  Calendar,
  Music,
  BookOpen,
  Shield,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "./Button";
import { NewsletterSignup } from "./NewsletterSignup";
import { GoogleUserProfile } from "../types";
import { THEME_OPTIONS } from "../constants";
import SyncStatusIndicator from "./SyncStatusIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import SmartDismissButton from "./SmartDismissButton";
import { cn } from "@/lib/utils";

// Sidebar Context for state management
interface SidebarContextType {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  accentColor: ThemeOption;
  setAccentColor: (option: ThemeOption) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isLoggedIn: boolean;
  userProfile: GoogleUserProfile | null;
  syncStatus: SyncStatus;
  signIn: () => void;
  signOut: () => void;
  isConfigured: boolean;
  openCommandPalette: () => void;
  isOnline: boolean;
  onClose?: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

// Custom hook for sidebar state management
export const useSidebar = () => {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// Error Boundary for sidebar
class SidebarErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Sidebar error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="sidebar glassmorphism-bg collapsed" style={{ width: "4rem" }}>
          <div className="flex flex-col items-center p-4 text-[var(--text-muted)]">
            <p className="text-xs">Error</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced responsive design hook with better breakpoints
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
};

// Enhanced reduced motion hook with performance monitoring
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);

    const listener = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return prefersReducedMotion;
};

// Device capability detection
const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = React.useState({
    isLowEndDevice: false,
    supportsIntersectionObserver: false,
    supportsTouch: false,
    screenWidth: 1024,
    screenHeight: 768,
  });

  React.useEffect(() => {
    const updateCapabilities = () => {
      setCapabilities({
        isLowEndDevice: navigator.hardwareConcurrency <= 2,
        supportsIntersectionObserver: "IntersectionObserver" in window,
        supportsTouch: "ontouchstart" in window,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
      });
    };

    updateCapabilities();
    window.addEventListener("resize", updateCapabilities);
    return () => window.removeEventListener("resize", updateCapabilities);
  }, []);

  return capabilities;
};

type SyncStatus = "idle" | "syncing" | "synced" | "error";
type ThemeOption = (typeof THEME_OPTIONS)[0];

interface SidebarProps {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  accentColor: ThemeOption;
  setAccentColor: (option: ThemeOption) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isLoggedIn: boolean;
  userProfile: GoogleUserProfile | null;
  syncStatus: SyncStatus;
  signIn: () => void;
  signOut: () => void;
  isConfigured: boolean;
  openCommandPalette: () => void;
  isOnline: boolean;
  onClose?: () => void; // For mobile overlay close
}

const itemVariants = {
  hidden: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  visible: { opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.2 } },
};

const logoVariants = {
  collapsed: { height: "64px", transition: { duration: 0.3 } }, // h-16
  expanded: { height: "96px", transition: { duration: 0.3 } }, // h-24
};

const NavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  to: string;
  isCollapsed: boolean;
}> = ({ icon: Icon, label, to, isCollapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const activeClass =
    "bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-white shadow-lg shadow-[var(--primary-accent-start)]/20";
  const inactiveClass =
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5";

  return (
    <Link
      to={to}
      className={`w-full flex items-center rounded-lg text-sm font-semibold transition-all duration-200 ${isActive ? activeClass : inactiveClass} ${isCollapsed ? "justify-center min-w-[44px] min-h-[44px] p-3" : "px-4 py-3"}`}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? label : undefined}
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
};

const NavigationGroup: React.FC<{
  title: string;
  icon: React.ElementType;
  items: Array<{ icon: React.ElementType; label: string; to: string }>;
  isCollapsed: boolean;
  defaultExpanded?: boolean;
}> = ({ title, icon: GroupIcon, items, isCollapsed, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  if (isCollapsed) {
    // In collapsed mode, show group icon that expands to show all items
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all min-w-[44px] min-h-[44px] p-3"
          title={`${title} (${items.length} items)`}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            touchAction: "manipulation",
          }}
        >
          <GroupIcon size={20} />
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-1 pb-2"
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

const SecondaryMenu: React.FC<{
  title: string;
  items: Array<{ icon: React.ElementType; label: string; to: string; badge?: string }>;
  isCollapsed: boolean;
}> = ({ title, items, isCollapsed }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="w-full flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all min-w-[44px] min-h-[44px] p-3"
              aria-label={`${title} menu`}
              style={{
                minWidth: "44px",
                minHeight: "44px",
                touchAction: "manipulation",
              }}
            >
              <Settings size={18} />
            </button>
            <AnimatePresence>
              {isVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1 pb-2"
                >
                  {items.map((item, index) => (
                    <Tooltip key={`${item.to}-${index}`}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.to}
                          className="w-full flex items-center justify-center px-2 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
                          aria-label={item.label}
                        >
                          <item.icon size={16} />
                          {item.badge && (
                            <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{title} features</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
            aria-label={`${title} menu`}
          >
            <Settings size={16} className="mr-3" />
            <span className="flex-grow text-left">{title}</span>
            {isVisible ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Additional church features and tools</p>
        </TooltipContent>
      </Tooltip>

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
              <Tooltip key={`${item.to}-${index}`}>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label} - {getFeatureDescription(item.label)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

const GoogleSyncControl: React.FC<
  Pick<
    SidebarProps,
    |
      "isLoggedIn"
    |
      "userProfile"
    |
      "syncStatus"
    |
      "signIn"
    |
      "signOut"
    |
      "isCollapsed"
    |
      "isConfigured"
    |
      "isOnline"
  >
> = ({
  isLoggedIn,
  userProfile,
  syncStatus,
  signIn,
  signOut,
  isCollapsed,
  isConfigured,
  isOnline,
}) => {
  return (
    <AnimatePresence>
      {!isCollapsed &&
        (isConfigured ? (
          isLoggedIn && userProfile ? (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={itemVariants}
              className="p-3 bg-[var(--bg-card)] rounded-lg"
            >
              <div className="flex items-center gap-3">
                <img
                  src={userProfile.imageUrl}
                  alt={userProfile.name}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
                <div className="text-left overflow-hidden flex-grow">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {userProfile.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {userProfile.email}
                  </p>
                </div>
                <SyncStatusIndicator status={syncStatus} isOnline={isOnline} />
              </div>
              <Button
                onClick={signOut}
                fullWidth
                variant="danger"
                size="sm"
                className="mt-3 !bg-transparent !text-[var(--danger-text)] hover:!bg-[var(--danger-start)]/10"
              >
                Sign Out
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={itemVariants}
              className="p-3 bg-[var(--bg-card)] rounded-lg text-center"
            >
              <h4 className="font-semibold text-[var(--text-primary)]">
                Cloud Sync
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                Sign in to sync your favorites across devices.
              </p>
              <Button
                onClick={signIn}
                leftIcon={<LogIn size={16} />}
                fullWidth
                variant="primary"
              >
                Sign in with Google
              </Button>
            </motion.div>
          )
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={itemVariants}
            className="p-3 bg-[var(--bg-card)] rounded-lg text-center"
          >
            <h4 className="font-semibold text-[var(--text-primary)]">
              Cloud Sync Unavailable
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              This feature has not been configured.
            </p>

            </motion.div>
        ))}
    </AnimatePresence>
  );
};

const ThemeControl: React.FC<
  Pick<
    SidebarProps,
    "theme" | "setTheme" | "accentColor" | "setAccentColor" | "isCollapsed"
  >
> = ({ theme, setTheme, accentColor, setAccentColor, isCollapsed }) => {
  return (
    <div className={`${isCollapsed ? "flex flex-col items-center space-y-2" : "p-3 bg-[var(--bg-card)] rounded-lg"}`}>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.h4
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={itemVariants}
            className="font-semibold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-3"
          >
            Appearance
          </motion.h4>
        )}
      </AnimatePresence>

      {/* Theme Toggle - Show only active theme when collapsed */}
      <div className={`${isCollapsed ? "flex justify-center" : "flex items-center space-x-2 p-1 bg-[var(--input-bg)] rounded-xl shadow-inner mb-3"}`}>
        {isCollapsed ? (
          // Show only active theme icon when collapsed
          <button
            className="justify-center rounded-lg text-sm font-medium transition-colors flex items-center min-w-[48px] min-h-[48px] p-3"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            style={{
              minWidth: "48px",
              minHeight: "48px",
              touchAction: "manipulation",
            }}
          >
            {theme === "dark" ? (
              <Moon size={20} />
            ) : (
              <Sun size={20} />
            )}
          </button>
        ) : (
          // Show both options when expanded
          <>
            <button
              className={`w-full justify-center py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-1 ${theme === "dark" ? "bg-[var(--primary-accent-start)]/40 text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
            >
              <Moon size={16} /> Dark
            </button>
            <button
              className={`w-full justify-center py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-1 ${theme === "light" ? "bg-slate-200 text-slate-800" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
            >
              <Sun size={16} /> Light
            </button>
          </>
        )}
      </div>

      {/* Accent Color Picker - Show only selected when collapsed */}
      <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-around"}`}>
        {isCollapsed ? (
          // Show only selected color when collapsed
          <div
            className="w-8 h-8 rounded-full border-2 border-[var(--bg-card)]"
            style={{
              backgroundColor: `hsl(${accentColor.values.h}, ${accentColor.values.s}%, ${accentColor.values.l}%)`,
            }}
            title={`Current accent: ${accentColor.name}`}
          />
        ) : (
          // Show all colors when expanded
          THEME_OPTIONS.map((option) => (
            <button
              key={option.key}
              title={option.name}
              onClick={() => setAccentColor(option)}
              className="w-7 h-7 rounded-full transition-all duration-200 border-2"
              style={{
                backgroundColor: `hsl(${option.values.h}, ${option.values.s}%, ${option.values.l}%)`,
                borderColor:
                  accentColor.key === option.key
                    ? `hsl(${option.values.h}, ${option.values.s}%, ${option.values.l}%)`
                    : "transparent",
                boxShadow:
                  accentColor.key === option.key
                    ? `0 0 0 2px var(--bg-card)`
                    : "none",
              }}
            >
              {accentColor.key === option.key && (
                <Check size={16} className="text-white/80 mx-auto" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  theme,
  setTheme,
  isCollapsed,
  setIsCollapsed,
  isLoggedIn,
  userProfile,
  syncStatus,
  signIn,
  signOut,
  isConfigured,
  accentColor,
  setAccentColor,
  openCommandPalette,
  isOnline,
  onClose,
}) => {
  // Enhanced responsive design hooks with better breakpoints
  const isMobile = useMediaQuery("(max-width: 640px)"); // Better mobile breakpoint
  const isSmallMobile = useMediaQuery("(max-width: 375px)"); // iPhone SE and smaller
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const isLandscape = useMediaQuery("(orientation: landscape) and (max-height: 600px)");
  const prefersReducedMotion = useReducedMotion();
  const { isLowEndDevice, supportsTouch } = useDeviceCapabilities();

  // Enhanced width calculation with better responsive behavior
  const getSidebarWidth = () => {
    if (isMobile) {
      if (isLandscape) return "16rem"; // Wider in landscape mobile
      return "100vw"; // Full overlay on mobile
    }
    if (isTablet && !isCollapsed) return "15rem"; // Slightly narrower on tablet
    return isCollapsed ? "4rem" : "17rem"; // Smaller collapsed, standard expanded
  };

  // Enhanced mobile overlay behavior
  const isMobileOverlay = isMobile && !isCollapsed;

  const logoSrc = isCollapsed
    ? theme === "dark"
      ? `${import.meta.env.BASE_URL}img/DarkLogoCollapsed.svg`
      : `${import.meta.env.BASE_URL}img/LightLogoCollapsed.svg`
    : theme === "dark"
      ? `${import.meta.env.BASE_URL}img/DarkLogoExpanded.svg`
      : `${import.meta.env.BASE_URL}img/LightLogoExpanded.svg`;

  // Animation config based on motion preferences
  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: false,
        animate: { width: getSidebarWidth() },
        transition: { duration: 0.3, ease: "easeInOut" }
      };

  return (
    <SidebarErrorBoundary>
      <TooltipProvider>
        <>
          {/* Enhanced Mobile Overlay Backdrop */}
        {isMobileOverlay && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            onTouchEnd={(e) => {
              e.preventDefault();
              onClose?.();
            }}
            style={{
              // Improve touch responsiveness
              WebkitTapHighlightColor: "transparent",
              WebkitTouchCallout: "none",
              WebkitUserSelect: "none",
            }}
          />
        )}

        <motion.aside
          className={`sidebar glassmorphism-bg ${
            isCollapsed ? "collapsed" : ""
          } ${isMobileOverlay ? "fixed z-50 h-full" : "relative"} ${
            isSmallMobile ? "mobile-compact" : ""
          }`}
          {...animationProps}
          style={{
            // Improve touch responsiveness
            WebkitTapHighlightColor: "transparent",
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
          }}
        >
      <div
        className={`flex flex-col items-center mb-10 ${isCollapsed ? "w-full" : ""}`}
      >
        {/* Intelligent Dismiss Button - Adapts to all contexts */}
        <SmartDismissButton
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          isSmallMobile={isSmallMobile}
          isLandscape={isLandscape}
          onClose={onClose}
          variant={isMobile ? "close" : isCollapsed ? "minimize" : "close"}
          size={isSmallMobile ? "sm" : "md"}
        />

        <motion.img
          src={logoSrc}
          alt="TACTMS Logo"
          variants={prefersReducedMotion ? {} : logoVariants}
          animate={isCollapsed ? "collapsed" : "expanded"}
          className="w-auto"
        />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.p
            initial={prefersReducedMotion ? {} : { opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: "0.5rem" }}
            exit={prefersReducedMotion ? {} : { opacity: 0, height: 0, marginTop: 0 }}
            transition={prefersReducedMotion ? {} : { duration: 0.2, ease: "easeInOut" }}
            className="text-xs text-[var(--text-muted)] text-center"
            >
              TACTMS - The Apostolic Church Tithe Made Simple
            </motion.p>
          )}
        </AnimatePresence>
      </div>

        <ScrollArea
          className={`flex-grow ${isSmallMobile ? "max-h-[calc(100vh-12rem)]" : "max-h-[calc(100vh-10rem)]"}`}
        >
          <nav
            className={`space-y-3 px-3 ${isCollapsed ? "flex flex-col items-center" : ""}`}
            role="navigation"
            aria-label="Main navigation"
            style={{
              // Ensure proper touch scrolling on mobile
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {/* Core Section - Standalone */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <NavItem
                    icon={LayoutDashboard}
                    label="Dashboard"
                    to="/"
                    isCollapsed={isCollapsed}
                  />
                </div>
              </TooltipTrigger>
              {!isCollapsed && (
                <TooltipContent side="right">
                  <p>Main dashboard with overview and quick actions</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Separator */}
            {!isCollapsed && <Separator className="my-2" />}

            {/* Management Group */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <NavigationGroup
                    title="Management"
                    icon={Shield}
                    isCollapsed={isCollapsed}
                    items={[
                      { icon: Cpu, label: "Tithe Processor", to: "/processor" },
                      { icon: Database, label: "Member Database", to: "/database" },
                      { icon: PieChart, label: "Reports", to: "/reports" },
                    ]}
                  />
                </div>
              </TooltipTrigger>
              {!isCollapsed && (
                <TooltipContent side="right">
                  <p>Core church management tools</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Advanced Group */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <NavigationGroup
                    title="Advanced"
                    icon={BotMessageSquare}
                    isCollapsed={isCollapsed}
                    items={[
                      { icon: Star, label: "Favorites", to: "/favorites" },
                      { icon: BotMessageSquare, label: "AI Analytics", to: "/analytics" },
                    ]}
                  />
                </div>
              </TooltipTrigger>
              {!isCollapsed && (
                <TooltipContent side="right">
                  <p>Advanced features and AI-powered insights</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Separator */}
            {!isCollapsed && <Separator className="my-2" />}

            {/* Secondary Menu - Additional Features */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <SecondaryMenu
                    title="More"
                    isCollapsed={isCollapsed}
                    items={[
                      { icon: Calendar, label: "Events", to: "/events", badge: "New" },
                      { icon: Music, label: "Worship", to: "/worship" },
                      { icon: BookOpen, label: "Bible Study", to: "/biblestudy" },
                      { icon: Heart, label: "Prayer Requests", to: "/prayers" },
                      { icon: Users, label: "Small Groups", to: "/groups" },
                      { icon: FileText, label: "Bulletin", to: "/bulletin" },
                      { icon: BarChart3, label: "Giving Trends", to: "/giving" },
                    ]}
                  />
                </div>
              </TooltipTrigger>
              {!isCollapsed && (
                <TooltipContent side="right">
                  <p>Additional church features and tools</p>
                </TooltipContent>
              )}
            </Tooltip>
          </nav>
        </ScrollArea>

      <div className={`mt-auto flex-shrink-0 ${isCollapsed ? "w-full" : ""}`}>
        {/* Separator */}
        {!isCollapsed && <Separator className="my-2" />}

        {/* Newsletter Signup - Always visible when collapsed */}
        <div className={`mb-4 ${isCollapsed ? "flex justify-center" : "px-2"}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <NewsletterSignup
                  onSubscribe={async (email) => {
                    console.log("Newsletter signup:", email);
                  }}
                  buttonText="Subscribe"
                  placeholder="Get church updates..."
                  isCollapsed={isCollapsed}
                />
              </div>
            </TooltipTrigger>
            {!isCollapsed && (
              <TooltipContent side="right">
                <p>Subscribe to church newsletter and updates</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Theme Controls - Always visible when collapsed */}
        <div className={`mb-4 ${isCollapsed ? "flex justify-center" : ""}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <ThemeControl
                  theme={theme}
                  setTheme={setTheme}
                  accentColor={accentColor}
                  setAccentColor={setAccentColor}
                  isCollapsed={isCollapsed}
                />
              </div>
            </TooltipTrigger>
            {!isCollapsed && (
              <TooltipContent side="right">
                <p>Customize appearance and theme settings</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Intelligent Collapse/Expand Button */}
        <div className={`mb-4 ${isCollapsed ? "w-full" : ""}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                  "w-full rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle-accent)] transition-all flex items-center justify-center",
                  isSmallMobile ? "min-h-[48px] p-3" : "min-h-[44px] p-3"
                )}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                style={{
                  minHeight: isSmallMobile ? "48px" : "44px",
                  touchAction: "manipulation",
                }}
              >
                <motion.div
                  key={isCollapsed ? "expand" : "collapse"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isCollapsed ? (
                    <ChevronRight size={isSmallMobile ? 18 : 20} />
                  ) : (
                    <ChevronLeft size={isSmallMobile ? 18 : 20} />
                  )}
                </motion.div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Google Sync Control - Only when not collapsed */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mb-4 w-full"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <GoogleSyncControl
                      isCollapsed={isCollapsed}
                      isLoggedIn={isLoggedIn}
                      userProfile={userProfile}
                      syncStatus={syncStatus}
                      signIn={signIn}
                      signOut={signOut}
                      isConfigured={isConfigured}
                      isOnline={isOnline}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Google account sync and cloud backup</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-center space-y-2"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={openCommandPalette}
                    className="w-full text-center text-xs text-[var(--text-muted)] p-2 rounded-md hover:bg-[var(--bg-card)] transition-colors"
                    aria-label="Open command palette"
                  >
                    Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">⌘K</kbd> to search
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Quick search and command palette</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Copyright/Watermark - Always visible */}
        <div className={`${isCollapsed ? "text-center" : "text-center"}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-[var(--text-muted)] cursor-help">
                &copy; {new Date().getFullYear()} TACTMS by DexignMasters
              </p>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>The Apostolic Church Tithe Management System</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      </motion.aside>
      </>
    </TooltipProvider>
    </SidebarErrorBoundary>
  );
};

export default Sidebar;
