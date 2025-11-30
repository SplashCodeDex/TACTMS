import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Notification } from "../App"; // Assuming Notification type is defined in App.tsx
import { THEME_OPTIONS } from "../constants";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NotificationsPopoverProps {
  notifications: Notification[];
  accentColor: (typeof THEME_OPTIONS)[0];
}

export const title = "Notifications Popover";

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  notifications,
  accentColor,
}) => {
  const pendingNotifications = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="relative h-10 w-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)]/50 backdrop-blur-md hover:bg-[var(--bg-elevated)] transition-all"
          size="icon"
          variant="ghost"
        >
          <Bell className="h-5 w-5" />
          {pendingNotifications > 0 && (
            <Badge
              className="-right-1 -top-1 absolute h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              style={{
                backgroundColor: `hsl(${accentColor.values.h}, ${accentColor.values.s}%, ${accentColor.values.l}%)`,
                color: "white",
              }}
            >
              {pendingNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 border-1 border-[var(--border-color)]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {pendingNotifications > 0 && (
              <Button
                size="sm"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-subtle-accent)] transition-all"
              >
                Mark all as read
                <span className="flex-shrink-0 mt-0.5">
                  {notification.icon}
                </span>
                  )}
                <AlertDescription className="flex-grow">
                  <p className="font-medium text-sm">{notification.message}</p>
                  {notification.action && (
                    <Button
                      size="sm"
                      variant="link"
                      onClick={notification.action.onClick}
                      className="p-0 h-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-subtle-accent)] transition-all rounded-md px-2 py-1"
                    >
                      {notification.action.label}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
