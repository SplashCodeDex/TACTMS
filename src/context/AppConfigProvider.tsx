import React, { createContext, useCallback, useContext, useState, useMemo, useEffect } from "react";

// Storage key for persisting custom assemblies
const CUSTOM_ASSEMBLIES_STORAGE_KEY = "tactmsCustomAssemblies";

// Default assemblies for Jei-Krodua District
const DEFAULT_ASSEMBLIES = [
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

export interface AppConfigContextValue {
    // Assemblies
    assemblies: string[];
    addAssembly: (name: string) => void;
    removeAssembly: (name: string) => void;
    resetToDefaultAssemblies: () => void;
    isCustomAssembly: (name: string) => boolean;

    // Matching settings
    fuzzyMatchThreshold: number;
    setFuzzyMatchThreshold: (threshold: number) => void;

    // Amount snapping - snaps extracted amounts to nearby common values (e.g., 59→60)
    enableAmountSnapping: boolean;
    setEnableAmountSnapping: (enabled: boolean) => void;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Load custom assemblies from localStorage, merge with defaults
    const [customAssemblies, setCustomAssemblies] = useState<string[]>(() => {
        const saved = localStorage.getItem(CUSTOM_ASSEMBLIES_STORAGE_KEY);
        if (!saved) return [];
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse custom assemblies:", e);
            return [];
        }
    });

    // Fuzzy match threshold (default 0.8, configurable)
    const [fuzzyMatchThreshold, setFuzzyMatchThreshold] = useState<number>(() => {
        const saved = localStorage.getItem("tactmsFuzzyMatchThreshold");
        return saved ? parseFloat(saved) : 0.8;
    });

    // Amount snapping: snaps 59→60 based on assembly patterns (opt-in, defaults off)
    const [enableAmountSnapping, setEnableAmountSnapping] = useState<boolean>(() => {
        const saved = localStorage.getItem("tactmsEnableAmountSnapping");
        return saved === "true";
    });

    // Persist custom assemblies to localStorage
    useEffect(() => {
        localStorage.setItem(CUSTOM_ASSEMBLIES_STORAGE_KEY, JSON.stringify(customAssemblies));
    }, [customAssemblies]);

    // Persist fuzzy match threshold
    useEffect(() => {
        localStorage.setItem("tactmsFuzzyMatchThreshold", String(fuzzyMatchThreshold));
    }, [fuzzyMatchThreshold]);

    // Persist amount snapping setting
    useEffect(() => {
        localStorage.setItem("tactmsEnableAmountSnapping", String(enableAmountSnapping));
    }, [enableAmountSnapping]);

    // Combine default + custom assemblies (unique, sorted)
    const assemblies = useMemo(() => {
        const combined = [...new Set([...DEFAULT_ASSEMBLIES, ...customAssemblies])];
        return combined.sort((a, b) => a.localeCompare(b));
    }, [customAssemblies]);

    const addAssembly = useCallback((name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        setCustomAssemblies((prev) => {
            // Check if already exists (case-insensitive)
            const exists = [...DEFAULT_ASSEMBLIES, ...prev].some(
                (a) => a.toLowerCase() === trimmedName.toLowerCase()
            );
            if (exists) return prev;
            return [...prev, trimmedName];
        });
    }, []);

    const removeAssembly = useCallback((name: string) => {
        // Can only remove custom assemblies, not defaults
        setCustomAssemblies((prev) => prev.filter((a) => a !== name));
    }, []);

    const resetToDefaultAssemblies = useCallback(() => {
        setCustomAssemblies([]);
    }, []);

    const isCustomAssembly = useCallback(
        (name: string) => {
            return customAssemblies.includes(name) && !DEFAULT_ASSEMBLIES.includes(name);
        },
        [customAssemblies]
    );

    const value = useMemo<AppConfigContextValue>(
        () => ({
            assemblies,
            addAssembly,
            removeAssembly,
            resetToDefaultAssemblies,
            isCustomAssembly,
            fuzzyMatchThreshold,
            setFuzzyMatchThreshold,
            enableAmountSnapping,
            setEnableAmountSnapping,
        }),
        [
            assemblies,
            addAssembly,
            removeAssembly,
            resetToDefaultAssemblies,
            isCustomAssembly,
            fuzzyMatchThreshold,
            enableAmountSnapping,
        ]
    );

    return (
        <AppConfigContext.Provider value={value}>
            {children}
        </AppConfigContext.Provider>
    );
};

export function useAppConfigContext() {
    const ctx = useContext(AppConfigContext);
    if (!ctx) {
        throw new Error("useAppConfigContext must be used within an AppConfigProvider");
    }
    return ctx;
}

// Re-export default assemblies for backward compatibility during migration
export { DEFAULT_ASSEMBLIES };
