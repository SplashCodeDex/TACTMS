import { useState, useEffect } from 'react';

export interface Shortcut {
  action: string;
  keys: string;
}

const defaultShortcuts: Shortcut[] = [
  {
    action: "Open Command Palette",
    keys: "⌘K",
  },
  {
    action: "Toggle Sidebar",
    keys: "⌘B",
  },
  {
    action: "Toggle Theme",
    keys: "⌘T",
  },
];

export const useKeyboardShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    const savedShortcuts = localStorage.getItem('keyboardShortcuts');
    if (savedShortcuts) {
      return JSON.parse(savedShortcuts);
    }
    return defaultShortcuts;
  });

  useEffect(() => {
    localStorage.setItem('keyboardShortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  const updateShortcut = (action: string, keys: string) => {
    setShortcuts((prevShortcuts) =>
      prevShortcuts.map((shortcut) =>
        shortcut.action === action ? { ...shortcut, keys } : shortcut
      )
    );
  };

  const resetShortcuts = () => {
    setShortcuts(defaultShortcuts);
  };

  return { shortcuts, updateShortcut, resetShortcuts };
};
