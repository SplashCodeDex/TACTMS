import React from "react";
import { motion } from "framer-motion";
import { Tooltip } from "react-tooltip";
import {
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  isOnline: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  isOnline,
}) => {
  const getStatusContent = () => {
    if (!isOnline) {
      return {
        Icon: WifiOff,
        color: "text-gray-500",
        tooltip: "Offline",
        animate: false,
      };
    }

    switch (status) {
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
          tooltip: "Sync Error",
          animate: false,
        };
      case "idle":
      default:
        return {
          Icon: Wifi,
          color: "text-gray-400",
          tooltip: "Online",
          animate: false,
        };
    }
  };

  const { Icon, color, tooltip, animate } = getStatusContent();

  return (
    <>
      <motion.div
        data-tooltip-id="sync-status-tooltip"
        data-tooltip-content={tooltip}
        className={`flex items-center justify-center w-8 h-8 rounded-full ${color}`}
      >
        <Icon size={18} className={animate ? "animate-spin" : ""} />
      </motion.div>
      <Tooltip id="sync-status-tooltip" place="top" />
    </>
  );
};

export default SyncStatusIndicator;
