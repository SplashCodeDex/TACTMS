import { useState, useCallback, useEffect } from "react";
import { FavoriteConfig } from "../types";

const FAVORITES_STORAGE_KEY = "tactms_favorites";

interface UseFavoritesReturn {
    favorites: FavoriteConfig[];
    setFavorites: React.Dispatch<React.SetStateAction<FavoriteConfig[]>>;
    saveFavorite: (
        newFavorite: Omit<FavoriteConfig, "id" | "timestamp">
    ) => FavoriteConfig;
    deleteFavorite: (favId: string) => void;
    updateFavoriteName: (favId: string, newName: string) => void;
    getFavoriteById: (favId: string) => FavoriteConfig | undefined;
    favoritesSearchTerm: string;
    setFavoritesSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    filteredFavorites: FavoriteConfig[];
}

/**
 * Hook to manage favorites with localStorage persistence.
 */
export function useFavorites(
    addToast: (message: string, type: "info" | "success" | "error" | "warning") => void
): UseFavoritesReturn {
    const [favorites, setFavorites] = useState<FavoriteConfig[]>(() => {
        const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!saved) return [];
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse favorites from storage:", e);
            return [];
        }
    });

    const [favoritesSearchTerm, setFavoritesSearchTerm] = useState("");

    // Persist to localStorage on change
    useEffect(() => {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    }, [favorites]);

    const saveFavorite = useCallback(
        (newFavoriteData: Omit<FavoriteConfig, "id" | "timestamp">): FavoriteConfig => {
            const newFavorite: FavoriteConfig = {
                ...newFavoriteData,
                id: `${Date.now()}`,
                timestamp: Date.now(),
            };

            setFavorites((prev) => [
                newFavorite,
                ...prev.filter((f) => f.name !== newFavorite.name),
            ]);
            addToast("Saved to favorites!", "success");
            return newFavorite;
        },
        [addToast]
    );

    const deleteFavorite = useCallback(
        (favId: string) => {
            setFavorites((prev) => prev.filter((f) => f.id !== favId));
            addToast("Favorite deleted.", "success");
        },
        [addToast]
    );

    const updateFavoriteName = useCallback(
        (favId: string, newName: string) => {
            setFavorites((prev) =>
                prev.map((f) =>
                    f.id === favId ? { ...f, name: newName, timestamp: Date.now() } : f
                )
            );
        },
        []
    );

    const getFavoriteById = useCallback(
        (favId: string): FavoriteConfig | undefined => {
            return favorites.find((f) => f.id === favId);
        },
        [favorites]
    );

    const filteredFavorites = favorites.filter((f) =>
        f.name.toLowerCase().includes(favoritesSearchTerm.toLowerCase())
    );

    return {
        favorites,
        setFavorites,
        saveFavorite,
        deleteFavorite,
        updateFavoriteName,
        getFavoriteById,
        favoritesSearchTerm,
        setFavoritesSearchTerm,
        filteredFavorites,
    };
}
