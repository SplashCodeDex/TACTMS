import { ConcatenationConfig } from "./types";

export const DEFAULT_CONCAT_CONFIG: ConcatenationConfig = {
  Title: true,
  "First Name": true,
  Surname: true,
  "Other Names": true,
  "Membership Number": true,
};

export const ASSEMBLIES = [
  "Maranatha",
  "Central",
  "Ayiresu",
  "Adatoh",
  "Adawukwao",
  "Larbie",
  "Osae-Krodua",
  "Holy-Ghost",
  "Fante-Mayera",
];

export const AUTO_SAVE_KEY = "tactmsAutoSaveDraft";
export const AUTO_SAVE_DEBOUNCE_TIME = 3000; // 3 seconds
export const ITEMS_PER_FULL_PREVIEW_PAGE = 20;

export const APP_THEME_STORAGE_KEY = "tactms-theme";
export const APP_ACCENT_COLOR_KEY = "tactms-accent-color";
export const DEFAULT_CONCAT_CONFIG_STORAGE_KEY = "tactmsDefaultConcatConfig";
export const FAVORITES_STORAGE_KEY = "tactmsFavorites";
export const TRANSACTION_LOG_STORAGE_KEY = "tactmsTransactionLog";
export const COLUMN_VISIBILITY_STORAGE_KEY = "tactmsColumnVisibility";
export const MEMBER_DATABASE_STORAGE_KEY = "tactmsMemberDatabase";

export const ACCEPTED_FILE_TYPES = ".xlsx,.xls";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Google Drive Sync Constants
export const GOOGLE_API_KEY = import.meta.env.VITE_API_KEY;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file";
export const FAVORITES_DRIVE_FILENAME = "tactms.app.favorites.json";
export const TRANSACTION_LOG_DRIVE_FILENAME = "tactms.app.transactions.json";

// Theme Options
export const THEME_OPTIONS = [
  { name: "Default Purple", key: "purple", values: { h: 262, s: 83, l: 58 } },
  { name: "Ocean Blue", key: "blue", values: { h: 217, s: 91, l: 60 } },
  { name: "Forest Green", key: "green", values: { h: 142, s: 71, l: 45 } },
  { name: "Sunset Gold", key: "gold", values: { h: 45, s: 93, l: 47 } },
  { name: "Crimson Red", key: "red", values: { h: 347, s: 89, l: 48 } },
];
