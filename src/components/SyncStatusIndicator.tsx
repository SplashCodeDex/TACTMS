import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Tooltip } from "react-tooltip";
import {
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { syncManager, SyncState } from "@/services/SyncManager";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface SyncStatusIndicatorProps {
  /** Optional: Override status (for controlled mode). If not provided, auto-subscribes to SyncManager */
  status?: SyncStatus;
  /** Optional: Override online state. If not provided, uses navigator.onLine */
  isOnline?: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status: controlledStatus,
  isOnline: controlledIsOnline,
}) => {
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getState());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Subscribe to SyncManager state
  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setSyncState);
    return unsubscribe;
  }, []);

  // Use existing useOnlineStatus hook
  const handleOnlineChange = useCallback((online: boolean) => {
    setIsOnline(online);
  }, []);
  useOnlineStatus(handleOnlineChange);

  // Determine final values (controlled or auto)
  const finalIsOnline = controlledIsOnline ?? isOnline;
  const finalStatus: SyncStatus = controlledStatus ??
    (syncState.status === "offline" ? "idle" :
      syncState.status === "syncing" ? "syncing" :
        syncState.status === "error" ? "error" :
          syncState.pendingCount === 0 ? "synced" : "idle");

  const getStatusContent = () => {
    if (!finalIsOnline) {
      return {
        Icon: WifiOff,
        color: "text-gray-500",
        tooltip: "Offline",
        animate: false,
      };
    }

    switch (finalStatus) {
      case "syncing":
        return {
          Icon: RefreshCw,
          color: "text-blue-500",
          tooltip: "Syncing...",
          animate: true,
        };
      case "synced":
        return {
          Icon: CheckCircle,
          color: "text-green-500",
          tooltip: "Synced",
          animate: false,
        };
      case "error":
        return {
          Icon: AlertCircle,
          color: "text-red-500",
          tooltip: syncState.lastError || "Sync Error",
          animate: false,
        };
      case "idle":
      default:
        return {
          Icon: Wifi,
          color: syncState.pendingCount > 0 ? "text-yellow-500" : "text-gray-400",
          tooltip: syncState.pendingCount > 0
            ? `${syncState.pendingCount} pending`
            : "Online",
          animate: false,
        };
    }
  };

  const handleClick = () => {
    if (finalIsOnline && (finalStatus === "error" || syncState.pendingCount > 0)) {
      syncManager.syncWithRetry();
    }
  };

  const { Icon, color, tooltip, animate } = getStatusContent();

  return (
    <>
      <motion.button
        onClick={handleClick}
        disabled={!finalIsOnline || finalStatus === "syncing"}
        data-tooltip-id="sync-status-tooltip"
        data-tooltip-content={tooltip}
        className={`flex items-center justify-center w-8 h-8 rounded-full ${color} disabled:cursor-not-allowed hover:opacity-80 transition-opacity`}
      >
        <Icon size={18} className={animate ? "animate-spin" : ""} />
        {syncState.pendingCount > 0 && finalStatus !== "syncing" && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
            {syncState.pendingCount > 9 ? "9+" : syncState.pendingCount}
          </span>
        )}
      </motion.button>
      <Tooltip id="sync-status-tooltip" place="top" />
    </>
  );
};

export default SyncStatusIndicator;
