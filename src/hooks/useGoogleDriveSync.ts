import { useState, useEffect, useCallback, useRef } from "react";
import {
  FavoriteConfig,
  GoogleUserProfile,
  TransactionLogEntry,
} from "../types";
import { toast } from "sonner";
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

type SyncStatus = "idle" | "syncing" | "synced" | "error";

const IS_DRIVE_CONFIGURED = !!(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);

const useSyncedState = <T>(storageKey: string) => {
  const [state, setState] = useState<T[]>([]);

  useEffect(() => {
    try {
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        setState(JSON.parse(localData));
      }
    } catch (e) {
      console.error(`Failed to load ${storageKey} from localStorage`, e);
      toast.error(`Could not load local ${storageKey}.`);
    }
  }, [storageKey]);

  const setSyncedState = useCallback(
    (newValue: T[] | ((prevState: T[]) => T[])) => {
      setState((prevState) => {
        const updatedValue =
          typeof newValue === "function" ? newValue(prevState) : newValue;
        try {
          localStorage.setItem(storageKey, JSON.stringify(updatedValue));
        } catch (e) {
          console.error(`Failed to save ${storageKey} to localStorage`, e);
          toast.error(`Could not save ${storageKey} locally.`);
        }
        return updatedValue;
      });
    },
    [storageKey],
  );

  return [state, setSyncedState] as const;
};

export const useGoogleDriveSync = () => {
  const [favorites, setFavorites] = useSyncedState<FavoriteConfig>(
    FAVORITES_STORAGE_KEY,
  );
  const [transactionLog, setTransactionLog] =
    useSyncedState<TransactionLogEntry>(TRANSACTION_LOG_STORAGE_KEY);

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
            toast.error("Authentication failed. Please try again.");
            return;
          }
          window.gapi.client.setToken(tokenResponse);
          setIsLoggedIn(true);
          fetchUserProfile();
        },
      });
    }
  }, [isConfigured, isGapiLoaded, isGsiLoaded, fetchUserProfile]);

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
            toast.info(
              `Sync complete. Loaded ${favAdd + logAdd} new items from Drive.`,
            );
          } else {
            toast.success("Data is up to date.");
          }
        }
        setSyncStatus("synced");
      } catch (e: any) {
        console.error("Sync error:", e);
        setSyncStatus("error");
        const errorMsg =
          e.result?.error?.message || "An unknown error occurred during sync.";
        toast.error(`Google Drive sync failed: ${errorMsg}`);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [
      isLoggedIn,
      favFileId,
      logFileId,
      driveFavorites,
      driveLog,
      isLoadingFavorites,
      isLoadingLog,
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

  useEffect(() => {
    if (isLoggedIn && favFileId && logFileId) {
      syncWithDrive();
    }
  }, [isLoggedIn, favFileId, logFileId, syncWithDrive]);

  useEffect(() => {
    if (isLoggedIn && favFileId && logFileId) {
      const t = setTimeout(() => syncWithDrive(true), 1500);
      return () => clearTimeout(t);
    }
  }, [favorites, transactionLog, isLoggedIn, favFileId, logFileId, syncWithDrive]);

  const signIn = () => {
    if (!isConfigured) {
      toast.error(
        "Cloud Sync feature is not configured by the administrator.",
      );
      return;
    }
    if (!isGapiLoaded || !isGsiLoaded) {
      toast.warning("Google API is not ready. Please wait a moment.");
      return;
    }
    if (window.tokenClient)
      window.tokenClient.requestAccessToken({ prompt: "consent" });
    else {
      toast.warning(
        "Google authentication is not ready. Please try again in a moment.",
      );
      console.error("signIn called but window.tokenClient is not initialized.");
    }
  };

  const signOut = () => {
    window.gapi.client.setToken(null);
    setIsLoggedIn(false);
    setUserProfile(null);
    setSyncStatus("idle");
    toast.info("Signed out from Google.");
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
