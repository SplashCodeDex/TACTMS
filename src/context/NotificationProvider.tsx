import React, { createContext, useCallback, useContext, useState, useMemo } from "react";
import { showToast } from "../lib/toast";

export interface Notification {
    id: string;
    message: string;
    type: "info" | "success" | "error" | "warning";
    action?: { label: string; onClick: () => void };
    icon?: React.ReactNode;
}

export interface NotificationContextValue {
    globalNotifications: Notification[];
    addNotification: (notification: Omit<Notification, "id">) => void;
    removeNotification: (id: string) => void;
    addToast: (
        message: string,
        type: "info" | "success" | "error" | "warning",
        duration?: number,
        actions?: { label: string; onClick: () => void }[]
    ) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [globalNotifications, setGlobalNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((notification: Omit<Notification, "id">) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setGlobalNotifications((prev) => [...prev, { ...notification, id }]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setGlobalNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const addToast = useCallback(
        (
            message: string,
            type: "info" | "success" | "error" | "warning",
            duration?: number,
            actions?: { label: string; onClick: () => void }[]
        ) => {
            showToast({ message, type, duration, actions });
        },
        []
    );

    const value = useMemo<NotificationContextValue>(
        () => ({
            globalNotifications,
            addNotification,
            removeNotification,
            addToast,
        }),
        [globalNotifications, addNotification, removeNotification, addToast]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export function useNotificationContext() {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error("useNotificationContext must be used within a NotificationProvider");
    }
    return ctx;
}

// Convenience hook for the addToast function (most commonly used)
export function useToast() {
    const { addToast } = useNotificationContext();
    return addToast;
}
