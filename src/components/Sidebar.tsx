import React from 'react';
import { BotMessageSquare, Cpu, Star, Moon, Sun, ChevronLeft, ChevronRight, LogIn, LogOut, Cloud, Loader2, CloudCog, AlertCircle, CloudOff, PieChart, Check, Database, LayoutDashboard } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from './Button';
import { GoogleUserProfile, ViewType } from '../types';
import { THEME_OPTIONS } from '../constants';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
type ThemeOption = typeof THEME_OPTIONS[0];

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
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
}

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.2 } },
    exit: { opacity: 0, x: -10, transition: { duration: 0.1 } }
};

const NavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}> = ({ icon: Icon, label, isActive, onClick, isCollapsed }) => {
  const activeClass = 'bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-white shadow-lg shadow-[var(--primary-accent-start)]/20';
  const inactiveClass = 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5';
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive ? activeClass : inactiveClass} ${isCollapsed ? 'justify-center' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={20} />
      <AnimatePresence>
        {!isCollapsed && (
            <motion.span variants={itemVariants} initial="hidden" animate="visible" exit="exit" className="ml-3">
                {label}
            </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

const GoogleSyncControl: React.FC<Pick<SidebarProps, 'isLoggedIn' | 'userProfile' | 'syncStatus' | 'signIn' | 'signOut' | 'isCollapsed' | 'isConfigured'>> = 
({ isLoggedIn, userProfile, syncStatus, signIn, signOut, isCollapsed, isConfigured }) => {
    
    if (!isConfigured) {
        if (isCollapsed) {
            return (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] rounded-lg" title="Cloud Sync is not configured">
                        <CloudOff size={20} className="text-[var(--text-muted)]"/>
                    </div>
                </div>
            );
        }
        return (
            <div className="p-3 bg-[var(--bg-card)] rounded-lg text-center">
                <h4 className="font-semibold text-[var(--text-primary)]">Cloud Sync Unavailable</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">This feature has not been configured.</p>
            </div>
        );
    }

    const SyncStatusIcon = () => {
        switch(syncStatus) {
            case 'syncing': return <Loader2 size={16} className="animate-spin text-[var(--primary-accent-start)]" />;
            case 'synced': return <CloudCog size={16} className="text-[var(--success-text)]" />;
            case 'error': return <AlertCircle size={16} className="text-[var(--danger-text)]" />;
            default: return <Cloud size={16} className="text-[var(--text-muted)]" />;
        }
    };
    
    const syncStatusText: Record<SyncStatus, string> = {
        idle: "Not Connected",
        syncing: "Syncing...",
        synced: "Synced",
        error: "Sync Error"
    };

    if (isLoggedIn && userProfile) {
        if (isCollapsed) {
            return (
                <div className="flex flex-col items-center gap-3">
                    <img src={userProfile.imageUrl} alt={userProfile.name} className="w-10 h-10 rounded-full" title={`${userProfile.name} - ${syncStatusText[syncStatus]}`}/>
                    <Button onClick={signOut} size="icon" variant="subtle" className="w-10 h-10" title="Sign Out">
                        <LogOut size={18} />
                    </Button>
                </div>
            );
        }
        return (
            <div className="p-3 bg-[var(--bg-card)] rounded-lg text-center">
                <div className="flex items-center gap-3">
                    <img src={userProfile.imageUrl} alt={userProfile.name} className="w-10 h-10 rounded-full"/>
                    <div className="text-left overflow-hidden">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{userProfile.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{userProfile.email}</p>
                    </div>
                </div>
                <div className="mt-3 text-xs flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                    <SyncStatusIcon /> {syncStatusText[syncStatus]}
                </div>
                <Button onClick={signOut} fullWidth variant="danger" size="sm" className="mt-3 !bg-transparent !text-[var(--danger-text)] hover:!bg-[var(--danger-start)]/10">
                    Sign Out
                </Button>
            </div>
        )
    }

    if (isCollapsed) {
        return (
            <Button onClick={signIn} size="icon" variant="primary" className="w-12 h-12" title="Sync with Google Drive">
                <LogIn size={20} />
            </Button>
        );
    }

    return (
        <div className="p-3 bg-[var(--bg-card)] rounded-lg text-center">
            <h4 className="font-semibold text-[var(--text-primary)]">Cloud Sync</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Sign in to sync your favorites across devices.</p>
            <Button onClick={signIn} leftIcon={<LogIn size={16} />} fullWidth variant="primary">
                Sign in with Google
            </Button>
        </div>
    );
};

const ThemeControl: React.FC<Pick<SidebarProps, 'theme' | 'setTheme' | 'accentColor' | 'setAccentColor' | 'isCollapsed'>> = 
({ theme, setTheme, accentColor, setAccentColor, isCollapsed }) => {
    if (isCollapsed) {
        return (
             <div className="flex flex-col items-center space-y-2 p-2 bg-[var(--bg-card)] rounded-xl shadow-inner">
                <button 
                    className={`w-full justify-center p-2 rounded-lg transition-colors flex items-center gap-2 ${theme === 'dark' ? 'bg-[var(--primary-accent-start)]/40 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'} title="Dark Theme" >
                    <Moon size={16}/> 
                </button>
                <button 
                    className={`w-full justify-center p-2 rounded-lg transition-colors flex items-center gap-2 ${theme === 'light' ? 'bg-slate-200 text-slate-800' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => setTheme('light')} aria-pressed={theme === 'light'} title="Light Theme" >
                    <Sun size={16}/> 
                </button>
            </div>
        )
    }
    return (
        <div className="p-3 bg-[var(--bg-card)] rounded-lg">
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
        </div>
    )
}

const Sidebar: React.FC<SidebarProps> = ({ 
    activeView, setActiveView, theme, setTheme, isCollapsed, setIsCollapsed,
    isLoggedIn, userProfile, syncStatus, signIn, signOut, isConfigured,
    accentColor, setAccentColor, openCommandPalette
}) => {
    const logoSrc = isCollapsed
        ? (theme === 'dark' ? '/img/TAC-Dexify-for-dark-bg-only-logo-01.svg' : '/img/TAC-Dexify-for-light-bg-only-logo.svg')
        : (theme === 'dark' ? '/img/TAC-Dexify-only-logo-darkmode-01.svg' : '/img/TAC-Dexify-only-logo-lightmode-01.svg');

  const handleNavClick = (view: ViewType) => {
    setActiveView(view);
    if (window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  };


  return (
    <aside className={`sidebar glassmorphism-bg ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="flex flex-col items-center mb-10">
        <img 
          src={logoSrc}
          alt="TACTMS Logo" 
          className={`w-auto transition-all duration-300 ${isCollapsed ? 'h-16' : 'h-24'}`}
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
          isActive={activeView === 'dashboard'} 
          onClick={() => handleNavClick('dashboard')} 
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={Cpu} 
          label="Tithe Processor" 
          isActive={activeView === 'processor'} 
          onClick={() => handleNavClick('processor')} 
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={Database} 
          label="Member Database" 
          isActive={activeView === 'database'} 
          onClick={() => handleNavClick('database')}
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={Star} 
          label="Favorites" 
          isActive={activeView === 'favorites'} 
          onClick={() => handleNavClick('favorites')}
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={PieChart} 
          label="Reports" 
          isActive={activeView === 'reports'} 
          onClick={() => handleNavClick('reports')}
          isCollapsed={isCollapsed}
        />
        <NavItem 
          icon={BotMessageSquare} 
          label="AI Analytics" 
          isActive={activeView === 'analytics'} 
          onClick={() => handleNavClick('analytics')}
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
                isConfigured={isConfigured}
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