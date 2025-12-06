// This file is for augmenting global types, specifically for external libraries
// like Google APIs that attach themselves to the window object.

/// <reference types="gapi" />
/// <reference types="google-one-tap" />

declare global {
  interface Window {
    // Augment the window object to include gapi and google
    gapi: typeof gapi;
    google: typeof google;
    // This specific client is created and attached to window in useGoogleDriveSync.ts
    tokenClient: google.accounts.oauth2.TokenClient;
    launchQueue?: {
      setConsumer(
        consumer: (launchParams: {
          files: FileSystemFileHandle[];
        }) => Promise<void>,
      ): void;
    };
  }
}

// Augment the gapi.client namespace to include the dynamically loaded 'drive' property.
// This prevents TypeScript errors when accessing gapi.client.drive.
declare namespace gapi.client {
  export const drive: any;
}

// This empty export statement is crucial. It turns this file into a module,
// which allows the `declare global` augmentation to be applied correctly.
export { };
