
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BotMessageSquare, Cpu, Star, Moon, Sun, ChevronLeft, ChevronRight, LogIn, PieChart, Check, Database, LayoutDashboard } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from './Button';
import { GoogleUserProfile } from '../types';
import { THEME_OPTIONS } from '../constants';
import SyncStatusIndicator from './SyncStatusIndicator';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
type ThemeOption = typeof THEME_OPTIONS[0];

interface SidebarProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
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
  const activeClass = 'bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-white shadow-lg shadow-[var(--primary-accent-start)]/20';
  const inactiveClass = 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5';
  
  return (
    <Link
      to={to}
      className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive ? activeClass : inactiveClass} ${isCollapsed ? 'justify-center' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={20} />
      <motion.span
        variants={itemVariants}
        initial={isCollapsed ? "hidden" : "visible"}
        animate={isCollapsed ? "hidden" : "visible"}
        className="ml-3"
        style={{ pointerEvents: isCollapsed ? 'none' : 'auto' }}
      >
        {label}
      </motion.span>
    </Link>
  );
};

const GoogleSyncControl: React.FC<Pick<SidebarProps, 'isLoggedIn' | 'userProfile' | 'syncStatus' | 'signIn' | 'signOut' | 'isCollapsed' | 'isConfigured' | 'isOnline'>> = 
({ isLoggedIn, userProfile, syncStatus, signIn, signOut, isCollapsed, isConfigured, isOnline }) => {
    
    if (!isConfigured) {
        return (
            <motion.div
                initial={isCollapsed ? "hidden" : "visible"}
                animate={isCollapsed ? "hidden" : "visible"}
                variants={itemVariants}
                className="p-3 bg-[var(--bg-card)] rounded-lg text-center"
            >
                <h4 className="font-semibold text-[var(--text-primary)]">Cloud Sync Unavailable</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">This feature has not been configured.</p>
            </motion.div>
        );
    }

    if (isLoggedIn && userProfile) {
        return (
            <motion.div
                initial={isCollapsed ? "hidden" : "visible"}
                animate={isCollapsed ? "hidden" : "visible"}
                variants={itemVariants}
                className="p-3 bg-[var(--bg-card)] rounded-lg"
            >
                <div className="flex items-center gap-3">
                    <img src={userProfile.imageUrl} alt={userProfile.name} className="w-10 h-10 rounded-full"/>
                    <div className="text-left overflow-hidden flex-grow">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{userProfile.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{userProfile.email}</p>
                    </div>
                    <SyncStatusIndicator status={syncStatus} isOnline={isOnline} />
                </div>
                <Button onClick={signOut} fullWidth variant="danger" size="sm" className="mt-3 !bg-transparent !text-[var(--danger-text)] hover:!bg-[var(--danger-start)]/10">
                    Sign Out
                </Button>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={isCollapsed ? "hidden" : "visible"}
            animate={isCollapsed ? "hidden" : "visible"}
            variants={itemVariants}
            className="p-3 bg-[var(--bg-card)] rounded-lg text-center"
        >
            <h4 className="font-semibold text-[var(--text-primary)]">Cloud Sync</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Sign in to sync your favorites across devices.</p>
            <Button onClick={signIn} leftIcon={<LogIn size={16} />} fullWidth variant="primary">
                Sign in with Google
            </Button>
        </motion.div>
    );
};

const ThemeControl: React.FC<Pick<SidebarProps, 'theme' | 'setTheme' | 'accentColor' | 'setAccentColor' | 'isCollapsed'>> = 
({ theme, setTheme, accentColor, setAccentColor, isCollapsed }) => {
    return (
        <motion.div
            initial={isCollapsed ? "hidden" : "visible"}
            animate={isCollapsed ? "hidden" : "visible"}
            variants={itemVariants}
            className="p-3 bg-[var(--bg-card)] rounded-lg"
        >
            <h4 className="font-semibold text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-3">Appearance</h4>
            <div className="flex items-center space-x-2 p-1 bg-[var(--input-bg)] rounded-xl shadow-inner mb-3">
                <button 
                    className={`w-full justify-center py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-1 ${theme === 'dark' ? 'bg-[var(--primary-accent-start)]/40 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'} >
                    <Moon size={16}/> Dark
                </button>
                <button 
                    className={`w-full justify-center py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-1 ${theme === 'light' ? 'bg-slate-200 text-slate-800' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => setTheme('light')} aria-pressed={theme === 'light'} >
                    <Sun size={16}/> Light
                </button>
            </div>
             <div className="flex items-center justify-around">
                {THEME_OPTIONS.map(option => (
                    <button key={option.key} title={option.name} onClick={() => setAccentColor(option)}
                        className="w-7 h-7 rounded-full transition-all duration-200 border-2"
                        style={{ 
                            backgroundColor: `hsl(${option.values.h}, ${option.values.s}%, ${option.values.l}%)`,
                            borderColor: accentColor.key === option.key ? `hsl(${option.values.h}, ${option.values.s}%, ${option.values.l}%)` : 'transparent',
                            boxShadow: accentColor.key === option.key ? `0 0 0 2px var(--bg-card)` : 'none'
                        }}
                    >
                        {accentColor.key === option.key && <Check size={16} className="text-white/80 mx-auto" />}
                    </button>
                ))}
             </div>
        </motion.div>
    )
}

const Sidebar: React.FC<SidebarProps> = ({ 
    theme, setTheme, isCollapsed, setIsCollapsed,
    isLoggedIn, userProfile, syncStatus, signIn, signOut, isConfigured,
    accentColor, setAccentColor, openCommandPalette, isOnline
}) => {
    const logoSrc = isCollapsed
        ? (theme === 'dark' ? `${import.meta.env.BASE_URL}img/DarkLogoCollapsed.svg` : `${import.meta.env.BASE_URL}img/LightLogoCollapsed.svg`)
        : (theme === 'dark' ? `${import.meta.env.BASE_URL}img/DarkLogoExpanded.svg` : `${import.meta.env.BASE_URL}img/LightLogoExpanded.svg`);

  return (
    <aside className={`sidebar glassmorphism-bg ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="flex flex-col items-center mb-10">
        <motion.img 
          src={logoSrc}
          alt="TACTMS Logo" 
          variants={logoVariants}
          animate={isCollapsed ? "collapsed" : "expanded"}
          className="w-auto"
        />
        <AnimatePresence>
        {!isCollapsed && (
            <motion.p variants={itemVariants} initial="hidden" animate="visible" exit="exit" className="text-xs text-[var(--text-muted)] mt-2 text-center">
                TACTMS - The Apostolic Church Tithe Made Simple
            </motion.p>
        )}
        </AnimatePresence>
      </div>

      <nav className="flex-grow space-y-2">
        <NavItem 
          icon={LayoutDashboard} 
          label="Dashboard" 
          to="/"
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={Cpu} 
          label="Tithe Processor" 
          to="/processor"
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={Database} 
          label="Member Database" 
          to="/database"
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={Star} 
          label="Favorites" 
          to="/favorites"
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={PieChart} 
          label="Reports" 
          to="/reports"
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={BotMessageSquare} 
          label="AI Analytics" 
          to="/analytics"
          isCollapsed={isCollapsed}
        />
      </nav>

      <div className="mt-auto flex-shrink-0">
         <div className="flex justify-center items-center gap-2 mb-4">
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle-accent)] transition-all flex-grow"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? <ChevronRight size={20} className="mx-auto" /> : <ChevronLeft size={20} className="mx-auto" />}
            </button>
        </div>

        <div className="mb-4">
            <GoogleSyncControl 
                isCollapsed={isCollapsed} isLoggedIn={isLoggedIn} userProfile={userProfile}
                syncStatus={syncStatus} signIn={signIn} signOut={signOut}
                isConfigured={isConfigured} isOnline={isOnline}
            />
        </div>
        
        <div className="mb-4">
            <ThemeControl
                theme={theme} setTheme={setTheme}
                accentColor={accentColor} setAccentColor={setAccentColor}
                isCollapsed={isCollapsed}
            />
        </div>
        
        <AnimatePresence>
        {!isCollapsed && (
            <motion.div 
                variants={itemVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                className="text-center space-y-3"
            >
                <button onClick={openCommandPalette} className="w-full text-center text-xs text-[var(--text-muted)] p-2 rounded-md hover:bg-[var(--bg-card)] transition-colors">
                    Press <span className="kbd-hint">⌘K</span> to search
                </button>
                <p className="text-xs text-[var(--text-muted)]">
                    &copy; 2025 Dexify by DexignMasters
                </p>
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </aside>
  );
};

export default Sidebar;
