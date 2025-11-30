import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Notification } from "../App";
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
                variant="ghost"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] h-auto p-1 text-xs"
              >
                Mark all as read
              </Button>
            )}
          </div>
          <Separator />
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--text-muted)]">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <Alert
                  key={notification.id}
                  className="flex items-start gap-3 border-none bg-transparent p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                >
                  <span className="flex-shrink-0 mt-0.5 text-[var(--text-primary)]">
                    {notification.icon || <Bell className="h-4 w-4" />}
                  </span>
                  <div className="flex-grow overflow-hidden">
                    <AlertDescription className="text-sm text-[var(--text-primary)]">
                      {notification.message}
                    </AlertDescription>
                    {notification.action && (
                      <Button
                        size="sm"
                        variant="link"
                        onClick={notification.action.onClick}
                        className="p-0 h-auto text-xs text-[var(--primary)] hover:underline mt-1"
                        style={{
                          color: `hsl(${accentColor.values.h}, ${accentColor.values.s}%, ${accentColor.values.l}%)`,
                        }}
                      >
                        {notification.action.label}
                      </Button>
                    )}
                  </div>
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
