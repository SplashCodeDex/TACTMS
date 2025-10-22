import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn, LogOut, CloudOff } from "lucide-react";
import { useSidebar } from "../Sidebar";
import SyncStatusIndicator from "../SyncStatusIndicator";
import Button from "../Button";
import { GoogleUserProfile } from "../../types";

const flyoutVariants = {
  hidden: { opacity: 0, x: -10, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1 },
};

const GoogleSyncControl: React.FC = () => {
  const {
    isLoggedIn,
    userProfile,
    syncStatus,
    signIn,
    signOut,
    isCollapsed,
    isConfigured,
    isOnline,
  } = useSidebar();
  const [isFlyoutOpen, setIsFlyoutOpen] = React.useState(false);
  const flyoutRef = React.useRef<HTMLDivElement>(null);

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

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center text-center p-2 bg-gray-500/10 rounded-lg">
        <CloudOff size={isCollapsed ? 20 : 16} className="text-gray-500" />
        {!isCollapsed && <span className="text-xs text-gray-500 ml-2">Sync Unavailable</span>}
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="relative" ref={flyoutRef}>
        <button
          onClick={() => setIsFlyoutOpen(!isFlyoutOpen)}
          className="w-full flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-white/5 transition-all h-10 w-10"
        >
          {isLoggedIn && userProfile ? (
            <img src={userProfile.imageUrl} alt={userProfile.name} className="h-8 w-8 rounded-full" />
          ) : (
            <LogIn size={20} />
          )}
        </button>

        <AnimatePresence>
          {isFlyoutOpen && (
            <motion.div
              variants={flyoutVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-full bottom-0 ml-2 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg z-50 p-4"
            >
              {isLoggedIn && userProfile ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={userProfile.imageUrl} alt={userProfile.name} className="w-10 h-10 rounded-full" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold truncate">{userProfile.name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{userProfile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-[var(--text-muted)]">Sync Status:</span>
                    <SyncStatusIndicator status={syncStatus} isOnline={isOnline} />
                  </div>
                  <Button onClick={signOut} fullWidth variant="danger" size="sm" leftIcon={<LogOut size={16}/>}>Sign Out</Button>
                </>
              ) : (
                <Button onClick={signIn} fullWidth variant="primary" leftIcon={<LogIn size={16}/>}>Sign in with Google</Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="p-3 bg-[var(--bg-card)] rounded-lg">
      {isLoggedIn && userProfile ? (
        <div className="flex items-center gap-3">
          <img src={userProfile.imageUrl} alt={userProfile.name} className="w-10 h-10 rounded-full" />
          <div className="text-left overflow-hidden flex-grow">
            <p className="text-sm font-semibold truncate">{userProfile.name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{userProfile.email}</p>
          </div>
          <SyncStatusIndicator status={syncStatus} isOnline={isOnline} />
          <Button onClick={signOut} variant="danger" size="icon" className="!bg-transparent !text-[var(--danger-text)] hover:!bg-[var(--danger-start)]/10">
            <LogOut size={16} />
          </Button>
        </div>
      ) : (
        <Button onClick={signIn} fullWidth variant="primary" leftIcon={<LogIn size={16}/>}>Sign in with Google</Button>
      )}
    </div>
  );
};

export default GoogleSyncControl;
