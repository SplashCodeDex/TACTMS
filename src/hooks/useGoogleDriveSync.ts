import { useState, useEffect, useCallback, useRef } from "react";
import {
  FavoriteConfig,
  GoogleUserProfile,
  TransactionLogEntry,
} from "../types";
import { AppToastType } from "../lib/toast";
import {
  FAVORITES_STORAGE_KEY,
  GOOGLE_API_KEY,
  GOOGLE_CLIENT_ID,
  DRIVE_SCOPES,
  FAVORITES_DRIVE_FILENAME,
  TRANSACTION_LOG_STORAGE_KEY,
  TRANSACTION_LOG_DRIVE_FILENAME,
} from "../constants";
import { useFindOrCreateDriveFile, useReadFromDrive, useSaveToDrive } from "./useGoogleDriveQuery";
import { useDebounce } from "./useDebounce";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

const IS_DRIVE_CONFIGURED = !!(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);

const useSyncedState = <T>(storageKey: string, addToast: Function) => {
  const [state, setState] = useState<T[]>([]);

  useEffect(() => {
    try {
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        setState(JSON.parse(localData));
      }
    } catch (e) {
      console.error(`Failed to load ${storageKey} from localStorage`, e);
      addToast(`Could not load local ${storageKey}.`, "error");
    }
  }, [storageKey, addToast]);

  const setSyncedState = useCallback(
    (newValue: T[] | ((prevState: T[]) => T[])) => {
      setState((prevState) => {
        const updatedValue =
          typeof newValue === "function" ? newValue(prevState) : newValue;
        try {
          localStorage.setItem(storageKey, JSON.stringify(updatedValue));
        } catch (e) {
          console.error(`Failed to save ${storageKey} to localStorage`, e);
          addToast(`Could not save ${storageKey} locally.`, "error");
        }
        return updatedValue;
      });
    },
    [storageKey, addToast],
  );

  return [state, setSyncedState] as const;
};

export const useGoogleDriveSync = (
  addToast: (
    message: string,
    type: AppToastType,
    duration?: number,
  ) => void,
) => {
  const [favorites, setFavorites] = useSyncedState<FavoriteConfig>(
    FAVORITES_STORAGE_KEY,
    addToast,
  );
  const [transactionLog, setTransactionLog] =
    useSyncedState<TransactionLogEntry>(TRANSACTION_LOG_STORAGE_KEY, addToast);

  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(
    null,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [isConfigured] = useState(IS_DRIVE_CONFIGURED);

  const isSyncingRef = useRef(false);

  const { data: favFileId } = useFindOrCreateDriveFile(
    FAVORITES_DRIVE_FILENAME,
    isLoggedIn,
  );
  const { data: logFileId } = useFindOrCreateDriveFile(
    TRANSACTION_LOG_DRIVE_FILENAME,
    isLoggedIn,
  );

  const { data: driveFavorites, isLoading: isLoadingFavorites } =
    useReadFromDrive<FavoriteConfig>(favFileId, isLoggedIn);
  const { data: driveLog, isLoading: isLoadingLog } =
    useReadFromDrive<TransactionLogEntry>(logFileId, isLoggedIn);

  const { mutate: saveFavorites } = useSaveToDrive(favFileId);
  const { mutate: saveLog } = useSaveToDrive(logFileId);

  useEffect(() => {
    if (!isConfigured) return;
    const scriptGapi = document.createElement("script");
    scriptGapi.src = "https://apis.google.com/js/api.js";
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = () =>
      window.gapi.load("client", () => {
        window.gapi.client
          .init({ apiKey: GOOGLE_API_KEY })
          .then(() => {
            window.gapi.client.load("drive", "v3", () =>
              setIsGapiLoaded(true),
            );
          })
          .catch((e: any) => console.error("Error init gapi client", e));
      });
    document.body.appendChild(scriptGapi);

    const scriptGsi = document.createElement("script");
    scriptGsi.src = "https://accounts.google.com/gsi/client";
    scriptGsi.async = true;
    scriptGsi.defer = true;
    scriptGsi.onload = () => setIsGsiLoaded(true);
    document.body.appendChild(scriptGsi);
  }, [isConfigured]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await window.gapi.client.request({
        path: "https://www.googleapis.com/oauth2/v3/userinfo",
      });
      setUserProfile({
        id: res.result.sub,
        name: res.result.name,
        email: res.result.email,
        imageUrl: res.result.picture,
      });
    } catch (e) {
      console.error("Error fetching user profile", e);
    }
  }, []);

  useEffect(() => {
    if (isConfigured && isGapiLoaded && isGsiLoaded && !window.tokenClient) {
      window.tokenClient = (window.google.accounts as any).oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error("Token error:", tokenResponse.error);
            addToast("Authentication failed. Please try again.", "error");
            return;
          }
          window.gapi.client.setToken(tokenResponse);
          setIsLoggedIn(true);
          fetchUserProfile();
        },
      });
    }
  }, [isConfigured, isGapiLoaded, isGsiLoaded, addToast, fetchUserProfile]);

  const syncWithDrive = useCallback(
    async (isLocalChange = false) => {
      if (
        !isLoggedIn ||
        isSyncingRef.current ||
        isLoadingFavorites ||
        isLoadingLog
      )
        return;
      isSyncingRef.current = true;
      setSyncStatus("syncing");

      const MAX_RETRIES = 3;
      let attempt = 0;
      let success = false;

      while (attempt < MAX_RETRIES && !success) {
        try {
          if (!favFileId || !logFileId)
            throw new Error("Could not find or create Drive files.");

          const localFavorites = JSON.parse(
            localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]",
          );
          const localLog = JSON.parse(
            localStorage.getItem(TRANSACTION_LOG_STORAGE_KEY) || "[]",
          );

          if (isLocalChange) {
            saveFavorites(localFavorites);
            saveLog(localLog);
          } else {
            const {
              mergedData: mergedFavs,
              updated: favUp,
              added: favAdd,
            } = mergeData(localFavorites, driveFavorites || []);
            const {
              mergedData: mergedLog,
              updated: logUp,
              added: logAdd,
            } = mergeData(localLog, driveLog || []);

            setFavorites(mergedFavs);
            setTransactionLog(mergedLog);

            saveFavorites(mergedFavs);
            saveLog(mergedLog);

            if (favUp + favAdd + logUp + logAdd > 0) {
              addToast(
                `Sync complete. Loaded ${favAdd + logAdd} new items from Drive.`,
                "info",
              );
            } else {
              addToast("Data is up to date.", "success", 2000);
            }
          }
          setSyncStatus("synced");
          success = true;
        } catch (e: any) {
          attempt++;
          console.error(`Sync error (attempt ${attempt}/${MAX_RETRIES}):`, e);

          if (attempt >= MAX_RETRIES) {
            setSyncStatus("error");
            const errorMsg =
              e.result?.error?.message || "An unknown error occurred during sync.";
            addToast(`Google Drive sync failed after ${MAX_RETRIES} attempts: ${errorMsg}`, "error");
          } else {
            // Wait before retrying (exponential backoff could be added here)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      isSyncingRef.current = false;
    },
    [
      isLoggedIn,
      favFileId,
      logFileId,
      driveFavorites,
      driveLog,
      isLoadingFavorites,
      isLoadingLog,
      addToast,
      setFavorites,
      setTransactionLog,
      saveFavorites,
      saveLog,
    ],
  );

  const mergeData = <T extends { id: string; timestamp?: number }>(
    local: T[],
    remote: T[],
  ) => {
    const map = new Map<string, T>();
    let updated = 0;
    let added = 0;
    [...local, ...remote].forEach((item) => {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
        if (!local.find((i) => i.id === item.id)) added++;
      } else if (
        item.timestamp &&
        existing.timestamp &&
        item.timestamp > existing.timestamp
      ) {
        map.set(item.id, item);
        if (existing.timestamp !== item.timestamp) updated++;
      }
    });
    return {
      mergedData: Array.from(map.values()).sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
      ),
      updated,
      added,
    };
  };

  const debouncedFavorites = useDebounce(favorites, 1500);
  const debouncedTransactionLog = useDebounce(transactionLog, 1500);

  useEffect(() => {
    if (isLoggedIn && favFileId && logFileId) {
      syncWithDrive();
    }
  }, [isLoggedIn, favFileId, logFileId, syncWithDrive]);

  useEffect(() => {
    if (isLoggedIn && favFileId && logFileId) {
      syncWithDrive(true);
    }
  }, [debouncedFavorites, debouncedTransactionLog, isLoggedIn, favFileId, logFileId, syncWithDrive]);

  const signIn = () => {
    if (!isConfigured) {
      addToast(
        "Cloud Sync feature is not configured by the administrator.",
        "error",
      );
      return;
    }
    if (!isGapiLoaded || !isGsiLoaded) {
      addToast("Google API is not ready. Please wait a moment.", "warning");
      return;
    }
    if (window.tokenClient)
      window.tokenClient.requestAccessToken({ prompt: "consent" });
    else {
      addToast(
        "Google authentication is not ready. Please try again in a moment.",
        "warning",
      );
      console.error("signIn called but window.tokenClient is not initialized.");
    }
  };

  const signOut = () => {
    window.gapi.client.setToken(null);
    setIsLoggedIn(false);
    setUserProfile(null);
    setSyncStatus("idle");
    addToast("Signed out from Google.", "info");
  };

  return {
    favorites,
    setFavorites,
    transactionLog,
    setTransactionLog,
    isLoggedIn,
    userProfile,
    syncStatus,
    signIn,
    signOut,
    isConfigured,
  };
};
