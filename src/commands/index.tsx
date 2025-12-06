import React from "react";
import { FavoriteConfig, ViewType } from "../types";
import {
  LayoutDashboard,
  Cpu,
  Database,
  Star,
  PieChart,
  BotMessageSquare,
  Sun,
  Moon,
  ChevronsRight,
} from "lucide-react";

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactElement;
  onPerform: () => void;
  keywords?: string[];
}

interface BuildParams {
  setActiveView: (view: ViewType) => void;
  setTheme: (theme: "dark" | "light") => void;
  onStartNewWeek: (assemblyName: string) => void;
  favorites: FavoriteConfig[];
  theme: "dark" | "light";
  assemblies: string[];
}

export function buildCommandActions({
  setActiveView,
  setTheme,
  onStartNewWeek,
  favorites,
  theme,
  assemblies,
}: BuildParams): CommandAction[] {
  const assembliesWithFavorites = new Set(favorites.map((f) => f.assemblyName));

  const base: CommandAction[] = [
    // Navigation
    {
      id: "nav_dashboard",
      title: "Go to Dashboard",
      subtitle: "View KPIs and recent activity",
      icon: <LayoutDashboard size={18} />,
      onPerform: () => setActiveView("dashboard"),
      keywords: ["home", "main"],
    },
    {
      id: "nav_processor",
      title: "Go to Tithe Processor",
      subtitle: "Process weekly tithe lists",
      icon: <Cpu size={18} />,
      onPerform: () => setActiveView("processor"),
      keywords: ["upload", "generate", "new list"],
    },
    {
      id: "nav_database",
      title: "Go to Member Database",
      subtitle: "View and manage master lists",
      icon: <Database size={18} />,
      onPerform: () => setActiveView("database"),
      keywords: ["members", "master"],
    },
    {
      id: "nav_favorites",
      title: "Go to Favorites",
      subtitle: "Load saved configurations",
      icon: <Star size={18} />,
      onPerform: () => setActiveView("favorites"),
      keywords: ["saved", "load"],
    },
    {
      id: "nav_reports",
      title: "Go to Reports",
      subtitle: "View annual performance",
      icon: <PieChart size={18} />,
      onPerform: () => setActiveView("reports"),
      keywords: ["stats", "statistics", "charts"],
    },
    {
      id: "nav_analytics",
      title: "Go to AI Analytics",
      subtitle: "Chat with your data",
      icon: <BotMessageSquare size={18} />,
      onPerform: () => setActiveView("analytics"),
      keywords: ["ai", "chat", "gemini"],
    },
  ];

  const themeActions: CommandAction[] = theme === "dark"
    ? [
      {
        id: "theme_light",
        title: "Switch to Light Theme",
        icon: <Sun size={18} />,
        onPerform: () => setTheme("light"),
      },
    ]
    : [
      {
        id: "theme_dark",
        title: "Switch to Dark Theme",
        icon: <Moon size={18} />,
        onPerform: () => setTheme("dark"),
      },
    ];

  const dynamic: CommandAction[] = assemblies.filter((name) =>
    assembliesWithFavorites.has(name),
  ).map((name) => ({
    id: `start_week_${name}`,
    title: `Start New Week: ${name}`,
    subtitle: "Load latest member list",
    icon: <ChevronsRight size={18} />,
    onPerform: () => onStartNewWeek(name),
    keywords: ["start", name],
  }));

  return [...base, ...themeActions, ...dynamic];
}
