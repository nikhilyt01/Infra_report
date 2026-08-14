'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Shift + ? to toggle help
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        setShowHelp(!showHelp);
      }

      // Escape to close help
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }

      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }

      // Alt + H for home
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        window.location.href = '/en';
      }

      // Alt + N for new report
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        window.location.href = '/en/reports/new';
      }

      // Alt + M for map
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        window.location.href = '/en/map';
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showHelp]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
          <button
            onClick={() => setShowHelp(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close shortcuts help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Navigation</h3>
            <div className="space-y-2">
              <ShortcutItem keys={['Alt', 'H']} description="Go to Home" />
              <ShortcutItem keys={['Alt', 'N']} description="Create New Report" />
              <ShortcutItem keys={['Alt', 'M']} description="Open Map View" />
              <ShortcutItem keys={['Tab']} description="Navigate forward" />
              <ShortcutItem keys={['Shift', 'Tab']} description="Navigate backward" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">General</h3>
            <div className="space-y-2">
              <ShortcutItem keys={['Shift', '?']} description="Show this help" />
              <ShortcutItem keys={['Esc']} description="Close dialogs" />
              <ShortcutItem keys={['Ctrl/Cmd', 'K']} description="Search" />
              <ShortcutItem keys={['Enter']} description="Activate focused element" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Accessibility</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                • Use Tab key to navigate through interactive elements<br />
                • Press Enter or Space to activate buttons and links<br />
                • Use Arrow keys to navigate through lists and menus<br />
                • Enable Screen Reader from accessibility menu for audio feedback
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutItem({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-sm text-gray-700 dark:text-gray-300">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="mx-1 text-gray-400">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
