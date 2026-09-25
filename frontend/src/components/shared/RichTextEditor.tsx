import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import HardBreak from '@tiptap/extension-hard-break';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

import {
  Bold, Italic, Strikethrough, Code,
  Heading1, Heading2, List, ListOrdered, Quote, Undo, Redo,
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon, X,
  RowsIcon, Columns, Trash2, Palette,
} from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect, useRef } from 'react';

// Defined outside component — stable reference, no remount on parent re-render
function Btn({ onClick, active, children, title }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={clsx(
        'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
        active && 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
      )}
    >
      {children}
    </button>
  );
}

function normalizeContent(html: string): string {
  if (!html) return '';
  return html
    .replace(/<p>(.*?)<\/p>/g, (match, content) => {
      if (!content || content.trim() === '') return '';
      return match;
    });
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  className,
  compact = false,
}: RichTextEditorProps) {
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState('3');
  const [tableCols, setTableCols] = useState('3');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDisplay, setLinkDisplay] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const linkPopupRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: { HTMLAttributes: { class: 'leading-tight my-0 py-0' } },
        hardBreak: false,
      }),
      HardBreak.configure({ HTMLAttributes: { class: 'block h-0 leading-none' } }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded' },
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: 'text-primary-600 hover:underline cursor-pointer' },
      }),
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: normalizeContent(content),
    onUpdate: ({ editor }) => {
      let html = editor.getHTML();
      html = html.replace(/\n/g, '<br>');
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: clsx(
          'prose prose-base dark:prose-invert max-w-none focus:outline-none p-3 text-gray-900 dark:text-gray-100',
          '[&_li::marker]:text-gray-900 dark:[&_li::marker]:text-white',
          '[&_li]:!my-0 [&_li]:!py-0 [&_li]:leading-snug [&_ul]:!my-1 [&_ol]:!my-1',
          '[&_p]:leading-tight [&_p]:my-0 [&_p]:py-0',
          '[&_br]:block [&_br]:h-0 [&_br]:leading-none [&_br]:my-0 [&_br]:py-0',
          '[&_code]:bg-gray-900 [&_code]:text-gray-100 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm',
          '[&_code::before]:content-none [&_code::after]:content-none',
          '[&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:overflow-x-auto',
          // Table — auto-width, dark visible borders
          '[&_table]:border-collapse [&_table]:w-auto [&_table]:my-2',
          '[&_th]:border [&_th]:border-gray-900 dark:[&_th]:border-gray-100 [&_th]:bg-gray-100 dark:[&_th]:bg-gray-700 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:whitespace-nowrap',
          '[&_td]:border [&_td]:border-gray-900 dark:[&_td]:border-gray-100 [&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top',
          '[&_tr:hover_td]:bg-gray-50 dark:[&_tr:hover_td]:bg-gray-700/30',
          '[&_strong]:!text-inherit',
          compact ? 'min-h-[100px]' : 'min-h-[160px]'
        ),
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                view.dispatch(view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src })
                ));
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              const { tr } = view.state;
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
              if (pos !== undefined) {
                view.dispatch(tr.insert(pos, view.state.schema.nodes.image.create({ src })));
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleKeyDown(_view, event) {
        if (event.key === 'Escape') return false;
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          if (editor?.isActive('listItem')) {
            // If current list item is empty, exit the list
            const { $from } = editor.state.selection;
            const listItem = $from.node(-1);
            if (listItem && listItem.textContent === '') {
              event.preventDefault();
              editor.chain().focus().liftListItem('listItem').run();
              return true;
            }
            return false;
          }
          event.preventDefault();
          editor?.chain().focus().setHardBreak().run();
          return true;
        }
        if (event.key === 'Backspace' && editor?.isActive('listItem')) {
          const { $from } = editor.state.selection;
          const listItem = $from.node(-1);
          if (listItem && listItem.textContent === '' && $from.parentOffset === 0) {
            event.preventDefault();
            editor.chain().focus().liftListItem('listItem').run();
            return true;
          }
        }
        return false;
      },
    },
  });

  // Ctrl+; to insert date — direct DOM listener for reliability
  useEffect(() => {
    const el = editor?.view?.dom;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Semicolon') {
        e.preventDefault();
        e.stopPropagation();
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        editor.chain()
          .focus()
          .insertContent(`<strong><span style="color:#dc2626">[${dateStr}]</span></strong>`)
          .setHardBreak()
          .setHardBreak()
          .run();
      }
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [editor]);

  if (!editor) return null;

  const inTable = editor.isActive('tableCell') || editor.isActive('tableHeader');

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          editor.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const openLinkPopup = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '');
    const isUrl = selectedText.startsWith('http://') || selectedText.startsWith('https://');
    setLinkUrl(isUrl ? selectedText : '');
    setLinkDisplay(selectedText || '');
    setShowLinkPopup(true);
  };

  const confirmLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const display = linkDisplay.trim() || url;
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    if (hasSelection) {
      editor.chain().focus().deleteSelection().insertContent(`<a href="${url}">${display}</a>`).run();
    } else {
      editor.chain().focus().insertContent(`<a href="${url}">${display}</a>`).run();
    }
    setShowLinkPopup(false);
    setLinkUrl('');
    setLinkDisplay('');
  };

  const confirmInsertTable = () => {
    const rows = parseInt(tableRows) || 3;
    const cols = parseInt(tableCols) || 3;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableModal(false);
    setTableRows('3');
    setTableCols('3');
  };

  const closeTableModal = () => {
    setShowTableModal(false);
    setTableRows('3');
    setTableCols('3');
  };

  useEffect(() => {
    if (!showTableModal || !modalRef.current) return;
    modalRef.current.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeTableModal(); }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [showTableModal]);

  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  useEffect(() => {
    if (!showLinkPopup) return;
    const handler = (e: MouseEvent) => {
      if (linkPopupRef.current && !linkPopupRef.current.contains(e.target as Node)) {
        setShowLinkPopup(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowLinkPopup(false); e.stopPropagation(); }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler, true);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler, true); };
  }, [showLinkPopup]);

  return (
    <div className={clsx('border-2 border-gray-900 dark:border-gray-300 rounded-lg flex flex-col', className)}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 border-b-2 border-b-gray-900 dark:border-b-gray-300 bg-gray-50 dark:bg-gray-800/50 px-2 py-1.5 flex flex-wrap gap-0.5 items-center">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
          <Code className="w-3.5 h-3.5" />
        </Btn>

        {/* Text Color */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            title="Text color"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={clsx(
              'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
              editor.isActive('textStyle') && 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
            )}
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 grid grid-cols-6 gap-1 w-[156px]">
              {[
                '#000000', '#374151', '#6B7280', '#9CA3AF',
                '#DC2626', '#EF4444', '#F97316', '#F59E0B',
                '#EAB308', '#84CC16', '#22C55E', '#10B981',
                '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
                '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
                '#EC4899', '#F43F5E', '#78350F', '#FFFFFF',
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 hover:scale-125 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className="col-span-6 mt-1 px-2 py-1 text-[11px] text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-center"
              >
                Remove color
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1">
          <Heading1 className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2">
          <Heading2 className="w-3.5 h-3.5" />
        </Btn>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
          <Quote className="w-3.5 h-3.5" />
        </Btn>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

        <Btn onClick={() => setShowTableModal(true)} active={inTable} title="Insert Table">
          <TableIcon className="w-3.5 h-3.5" />
        </Btn>
        <div className="relative">
          <Btn onClick={openLinkPopup} title="Add Link">
            <LinkIcon className="w-3.5 h-3.5" />
          </Btn>
          {showLinkPopup && (
            <div ref={linkPopupRef} className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 w-72">
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">URL</label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 outline-none"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmLink(); }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Display text</label>
                  <input
                    type="text"
                    value={linkDisplay}
                    onChange={(e) => setLinkDisplay(e.target.value)}
                    placeholder="Link text (optional)"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmLink(); }}
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowLinkPopup(false)}
                    className="px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmLink}
                    className="px-2.5 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <Btn onClick={addImage} title="Add Image">
          <ImageIcon className="w-3.5 h-3.5" />
        </Btn>

        {/* Table controls — only shown when cursor is inside a table */}
        {inTable && (
          <>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-1.5 py-0.5 text-[11px] rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <RowsIcon className="w-3 h-3" /> +Row
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-1.5 py-0.5 text-[11px] rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Columns className="w-3 h-3" /> +Col
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()}
              className="px-1.5 py-0.5 text-[11px] rounded bg-gray-100 dark:bg-gray-700 hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-600 flex items-center gap-1">
              <RowsIcon className="w-3 h-3" /> -Row
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()}
              className="px-1.5 py-0.5 text-[11px] rounded bg-gray-100 dark:bg-gray-700 hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-600 flex items-center gap-1">
              <Columns className="w-3 h-3" /> -Col
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteTable().run()}
              className="px-1.5 py-0.5 text-[11px] rounded bg-gray-100 dark:bg-gray-700 hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-600 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Del Table
            </button>
          </>
        )}

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

        <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="w-3.5 h-3.5" />
        </Btn>
      </div>

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="dark:bg-gray-800 dark:text-gray-100 h-full" />
      </div>

      {inTable && (
        <div className="px-3 py-1 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          Tab = next cell &nbsp;·&nbsp; Tab on last cell = new row &nbsp;·&nbsp; use toolbar buttons above to add/remove rows &amp; cols
        </div>
      )}

      {/* Table Insert Modal */}
      {showTableModal && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={closeTableModal}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); closeTableModal(); } }}
          tabIndex={-1}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Insert Table</h3>
              <button
                type="button"
                onClick={closeTableModal}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Columns
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableCols}
                  onChange={(e) => setTableCols(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmInsertTable(); }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeTableModal}
                className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmInsertTable}
                className="px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
