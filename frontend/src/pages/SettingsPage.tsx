import { Card } from '@/components/shared/Card';
import { useFontFamily, FONT_FAMILIES } from '@/hooks/useFontFamily';
import { useFontSize } from '@/hooks/useFontSize';
import { Check, Keyboard } from 'lucide-react';

export function SettingsPage() {
  const { fontKey, setFontKey } = useFontFamily();
  const { fontSize, increase, decrease, reset } = useFontSize();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure your application preferences
        </p>
      </div>

      {/* Font Family */}
      <Card className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Font Family</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose a font for the entire application</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {FONT_FAMILIES.map((font) => (
            <button
              key={font.key}
              onClick={() => setFontKey(font.key)}
              className={`relative px-4 py-3 rounded-lg border-2 text-left transition-all ${
                fontKey === font.key
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              style={{ fontFamily: font.value }}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{font.label}</span>
              <br />
              <span className="text-xs text-gray-500 dark:text-gray-400">The quick brown fox</span>
              {fontKey === font.key && (
                <Check className="absolute top-2 right-2 w-4 h-4 text-primary-500" />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Font Size */}
      <Card className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Font Size</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Adjust the base font size ({fontSize}px)</p>
        <div className="flex items-center gap-3">
          <button
            onClick={decrease}
            className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            A-
          </button>
          <div className="flex-1 max-w-[200px] h-2 bg-gray-200 dark:bg-gray-700 rounded-full relative">
            <div
              className="absolute h-2 bg-primary-500 rounded-full"
              style={{ width: `${((fontSize - 10) / 12) * 100}%` }}
            />
          </div>
          <button
            onClick={increase}
            className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            A+
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            Reset
          </button>
        </div>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Keyboard className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Available shortcuts across the application</p>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Global (works on most pages)</h4>
            <div className="space-y-1.5">
              <ShortcutRow keys="Alt + M" description="Toggle tags & assignees visibility" />
              <ShortcutRow keys="Alt + ↓" description="Expand all subnotes / notes" />
              <ShortcutRow keys="Alt + ↑" description="Collapse all subnotes / notes" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Note Detail Page</h4>
            <div className="space-y-1.5">
              <ShortcutRow keys="Alt + M" description="Show/hide meta (tags, assignees) on subnotes" />
              <ShortcutRow keys="Alt + ↓" description="Expand all subnotes" />
              <ShortcutRow keys="Alt + ↑" description="Collapse all subnotes" />
              <ShortcutRow keys="Double-click" description="Edit subnote header inline" />
              <ShortcutRow keys="Esc" description="Cancel inline editing" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority / Hot Topics Page</h4>
            <div className="space-y-1.5">
              <ShortcutRow keys="Alt + M" description="Toggle tags & assignees" />
              <ShortcutRow keys="Alt + ↓" description="Expand all note groups" />
              <ShortcutRow keys="Alt + ↑" description="Collapse all note groups" />
              <ShortcutRow keys="Esc" description="Close expanded description" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Rich Text Editor</h4>
            <div className="space-y-1.5">
              <ShortcutRow keys="Enter" description="New line (or new bullet in lists)" />
              <ShortcutRow keys="Shift + Enter" description="Continue within same bullet" />
              <ShortcutRow keys="Tab" description="Next table cell" />
              <ShortcutRow keys="Esc" description="Close modals / cancel" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ShortcutRow({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded bg-gray-50 dark:bg-gray-800/50">
      <span className="text-sm text-gray-700 dark:text-gray-300">{description}</span>
      <kbd className="px-2 py-0.5 text-xs font-mono font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">
        {keys}
      </kbd>
    </div>
  );
}
