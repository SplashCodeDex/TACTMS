import React from "react";
import { NotificationProvider } from "./NotificationProvider";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { DatabaseProvider } from "./DatabaseProvider";
import { AppConfigProvider } from "./AppConfigProvider";
import { ModalProvider } from "./ModalProvider";

/**
 * AppProviders - Combines all context providers in the correct order.
 *
 * Provider order matters:
 * 1. AppConfigProvider - Configuration (no dependencies)
 * 2. NotificationProvider - Toast/notifications (no dependencies)
 * 3. DatabaseProvider - Member database (depends on NotificationProvider)
 * 4. WorkspaceProvider - Tithe workspace (depends on NotificationProvider)
 * 5. ModalProvider - Modal state (no dependencies)
 */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <AppConfigProvider>
            <NotificationProvider>
                <DatabaseProvider>
                    <WorkspaceProvider>
                        <ModalProvider>
                            {children}
                        </ModalProvider>
                    </WorkspaceProvider>
                </DatabaseProvider>
            </NotificationProvider>
        </AppConfigProvider>
    );
};

export default AppProviders;
