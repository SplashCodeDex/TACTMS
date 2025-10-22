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
  Keyboard,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "./Button";
import { NewsletterSignup } from "./NewsletterSignup";
import { GoogleUserProfile } from "../types";
import { THEME_OPTIONS } from "../constants";
import SyncStatusIndicator from "./SyncStatusIndicator";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import SmartDismissButton from "./SmartDismissButton";
import { cn } from "@/lib/utils";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import NavItem from "./sidebar/NavItem";
import NavigationGroup from "./sidebar/NavigationGroup";
import GoogleSyncControl from "./sidebar/GoogleSyncControl";
import ThemeControl from "./sidebar/ThemeControl";
import navigationConfig from "../config/navigation.json";

// Icon mapping
const iconMap: { [key: string]: React.ElementType } = {
  LayoutDashboard,
  Shield,
  Cpu,
  Database,
  PieChart,
  BotMessageSquare,
  Star,
  Calendar,
  Music,
  BookOpen,
  Heart,
  Users,
  FileText,
  BarChart3,
  Keyboard,
  Settings,
};

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

// Sidebar Provider Component
interface SidebarProviderProps {
  children: React.ReactNode;
  value: SidebarContextType;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children, value }) => {
  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
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

// Consolidated responsive design hook
const useResponsive = () => {
  const [responsive, setResponsive] = React.useState({
    isMobile: false,
    isSmallMobile: false,
    isTablet: false,
    isLandscape: false,
    screenWidth: 1024,
    screenHeight: 768,
  });

  React.useEffect(() => {
    const updateResponsive = () => {
      if (typeof window === "undefined") return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      setResponsive({
        isMobile: width <= 640,
        isSmallMobile: width <= 375,
        isTablet: width <= 1024,
        isLandscape: window.matchMedia("(orientation: landscape) and (max-height: 600px)").matches,
        screenWidth: width,
        screenHeight: height,
      });
    };

    updateResponsive();
    window.addEventListener("resize", updateResponsive);
    window.addEventListener("orientationchange", updateResponsive);

    return () => {
      window.removeEventListener("resize", updateResponsive);
      window.removeEventListener("orientationchange", updateResponsive);
    };
  }, []);

  return responsive;
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
  onClose?: () => void; // For mobile overlay close
}

const sidebarVariants = {
  expanded: {
    width: "17rem",
    transition: {
      duration: 0.4,
      ease: "easeInOut",
      staggerChildren: 0.07,
    },
  },
  collapsed: {
    width: "5rem",
    transition: {
      duration: 0.4,
      ease: "easeInOut",
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const childVariants = {
  expanded: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
  collapsed: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.25,
      ease: "easeIn",
    },
  },
};

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const {
    theme,
    isCollapsed,
    setIsCollapsed,
    openCommandPalette,
  } = useSidebar();

  const { shortcuts } = useKeyboardShortcuts();

  // Consolidated responsive design
  const { isMobile, isSmallMobile, isTablet, isLandscape } = useResponsive();
  const prefersReducedMotion = useReducedMotion();

  // Swipe gesture state
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  // Focus management and keyboard shortcuts
  const firstNavRef = React.useRef<HTMLAnchorElement>(null);
  const sidebarRef = React.useRef<HTMLElement>(null);

  const [isKeyboardShortcutsModalOpen, setIsKeyboardShortcutsModalOpen] = React.useState(false);

  const parseShortcut = (keys: string) => {
    const parts = keys.split('+');
    const key = parts.pop()?.toLowerCase();
    const metaKey = parts.includes('⌘');
    const ctrlKey = parts.includes('Ctrl');
    const shiftKey = parts.includes('Shift');
    const altKey = parts.includes('Alt');
    return { key, metaKey, ctrlKey, shiftKey, altKey };
  };

  React.useEffect(() => {
    if (!isCollapsed && firstNavRef.current) {
      firstNavRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusableElements = sidebarRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
      );

      if (!isCollapsed && focusableElements) {
        const activeElement = document.activeElement as HTMLElement;
        const currentIndex = Array.from(focusableElements).indexOf(activeElement);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % focusableElements.length;
          focusableElements[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
          focusableElements[prevIndex]?.focus();
        }
      }

      if (!isCollapsed && e.key === 'Tab' && sidebarRef.current) {
        const firstElement = focusableElements?.[0];
        const lastElement = focusableElements?.[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }

      const openCommandPaletteShortcut = shortcuts.find(s => s.action === 'Open Command Palette');
      if (openCommandPaletteShortcut) {
        const { key, metaKey, ctrlKey } = parseShortcut(openCommandPaletteShortcut.keys);
        if (e.key.toLowerCase() === key && (e.metaKey === metaKey || e.ctrlKey === ctrlKey)) {
          e.preventDefault();
          openCommandPalette();
        }
      }

      const toggleSidebarShortcut = shortcuts.find(s => s.action === 'Toggle Sidebar');
      if (toggleSidebarShortcut) {
        const { key, metaKey, ctrlKey } = parseShortcut(toggleSidebarShortcut.keys);
        if (e.key.toLowerCase() === key && (e.metaKey === metaKey || e.ctrlKey === ctrlKey)) {
          e.preventDefault();
          setIsCollapsed(!isCollapsed);
        }
      }

      // Close on Escape
      if (e.key === 'Escape' && !isCollapsed && isMobile) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, isMobile, onClose, setIsCollapsed, openCommandPalette, shortcuts]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // If horizontal swipe is greater than vertical, and swipe left by >50px, close
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50 && !isCollapsed && isMobile) {
      onClose?.();
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    touchStartY.current = null;
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

  return (
    <SidebarErrorBoundary>
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
          ref={sidebarRef}
          className={`sidebar glassmorphism-bg ${
            isCollapsed ? "collapsed" : ""
          } ${isMobileOverlay ? "fixed z-50 h-full" : "relative"}`}
          variants={sidebarVariants}
          initial={false}
          animate={isCollapsed ? "collapsed" : "expanded"}
          style={{
            overflow: "hidden",
            WebkitTapHighlightColor: "transparent",
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-expanded={!isCollapsed}
          role="navigation"
        >
          <motion.div className={`flex flex-col items-center mb-10 ${isCollapsed ? "w-full" : ""}`}>
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
              animate={isCollapsed ? { height: "48px", width: "48px" } : { height: "80px", width: "auto" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`object-contain ${isCollapsed ? "max-w-[48px]" : "max-w-[200px]"}`}
            />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: "0.5rem" }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="text-xs text-[var(--text-muted)] text-center"
                >
                  TACTMS - The Apostolic Church Tithe Made Simple
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          <ScrollArea className="flex-1 min-h-0">
            <motion.nav
              className={`space-y-3 ${isCollapsed ? "flex flex-col items-center justify-center px-0" : "px-4"}`}
              role="navigation"
              aria-label="Main navigation"
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
              }}
            >
              {navigationConfig.main.map((item, index) => (
                <div key={index}>
                  <NavItem
                    icon={iconMap[item.icon]}
                    label={item.label}
                    to={item.to}
                    isCollapsed={isCollapsed}
                    ref={index === 0 ? firstNavRef : null}
                  />
                </div>
              ))}

              {!isCollapsed && <Separator className="my-2" />}

              {navigationConfig.groups.map((group, index) => (
                <div className="w-full" key={index}>
                  <NavigationGroup
                    title={group.title}
                    icon={iconMap[group.icon]}
                    isCollapsed={isCollapsed}
                    items={group.items.map(item => ({ ...item, icon: iconMap[item.icon], onClick: item.onClick ? () => setIsKeyboardShortcutsModalOpen(true) : undefined }))}
                  />
                  {group.title === 'Settings' && !isCollapsed && <ThemeControl />}
                </div>
              ))}
            </motion.nav>
          </ScrollArea>

          <motion.div className={`mt-auto flex-shrink-0 ${isCollapsed ? "w-full space-y-3" : "space-y-4"}`}>
            {!isCollapsed && <Separator className="my-4" />}

            <div className={`${isCollapsed ? "px-3" : "px-4"}`}>
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
            </div>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="px-4 w-full"
                >
                  <GoogleSyncControl />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="px-4 text-center"
                >
                  <button
                    onClick={openCommandPalette}
                    className="w-full text-center text-xs text-[var(--text-muted)] p-3 rounded-md hover:bg-[var(--bg-card)] transition-colors"
                    aria-label="Open command palette"
                  >
                    Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-card)] rounded text-xs">{shortcuts.find(s => s.action === 'Open Command Palette')?.keys}</kbd> to search
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="px-4 text-center"
                >
                  <p className="text-xs text-[var(--text-muted)] cursor-help">
                    &copy; {new Date().getFullYear()} TACTMS by DexignMasters
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </motion.aside>
        <KeyboardShortcutsModal
          isOpen={isKeyboardShortcutsModalOpen}
          onClose={() => setIsKeyboardShortcutsModalOpen(false)}
        />
      </>
    </SidebarErrorBoundary>
  );
};

export default Sidebar;
