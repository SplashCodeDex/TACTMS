import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  RotateCcw,
  Info as InfoIconLucide,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
} from "lucide-react";
import Button from "../components/Button";
import { FavoriteConfig } from "../types";
import type { AppToastType } from "../lib/toast";
import { useAppConfigContext } from "../context";
import { useOutletContext } from "react-router-dom";

interface FavoritesViewProps {
  favorites: FavoriteConfig[];
  favoritesSearchTerm: string;
  setFavoritesSearchTerm: (term: string) => void;
  loadFavorite: (favId: string) => void;
  deleteFavorite: (favId: string) => void;
  viewFavoriteDetails: (fav: FavoriteConfig) => void;
  updateFavoriteName: (favId: string, newName: string) => void;
  addToast: (
    message: string,
    type: AppToastType,
    duration?: number,
  ) => void;
}

const FavoritesView: React.FC = React.memo(() => {
  const { assemblies } = useAppConfigContext();
  const {
    favorites = [],
    favoritesSearchTerm,
    setFavoritesSearchTerm,
    loadFavorite,
    deleteFavorite,
    viewFavoriteDetails,
    updateFavoriteName,
    addToast,
  } = useOutletContext<FavoritesViewProps>();
  const [searchInput, setSearchInput] = useState(favoritesSearchTerm);
  const [editingFavId, setEditingFavId] = useState<string | null>(null);
  const [editingFavName, setEditingFavName] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setFavoritesSearchTerm(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, setFavoritesSearchTerm]);

  useEffect(() => {
    setSearchInput(favoritesSearchTerm);
  }, [favoritesSearchTerm]);

  const handleStartEditing = (fav: FavoriteConfig) => {
    setEditingFavId(fav.id);
    setEditingFavName(fav.name);
  };

  const handleCancelEditing = () => {
    setEditingFavId(null);
    setEditingFavName("");
  };

  const handleSaveEditing = () => {
    if (editingFavId) {
      if (!editingFavName.trim()) {
        addToast("Favorite name cannot be empty.", "error");
        return;
      }
      updateFavoriteName(editingFavId, editingFavName);
      addToast("Favorite renamed successfully.", "success");
      handleCancelEditing();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveEditing();
    else if (e.key === "Escape") handleCancelEditing();
  };

  const groupedAndFilteredFavorites = useMemo(() => {
    const search = (favoritesSearchTerm || "").toLowerCase();

    const filtered = favorites
      .filter((fav: FavoriteConfig) => {
        // Basic data integrity: A favorite must have an assembly name to be displayed.
        if (!fav || !fav.assemblyName) {
          return false;
        }
        if (!search) {
          return true;
        }
        return (
          (fav.name ?? "").toLowerCase().includes(search) ||
          (fav.originalFileName ?? "").toLowerCase().includes(search) ||
          (fav.assemblyName ?? "").toLowerCase().includes(search)
        );
      })
      .sort((a: FavoriteConfig, b: FavoriteConfig) => b.timestamp - a.timestamp);

    const grouped = new Map<string, FavoriteConfig[]>();

    // Dynamically create groups for all assemblies present in the filtered data
    // while also including all standard assemblies to maintain the structure.
    const allPresentAssemblies = new Set([
      ...assemblies,
      ...filtered.map((f: FavoriteConfig) => f.assemblyName),
    ]);

    allPresentAssemblies.forEach((assembly) => {
      grouped.set(assembly, []);
    });

    filtered.forEach((fav: FavoriteConfig) => {
      // fav.assemblyName is guaranteed to exist here due to the filter above.
      const group = grouped.get(fav.assemblyName);
      if (group) {
        // Defensive check
        group.push(fav);
      }
    });

    // When searching, we only want to show assemblies that have results.
    // When not searching, we want to show all assemblies.
    const entries = Array.from(grouped.entries());
    const result = favoritesSearchTerm
      ? entries.filter(([_, favs]) => favs.length > 0)
      : entries;

    // Defensive sorting to prevent crashes on malformed data
    return result.sort((a, b) => (a[0] || "").localeCompare(b[0] || ""));
  }, [favorites, favoritesSearchTerm]);

  const hasSearchResults = groupedAndFilteredFavorites.length > 0;

  return (
    <div className="space-y-8">
      <section className="content-card" aria-labelledby="favorites-heading">
        <h2 id="favorites-heading" className="section-heading">
          <Star size={22} className="mr-3 icon-primary" />
          Saved Configurations & Data
        </h2>
        <input
          type="search"
          placeholder="Search favorites by name, original file, or assembly..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="form-input-light w-full mb-8"
          aria-label="Search saved favorites"
        />
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Star
              size={52}
              className="mx-auto text-[var(--text-muted)] mb-4 opacity-50"
            />
            <p className="text-[var(--text-secondary)] text-lg">
              No favorites found.
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Save configurations from the Processor view for easy reuse!
            </p>
          </div>
        ) : !hasSearchResults ? (
          <div className="text-center py-12">
            <Search
              size={52}
              className="mx-auto text-[var(--text-muted)] mb-4 opacity-50"
            />
            <p className="text-[var(--text-secondary)] text-lg">
              No favorites match your search.
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Try a different search term or clear the search to see all
              items.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedAndFilteredFavorites.map(([assemblyName, favs]) => {
              if (favoritesSearchTerm && favs.length === 0) return null;
              return (
                <div key={assemblyName}>
                  <h3 className="text-xl font-bold text-gradient-primary mb-4 pb-2 border-b border-[var(--border-color)]">
                    {assemblyName} Assembly
                  </h3>
                  {favs.length === 0 ? (
                    <p className="text-sm text-center text-[var(--text-muted)] py-4">
                      No saved items for this assembly.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {favs.map((fav) => (
                        <div
                          key={fav.id}
                          className="content-card p-5 border border-[var(--border-color-light)] transition-all duration-200 card-glow-on-hover flex flex-col"
                        >
                          <div className="flex-grow">
                            {editingFavId === fav.id ? (
                              <div className="w-full mb-3">
                                <input
                                  id={`edit-fav-name-${fav.id}`}
                                  type="text"
                                  value={editingFavName}
                                  onChange={(e) =>
                                    setEditingFavName(e.target.value)
                                  }
                                  onKeyDown={handleInputKeyDown}
                                  className="form-input-light w-full text-lg py-1"
                                  autoFocus
                                  onFocus={(e) => e.target.select()}
                                  aria-label={`New name for favorite ${fav.name}`}
                                />
                              </div>
                            ) : (
                              <h3
                                className="font-semibold text-lg text-[var(--text-primary)] truncate mb-1.5"
                                title={fav.name}
                              >
                                {fav.name}
                              </h3>
                            )}
                            <p className="text-xs text-[var(--text-muted)] mb-0.5">
                              Original File:{" "}
                              <span className="font-medium text-[var(--text-secondary)] truncate block max-w-xs">
                                {fav.originalFileName || "N/A"}
                              </span>
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mb-1">
                              List Records:{" "}
                              <span className="font-medium text-[var(--text-secondary)]">
                                {fav.titheListData?.length || 0}
                              </span>
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mb-4">
                              Saved:{" "}
                              {new Date(fav.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2.5 mt-auto pt-4 border-t border-[var(--border-color)]">
                            {editingFavId === fav.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={handleSaveEditing}
                                  leftIcon={<Check size={16} />}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEditing}
                                  leftIcon={<X size={16} />}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => loadFavorite(fav.id)}
                                  leftIcon={<RotateCcw size={16} />}
                                >
                                  Load
                                </Button>
                                <Button
                                  size="sm"
                                  variant="subtle"
                                  onClick={() => handleStartEditing(fav)}
                                  leftIcon={<Pencil size={16} />}
                                >
                                  Rename
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => viewFavoriteDetails(fav)}
                                  leftIcon={<InfoIconLucide size={16} />}
                                >
                                  Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => deleteFavorite(fav.id)}
                                  leftIcon={<Trash2 size={16} />}
                                  className="ml-auto !bg-transparent !text-[var(--danger-text)] hover:!bg-[var(--danger-start)]/10"
                                  aria-label={`Delete favorite ${fav.name}`}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
},
);

export default FavoritesView;
