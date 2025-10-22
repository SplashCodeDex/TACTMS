import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { useSidebar } from "../Sidebar";
import SyncStatusIndicator from "../SyncStatusIndicator";
import Button from "../Button";
import { GoogleUserProfile } from "../../types";

const itemVariants = {
    hidden: { opacity: 0, x: -20, transition: { duration: 0.2 } },
    visible: { opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.2 } },
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

export default GoogleSyncControl;
