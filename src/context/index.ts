/**
 * Central export for all context providers and their hooks.
 * Import from this file to ensure consistent provider usage.
 */

// Notification Management
export { NotificationProvider, useNotificationContext, useToast } from "./NotificationProvider";
export type { Notification, NotificationContextValue } from "./NotificationProvider";

// Workspace State (tithe list processing)
export { WorkspaceProvider, useWorkspaceContext } from "./WorkspaceProvider";
export type { WorkspaceState, WorkspaceActions, WorkspaceContextValue } from "./WorkspaceProvider";

// Member Database
export { DatabaseProvider, useDatabaseContext } from "./DatabaseProvider";
export type { DatabaseContextValue } from "./DatabaseProvider";

// App Configuration (assemblies, thresholds)
export { AppConfigProvider, useAppConfigContext, DEFAULT_ASSEMBLIES } from "./AppConfigProvider";
export type { AppConfigContextValue } from "./AppConfigProvider";

// Modal Management (existing)
export { ModalProvider, useModalContext } from "./ModalProvider";
export type { ModalKey, ModalPayloads, ModalState, ModalContextValue } from "./ModalProvider";

// AppProviders (root providers composition)
export { AppProviders } from "./AppProviders";
