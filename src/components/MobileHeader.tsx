import React from "react";
import { Menu } from "lucide-react";
import Button from "./Button";
import NotificationsPopover from "../components/NotificationsPopover";
import { Notification } from "../App"; // Assuming Notification type is defined in App.tsx
import { THEME_OPTIONS } from "../constants";

interface MobileHeaderProps {
  onMenuClick: () => void;
  title: string;
  globalNotifications: Notification[];
  accentColor: (typeof THEME_OPTIONS)[0];
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick, title, globalNotifications, accentColor }) => {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border-color)] z-30 flex items-center px-4 justify-between relative">
      <div className="z-10">
        <Button
          onClick={onMenuClick}
          variant="ghost"
          size="icon"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </Button>
      </div>

      <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[17px] font-semibold text-[var(--text-primary)] truncate max-w-[60%] text-center">
        {title}
      </h1>

      <div className="z-10">
        <NotificationsPopover notifications={globalNotifications} accentColor={accentColor} />
      </div>
    </header>
  );
};

export default React.memo(MobileHeader);
