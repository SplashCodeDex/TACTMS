import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, Check } from "lucide-react";
import { useSidebar } from "../Sidebar";
import { THEME_OPTIONS } from "../../constants";

const itemVariants = {
    hidden: { opacity: 0, x: -20, transition: { duration: 0.2 } },
    visible: { opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.2 } },
  };

const ThemeControl: React.FC = () => {
  const { theme, setTheme, accentColor, setAccentColor, isCollapsed } = useSidebar();
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
          />
        ) : (
          // Show all colors when expanded
          THEME_OPTIONS.map((option) => (
            <button
              key={option.key}
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

export default ThemeControl;
