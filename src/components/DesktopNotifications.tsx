import React from "react";
import NotificationsPopover from "./NotificationsPopover";
import { Notification } from "../App";
import { THEME_OPTIONS } from "../constants";

interface DesktopNotificationsProps {
  globalNotifications: Notification[];
  accentColor: (typeof THEME_OPTIONS)[0];
}

const DesktopNotifications: React.FC<DesktopNotificationsProps> = ({
  globalNotifications,
  accentColor,
}) => {
  return (
    <div className="hidden md:block fixed top-4 right-4 z-40">
      <NotificationsPopover
        notifications={globalNotifications}
        accentColor={accentColor}
      />
    </div>
  );
};

export default DesktopNotifications;
