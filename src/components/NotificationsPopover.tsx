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
        <Button className="relative" size="icon" variant="ghost">
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
      <PopoverContent className="w-80 border rounded-xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {pendingNotifications > 0 && (
              <Button size="sm" variant="ghost">
                Mark all as read
              </Button>
            )}
          </div>
          <Separator />
          <div className="space-y-2">
            {pendingNotifications === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No new notifications.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="text-sm">
                  <p className="font-medium">{notification.message}</p>
                  {notification.action && (
                    <Button
                      size="sm"
                      variant="link"
                      onClick={notification.action.onClick}
                      className="p-0 h-auto text-xs"
                    >
                      {notification.action.label}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
