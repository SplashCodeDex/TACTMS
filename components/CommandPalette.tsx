import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FavoriteConfig, ViewType } from '../types';
import { 
    LayoutDashboard, Cpu, Database, Star, PieChart, BotMessageSquare, Sun, Moon,
    ChevronsRight, Search, CornerDownLeft
} from 'lucide-react';
import { ASSEMBLIES } from '../constants';


interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveView: (view: ViewType) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  onStartNewWeek: (assemblyName: string) => void;
  favorites: FavoriteConfig[];
  theme: 'dark' | 'light';
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
    isOpen, onClose, setActiveView, setTheme, onStartNewWeek, favorites, theme
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const assembliesWithFavorites = useMemo(() => {
    return new Set(favorites.map(f => f.assemblyName));
  }, [favorites]);

  const allActions: CommandAction[] = useMemo(() => [
    // Navigation
    { id: 'nav_dashboard', title: 'Go to Dashboard', subtitle: 'View KPIs and recent activity', icon: <LayoutDashboard size={18}/>, onPerform: () => setActiveView('dashboard'), keywords: ['home', 'main'] },
    { id: 'nav_processor', title: 'Go to Tithe Processor', subtitle: 'Process weekly tithe lists', icon: <Cpu size={18}/>, onPerform: () => setActiveView('processor'), keywords: ['upload', 'generate', 'new list'] },
    { id: 'nav_database', title: 'Go to Member Database', subtitle: 'View and manage master lists', icon: <Database size={18}/>, onPerform: () => setActiveView('database'), keywords: ['members', 'master'] },
    { id: 'nav_favorites', title: 'Go to Favorites', subtitle: 'Load saved configurations', icon: <Star size={18}/>, onPerform: () => setActiveView('favorites'), keywords: ['saved', 'load'] },
    { id: 'nav_reports', title: 'Go to Reports', subtitle: 'View annual performance', icon: <PieChart size={18}/>, onPerform: () => setActiveView('reports'), keywords: ['stats', 'statistics', 'charts'] },
    { id: 'nav_analytics', title: 'Go to AI Analytics', subtitle: 'Chat with your data', icon: <BotMessageSquare size={18}/>, onPerform: () => setActiveView('analytics'), keywords: ['ai', 'chat', 'gemini'] },

    // Theme
    ...(theme === 'dark' ? [{ id: 'theme_light', title: 'Switch to Light Theme', icon: <Sun size={18}/>, onPerform: () => setTheme('light') }] : []),
    ...(theme === 'light' ? [{ id: 'theme_dark', title: 'Switch to Dark Theme', icon: <Moon size={18}/>, onPerform: () => setTheme('dark') }] : []),

    // Dynamic Actions
    ...ASSEMBLIES.filter(name => assembliesWithFavorites.has(name)).map(name => ({
        id: `start_week_${name}`,
        title: `Start New Week: ${name}`,
        subtitle: 'Load latest member list',
        icon: <ChevronsRight size={18}/>,
        onPerform: () => onStartNewWeek(name),
        keywords: ['start', name]
    }))
  ], [setActiveView, setTheme, onStartNewWeek, favorites, theme, assembliesWithFavorites]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return allActions;
    const lowerQuery = query.toLowerCase();
    return allActions.filter(action => 
        action.title.toLowerCase().includes(lowerQuery) ||
        action.subtitle?.toLowerCase().includes(lowerQuery) ||
        action.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }, [query, allActions]);

  const handleAction = (action: CommandAction) => {
    action.onPerform();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
        inputRef.current?.focus();
    } else {
        setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        handleAction(filteredActions[selectedIndex]);
      }
    }
  }, [selectedIndex, filteredActions, onClose]);
  
  useEffect(() => {
      const selectedItem = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
      selectedItem?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            className="command-palette-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
        >
          <motion.div
            className="command-palette-container"
            initial={{ scale: 0.95, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div className="p-3 border-b border-[var(--border-color)] flex items-center gap-3">
                <Search size={20} className="text-[var(--text-muted)] flex-shrink-0" />
                <input 
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type a command or search..."
                    className="w-full bg-transparent focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-placeholder)]"
                />
            </div>
            <div ref={resultsRef} className="overflow-y-auto p-2">
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
                                <div className="text-[var(--text-secondary)]">{action.icon}</div>
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{action.title}</p>
                                    {action.subtitle && <p className="text-xs text-[var(--text-secondary)]">{action.subtitle}</p>}
                                </div>
                            </div>
                            {selectedIndex === index && <CornerDownLeft size={16} className="text-[var(--text-muted)]"/>}
                        </button>
                    ))
                ) : (
                    <p className="text-center p-8 text-sm text-[var(--text-muted)]">No results found.</p>
                )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
