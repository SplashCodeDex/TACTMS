import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FavoriteConfig, ViewType } from "../types";
import { Search, CornerDownLeft } from "lucide-react";
import { buildCommandActions } from "../commands/index";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveView: (view: ViewType) => void;
  setTheme: (theme: "dark" | "light") => void;
  onStartNewWeek: (assemblyName: string) => void;
  favorites: FavoriteConfig[];
  theme: "dark" | "light";
}

interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactElement;
  onPerform: () => void;
  keywords?: string[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  setActiveView,
  setTheme,
  onStartNewWeek,
  favorites,
  theme,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Actions built via external command factory

  const allActions: CommandAction[] = useMemo(
    () =>
      buildCommandActions({
        setActiveView,
        setTheme,
        onStartNewWeek,
        favorites,
        theme,
      }),
    [setActiveView, setTheme, onStartNewWeek, favorites, theme],
  );

  const filteredActions = useMemo(() => {
    if (!query.trim()) return allActions;
    const lowerQuery = query.toLowerCase();
    return allActions.filter(
      (action) =>
        action.title.toLowerCase().includes(lowerQuery) ||
        action.subtitle?.toLowerCase().includes(lowerQuery) ||
        action.keywords?.some((k) => k.toLowerCase().includes(lowerQuery)),
    );
  }, [query, allActions]);

  const handleAction = useCallback((action: CommandAction) => {
    action.onPerform();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredActions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + filteredActions.length) % filteredActions.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          handleAction(filteredActions[selectedIndex]);
        }
      }
    },
    [selectedIndex, filteredActions, handleAction],
  );

  useEffect(() => {
    const selectedItem = resultsRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedItem?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="command-palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
        >
          <motion.div
            className="command-palette-container"
            initial={{ scale: 0.95, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div className="p-3 border-b border-[var(--border-color)] flex items-center gap-3">
              <Search
                size={20}
                className="text-[var(--text-muted)] flex-shrink-0"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="w-full bg-transparent focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-placeholder)]"
              />
            </div>
            <div ref={resultsRef} className="overflow-y-auto p-2 max-h-[50vh]">
              {filteredActions.length > 0 ? (
                filteredActions.map((action, index) => (
                  <button
                    key={action.id}
                    data-index={index}
                    data-selected={selectedIndex === index}
                    onClick={() => handleAction(action)}
                    className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors command-palette-item"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-[var(--text-secondary)]">
                        {action.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {action.title}
                        </p>
                        {action.subtitle && (
                          <p className="text-xs text-[var(--text-secondary)]">
                            {action.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedIndex === index && (
                      <CornerDownLeft
                        size={16}
                        className="text-[var(--text-muted)]"
                      />
                    )}
                  </button>
                ))
              ) : (
                <p className="text-center p-8 text-sm text-[var(--text-muted)]">
                  No results found.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
