import { useEffect } from "react";

export function useOnlineStatus(onChange?: (online: boolean) => void) {
  useEffect(() => {
    const handleOnline = () => onChange?.(true);
    const handleOffline = () => onChange?.(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onChange]);
}
