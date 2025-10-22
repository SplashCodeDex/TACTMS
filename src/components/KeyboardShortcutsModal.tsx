import React from 'react';
import Modal from './Modal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { shortcuts, updateShortcut, resetShortcuts } = useKeyboardShortcuts();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = React.useState(false);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
        <div className="p-6">
          {isEditing ? (
            <div>
              <ul className="space-y-4">
                {shortcuts.map((shortcut) => (
                  <li key={shortcut.action} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">{shortcut.action}</span>
                    <input
                      type="text"
                      value={shortcut.keys}
                      onChange={(e) => updateShortcut(shortcut.action, e.target.value)}
                      className="w-24 px-2 py-1 text-sm text-[var(--text-primary)] bg-[var(--input-bg)] rounded-md"
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setIsConfirmingReset(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Reset to Default
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div>
              <ul className="space-y-4">
                {shortcuts.map((shortcut) => (
                  <li key={shortcut.action} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">{shortcut.action}</span>
                    <kbd className="px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-md">
                      {shortcut.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Customize
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
      {isConfirmingReset && (
        <Modal isOpen={isConfirmingReset} onClose={() => setIsConfirmingReset(false)} title="Reset Shortcuts?">
          <div className="p-6">
            <p className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to reset all keyboard shortcuts to their default settings? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsConfirmingReset(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetShortcuts();
                  setIsConfirmingReset(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Reset
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default KeyboardShortcutsModal;
