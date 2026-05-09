/**
 * Notes.tsx — Complete rewrite
 *
 * Changes from original:
 *  BUG  1 — Added `group` class to NoteCard so hover buttons are visible
 *  BUG  2 — Fixed Pin/Star indicators overlapping at same position
 *  BUG  3 — Fixed tag-cloud `#` prefix breaking fuzzy match
 *  BUG  4 — `createNote` uses deterministic ID — no more fragile `notes[0]`
 *  BUG  5 — Dark mode reads from store `themeMode` (single source of truth)
 *  BUG  6 — Restore + Permanent Delete available in trash view
 *  NEW  — Lexical rich-text editor (replaces deprecated execCommand)
 *  NEW  — 300ms debounced search
 *  NEW  — Filter pills show note count badges
 *  NEW  — Trash banner + restore CTA inside editor panel
 *  NEW  — Better empty-state variants
 *  PERF — All callbacks stable via useCallback; memoisation intact
 *
 * Install before use:
 *   npm install lexical @lexical/react @lexical/rich-text @lexical/list \
 *               @lexical/code @lexical/link @lexical/history \
 *               @lexical/markdown @lexical/html
 */

import {
    useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';

// ── Lexical core ──────────────────────────────────────────────────────────────
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { AutoLinkPlugin, createLinkMatcherWithRegExp } from '@lexical/react/LexicalAutoLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TRANSFORMERS } from '@lexical/markdown';
import {
    $getRoot, $getSelection, $isRangeSelection,
    FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND,
    type EditorState, type LexicalEditor,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import {
    $createHeadingNode, $isHeadingNode,
    HeadingNode, QuoteNode, $createQuoteNode,
} from '@lexical/rich-text';
import {
    INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND,
    ListNode, ListItemNode,
} from '@lexical/list';
import { CodeNode, CodeHighlightNode, $createCodeNode } from '@lexical/code';
import { LinkNode, AutoLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

// ── App ───────────────────────────────────────────────────────────────────────
import { useAppStore, type Note } from '../store/useAppStore';
import { cn } from '../lib/utils';
import ToastContainer, { type ToastItem } from '../components/Toast';
import {
    Plus, Search, Star, Trash2, Pin, X, Maximize2, Minimize2,
    Copy, Bold, Italic, Underline, Strikethrough,
    Code, Quote, List, ListOrdered,
    Heading1, Heading2, Heading3, Minus, Link as LinkIcon,
    Undo2, Redo2, Sun, Moon, Download, FileText, Clock,
    RotateCcw, AlertTriangle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const AUTO_SAVE_DELAY = 800;   // ms
const SEARCH_DEBOUNCE = 300;   // ms

const AUTO_LINK_MATCHERS = [
    createLinkMatcherWithRegExp(/(https?:\/\/[^\s]+)/i, (text: string) => text),
    createLinkMatcherWithRegExp(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i, (text: string) => `mailto:${text}`),
];

// ─────────────────────────────────────────────────────────────────────────────
// LEXICAL CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const EDITOR_NODES = [
    HeadingNode, QuoteNode,
    ListNode, ListItemNode,
    CodeNode, CodeHighlightNode,
    LinkNode, AutoLinkNode,
];

const EDITOR_THEME = {
    heading: {
        h1: 'text-2xl font-bold mt-4 mb-2 text-zinc-900 dark:text-zinc-100',
        h2: 'text-xl font-semibold mt-3 mb-2 text-zinc-900 dark:text-zinc-100',
        h3: 'text-lg font-semibold mt-2 mb-1 text-zinc-900 dark:text-zinc-100',
    },
    text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline underline-offset-2',
        strikethrough: 'line-through opacity-60',
        code: 'font-mono bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[0.85em]',
        underlineStrikethrough: 'underline line-through opacity-60',
    },
    quote: 'border-l-4 border-indigo-400 dark:border-indigo-600 pl-4 text-zinc-500 dark:text-zinc-400 italic my-3',
    list: {
        ul: 'list-disc pl-6 my-2 space-y-1',
        ol: 'list-decimal pl-6 my-2 space-y-1',
        listitem: 'leading-relaxed',
        nested: { listitem: 'list-none' },
        checklist: 'pl-0 my-2 space-y-1',
    },
    code: 'block bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 rounded-xl font-mono text-sm my-3 overflow-x-auto whitespace-pre',
    link: 'text-indigo-500 dark:text-indigo-400 underline cursor-pointer hover:text-indigo-600',
    paragraph: 'leading-relaxed mb-2 text-zinc-900 dark:text-zinc-100',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fuzzyMatch(q: string, text: string): boolean {
    if (!q) return true;
    const ql = q.toLowerCase();
    const tl = text.toLowerCase();
    let qi = 0;
    for (let i = 0; i < tl.length && qi < ql.length; i++)
        if (tl[i] === ql[qi]) qi++;
    return qi === ql.length;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(html: string): number {
    const t = stripHtml(html);
    return t ? t.split(/\s+/).length : 0;
}

function genId(): string {
    return Math.random().toString(36).slice(2, 11);
}

function timeAgo(d: string): string {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const dy = Math.floor(h / 24);
    if (dy < 7) return `${dy}d ago`;
    return new Date(d).toLocaleDateString();
}

function readTime(words: number): string {
    const min = Math.ceil(words / 200);
    return min <= 0 ? '<1 min' : `${min} min`;
}

function downloadFile(filename: string, content: string, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOLBAR PLUGIN  (reads Lexical editor state, dispatches commands)
// ─────────────────────────────────────────────────────────────────────────────

interface ToolbarState {
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isStrikethrough: boolean;
    isCode: boolean;
    isLink: boolean;
    blockType: string;
    canUndo: boolean;
    canRedo: boolean;
}

const INITIAL_TOOLBAR: ToolbarState = {
    isBold: false, isItalic: false, isUnderline: false,
    isStrikethrough: false, isCode: false, isLink: false,
    blockType: 'paragraph', canUndo: false, canRedo: false,
};

function ToolbarPlugin({ onStateChange }: { onStateChange: (s: ToolbarState) => void }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const sel = $getSelection();
                if (!$isRangeSelection(sel)) return;

                const anchor = sel.anchor.getNode();
                const topEl = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElementOrThrow();
                const blockType = $isHeadingNode(topEl) ? topEl.getTag() : topEl.getType();

                onStateChange({
                    isBold: sel.hasFormat('bold'),
                    isItalic: sel.hasFormat('italic'),
                    isUnderline: sel.hasFormat('underline'),
                    isStrikethrough: sel.hasFormat('strikethrough'),
                    isCode: sel.hasFormat('code'),
                    isLink: false, // simplified — add LinkNode check if needed
                    blockType,
                    canUndo: true,
                    canRedo: true,
                });
            });
        });
    }, [editor, onStateChange]);

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEXICAL EDITOR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface LexicalEditorProps {
    note: Note;
    onSave: (html: string, wordCount: number) => void;
    saveTimerRef: React.MutableRefObject<number | null>;
    setSaveStatus: (s: 'saved' | 'unsaved' | 'saving') => void;
}

const LexicalNoteEditor = memo(function LexicalNoteEditor({
    note, onSave, saveTimerRef, setSaveStatus,
}: LexicalEditorProps) {
    const [toolbar, setToolbar] = useState<ToolbarState>(INITIAL_TOOLBAR);

    // Build initial editor state from note's HTML body
    const initialConfig = useMemo(() => ({
        namespace: 'FlowspaceNotes',
        nodes: EDITOR_NODES,
        theme: EDITOR_THEME,
        onError: (err: Error) => console.error('[Lexical]', err),
        editorState: (editor: LexicalEditor) => {
            if (!note.body) return;
            try {
                const parser = new DOMParser();
                const dom = parser.parseFromString(note.body, 'text/html');
                const nodes = $generateNodesFromDOM(editor, dom);
                const root = $getRoot();
                root.clear();
                if (nodes.length > 0) root.append(...nodes);
            } catch (e) {
                console.warn('[Lexical] HTML import failed', e);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [note.id]); // Only reinitialise when note ID changes

    const handleChange = useCallback((editorState: EditorState, editor: LexicalEditor) => {
        setSaveStatus('unsaved');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = window.setTimeout(() => {
            setSaveStatus('saving');
            editorState.read(() => {
                const html = $generateHtmlFromNodes(editor, null);
                const wc = countWords(html);
                onSave(html, wc);
                requestAnimationFrame(() => setSaveStatus('saved'));
            });
        }, AUTO_SAVE_DELAY);
    }, [onSave, setSaveStatus, saveTimerRef]);

    // Toolbar helper
    const tbBtn = (active: boolean, title: string) => cn(
        'p-1.5 rounded-md transition-all duration-150 text-sm',
        active
            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200',
        'title',
    );

    const sep = <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5 self-center" />;

    return (
        <LexicalComposer key={note.id} initialConfig={initialConfig}>

            {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                {/* History */}
                <EditorButton icon={<Undo2 size={14} />} title="Undo (Ctrl+Z)" cmd={UNDO_COMMAND} active={false} />
                <EditorButton icon={<Redo2 size={14} />} title="Redo (Ctrl+Y)" cmd={REDO_COMMAND} active={false} />
                {sep}
                {/* Text formats */}
                <FormatButton icon={<Bold size={14} />} title="Bold" format="bold" active={toolbar.isBold} />
                <FormatButton icon={<Italic size={14} />} title="Italic" format="italic" active={toolbar.isItalic} />
                <FormatButton icon={<Underline size={14} />} title="Underline" format="underline" active={toolbar.isUnderline} />
                <FormatButton icon={<Strikethrough size={14} />} title="Strikethrough" format="strikethrough" active={toolbar.isStrikethrough} />
                <FormatButton icon={<Code size={14} />} title="Inline code" format="code" active={toolbar.isCode} />
                {sep}
                {/* Block types */}
                <BlockButton icon={<Heading1 size={14} />} title="Heading 1" blockType="h1" current={toolbar.blockType} />
                <BlockButton icon={<Heading2 size={14} />} title="Heading 2" blockType="h2" current={toolbar.blockType} />
                <BlockButton icon={<Heading3 size={14} />} title="Heading 3" blockType="h3" current={toolbar.blockType} />
                {sep}
                {/* Lists */}
                <ListButtonComp icon={<List size={14} />} title="Bullet list" ordered={false} active={toolbar.blockType === 'listitem'} />
                <ListButtonComp icon={<ListOrdered size={14} />} title="Ordered list" ordered={true} active={false} />
                {sep}
                {/* Special blocks */}
                <QuoteButtonComp icon={<Quote size={14} />} title="Blockquote" active={toolbar.blockType === 'quote'} />
                <CodeButtonComp icon={<Code size={14} />} title="Code block" active={toolbar.blockType === 'code'} />
                {sep}
                {/* Link */}
                <LinkButtonComp icon={<LinkIcon size={14} />} title="Insert link" active={toolbar.isLink} />
            </div>

            {/* ── Editor body ─────────────────────────────────────────────────────── */}
            <div className="relative flex-1">
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable
                            className={cn(
                                'outline-none min-h-[200px] px-5 py-4',
                                'text-zinc-800 dark:text-zinc-200 leading-relaxed',
                                'focus:outline-none',
                                // Prose-like spacing
                                '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2',
                                '[&_h2]:text-xl  [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2',
                                '[&_h3]:text-lg  [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1',
                                '[&_p]:mb-2 [&_p]:leading-relaxed',
                                '[&_blockquote]:border-l-4 [&_blockquote]:border-indigo-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-500 [&_blockquote]:my-3',
                                '[&_pre]:bg-zinc-100 dark:[&_pre]:bg-zinc-900 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:font-mono [&_pre]:text-sm [&_pre]:overflow-x-auto [&_pre]:my-3',
                                '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2',
                                '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2',
                                '[&_a]:text-indigo-500 [&_a]:underline',
                            )}
                            aria-label="Note body"
                        />
                    }
                    placeholder={
                        <div className="absolute top-4 left-5 text-zinc-400 dark:text-zinc-600 pointer-events-none select-none text-base">
                            Start writing… or type <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-mono">#</kbd> for a heading
                        </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                />
            </div>

            {/* ── Plugins ─────────────────────────────────────────────────────────── */}
            <HistoryPlugin />
            <ListPlugin />
            <CheckListPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
            <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
            <ToolbarPlugin onStateChange={setToolbar} />
        </LexicalComposer>
    );
});

// ── Toolbar sub-buttons (need editor context so they live below LexicalComposer) ──

function FormatButton({ icon, title, format, active }: {
    icon: React.ReactNode; title: string; format: string; active: boolean;
}) {
    const [editor] = useLexicalComposerContext();
    return (
        <button
            title={title}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format as any)}
            className={cn(
                'p-1.5 rounded-md transition-all duration-150',
                active
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200',
            )}
        >{icon}</button>
    );
}

function EditorButton({ icon, title, cmd, active }: {
    icon: React.ReactNode; title: string; cmd: any; active: boolean;
}) {
    const [editor] = useLexicalComposerContext();
    return (
        <button
            title={title}
            onClick={() => editor.dispatchCommand(cmd, undefined)}
            className={cn(
                'p-1.5 rounded-md transition-all duration-150',
                active
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200',
            )}
        >{icon}</button>
    );
}

function BlockButton({ icon, title, blockType, current }: {
    icon: React.ReactNode; title: string; blockType: string; current: string;
}) {
    const [editor] = useLexicalComposerContext();
    const active = current === blockType;
    const toggle = () => {
        editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
                if (active) {
                    $setBlocksType(sel, () => { const { $createParagraphNode } = require('lexical'); return $createParagraphNode(); });
                } else {
                    $setBlocksType(sel, () => $createHeadingNode(blockType as 'h1' | 'h2' | 'h3'));
                }
            }
        });
    };
    return (
        <button title={title} onClick={toggle} className={cn(
            'p-1.5 rounded-md transition-all duration-150',
            active
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200',
        )}>{icon}</button>
    );
}

function QuoteButtonComp({ icon, title, active }: { icon: React.ReactNode; title: string; active: boolean }) {
    const [editor] = useLexicalComposerContext();
    const toggle = () => {
        editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
                $setBlocksType(sel, () => active
                    ? (() => { const { $createParagraphNode } = require('lexical'); return $createParagraphNode(); })()
                    : $createQuoteNode()
                );
            }
        });
    };
    return (
        <button title={title} onClick={toggle} className={cn(
            'p-1.5 rounded-md transition-all duration-150',
            active ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200',
        )}>{icon}</button>
    );
}

function CodeButtonComp({ icon, title, active }: { icon: React.ReactNode; title: string; active: boolean }) {
    const [editor] = useLexicalComposerContext();
    const toggle = () => {
        editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
                $setBlocksType(sel, () => active
                    ? (() => { const { $createParagraphNode } = require('lexical'); return $createParagraphNode(); })()
                    : $createCodeNode()
                );
            }
        });
    };
    return (
        <button title={title} onClick={toggle} className={cn(
            'p-1.5 rounded-md transition-all duration-150',
            active ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200',
        )}>{icon}</button>
    );
}

function ListButtonComp({ icon, title, ordered, active }: {
    icon: React.ReactNode; title: string; ordered: boolean; active: boolean;
}) {
    const [editor] = useLexicalComposerContext();
    const cmd = ordered ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND;
    return (
        <button title={title} onClick={() => editor.dispatchCommand(cmd, undefined)} className={cn(
            'p-1.5 rounded-md transition-all duration-150',
            active ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200',
        )}>{icon}</button>
    );
}

function LinkButtonComp({ icon, title, active }: { icon: React.ReactNode; title: string; active: boolean }) {
    const [editor] = useLexicalComposerContext();
    const insert = () => {
        const url = prompt('Enter URL:');
        if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.startsWith('http') ? url : `https://${url}`);
    };
    return (
        <button title={title} onClick={insert} className={cn(
            'p-1.5 rounded-md transition-all duration-150',
            active ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200',
        )}>{icon}</button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE CARD
// ─────────────────────────────────────────────────────────────────────────────

const NoteCard = memo(function NoteCard({
    note, isActive, onOpen, onPin, onStar, onTrash, onDuplicate, onRestore, onPermDelete,
}: {
    note: Note;
    isActive: boolean;
    onOpen: (n: Note) => void;
    onPin: (id: string) => void;
    onStar: (id: string) => void;
    onTrash: (id: string) => void;
    onDuplicate: (n: Note) => void;
    onRestore: (id: string) => void;
    onPermDelete: (id: string) => void;
}) {
    const preview = stripHtml(note.body ?? '').slice(0, 120);
    const isTrash = note.deleted;

    return (
        <article
            onClick={() => onOpen(note)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpen(note)}
            className={cn(
                // FIX 1: `group` class added so hover:opacity actions become visible
                'group relative flex flex-col gap-2 p-4 cursor-pointer rounded-2xl border',
                'transition-all duration-200 select-none',
                'shadow-sm hover:shadow-md hover:-translate-y-0.5',
                isTrash
                    ? 'opacity-60 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                    : [
                        'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
                        'hover:border-indigo-300 dark:hover:border-indigo-700',
                        isActive && 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-900/50 bg-indigo-50/50 dark:bg-zinc-700/50',
                    ],
            )}
        >
            {/* FIX 2: Pin + Star indicators at distinct positions, not overlapping */}
            {note.pinned && !isTrash && (
                <span className="absolute top-2.5 right-2.5 text-amber-500" title="Pinned">
                    <Pin size={11} className="fill-amber-500" />
                </span>
            )}
            {note.starred && !isTrash && (
                <span className={cn('absolute text-yellow-400', note.pinned ? 'top-2.5 right-6' : 'top-2.5 right-2.5')} title="Starred">
                    <Star size={11} className="fill-yellow-400" />
                </span>
            )}

            {/* Title */}
            <h3 className={cn(
                'font-semibold text-sm leading-snug break-words pr-6',
                isTrash ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100',
            )}>
                {note.title || 'Untitled'}
            </h3>

            {/* Preview */}
            {preview && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed flex-1">
                    {preview}
                </p>
            )}

            {/* Tags */}
            {(note.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {(note.tags ?? []).slice(0, 4).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-medium">
                            #{tag}
                        </span>
                    ))}
                    {(note.tags ?? []).length > 4 && (
                        <span className="text-[10px] text-zinc-400">+{note.tags.length - 4}</span>
                    )}
                </div>
            )}

            {/* Footer row: time + word count */}
            <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 pt-1">
                <time className="flex items-center gap-1"><Clock size={9} />{timeAgo(note.updatedAt)}</time>
                {(note.wordCount ?? 0) > 0 && (
                    <span>{note.wordCount} w · {readTime(note.wordCount)}</span>
                )}
            </div>

            {/* Action buttons — visible on hover (group-hover) */}
            <div
                className="absolute bottom-3 right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {isTrash ? (
                    // FIX 6: Restore + Permanent Delete in trash view
                    <>
                        <button
                            onClick={() => onRestore(note.id)}
                            className="p-1.5 rounded-lg bg-white dark:bg-zinc-700 shadow-sm hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                            title="Restore"
                        >
                            <RotateCcw size={12} />
                        </button>
                        <button
                            onClick={() => onPermDelete(note.id)}
                            className="p-1.5 rounded-lg bg-white dark:bg-zinc-700 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                            title="Delete forever"
                        >
                            <Trash2 size={12} />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => onPin(note.id)} className={cn('p-1.5 rounded-lg bg-white dark:bg-zinc-700 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors', note.pinned ? 'text-amber-500' : 'text-zinc-400')} title="Pin"><Pin size={12} /></button>
                        <button onClick={() => onStar(note.id)} className={cn('p-1.5 rounded-lg bg-white dark:bg-zinc-700 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors', note.starred ? 'text-yellow-500' : 'text-zinc-400')} title="Star"><Star size={12} /></button>
                        <button onClick={() => onDuplicate(note)} className="p-1.5 rounded-lg bg-white dark:bg-zinc-700 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-400 transition-colors" title="Duplicate"><Copy size={12} /></button>
                        <button onClick={() => onTrash(note.id)} className="p-1.5 rounded-lg bg-white dark:bg-zinc-700 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500 transition-colors" title="Move to trash"><Trash2 size={12} /></button>
                    </>
                )}
            </div>
        </article>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ filter, query, onCreate }: {
    filter: 'all' | 'starred' | 'trash'; query: string; onCreate: () => void;
}) {
    if (query) return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-5xl">🔍</div>
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No results for "{query}"</p>
            <p className="text-sm text-zinc-400">Try a different search or check your spelling.</p>
        </div>
    );
    if (filter === 'trash') return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-5xl">🗑️</div>
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Trash is empty</p>
            <p className="text-sm text-zinc-400">Deleted notes will appear here.</p>
        </div>
    );
    if (filter === 'starred') return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-5xl">⭐</div>
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No starred notes</p>
            <p className="text-sm text-zinc-400">Star a note to find it here quickly.</p>
        </div>
    );
    return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-5xl">📝</div>
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No notes yet</p>
            <p className="text-sm text-zinc-400 mb-2">Create your first note and start writing.</p>
            <button
                onClick={onCreate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-colors shadow-sm"
            >
                Create Note
            </button>
            <p className="text-xs text-zinc-400 mt-1">Or press <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">Ctrl+N</kbd></p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN NOTES PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function NotesPage() {
    const {
        notes, addNote, updateNote,
        trashNote, restoreNote, permanentDeleteNote,
        // FIX 5: Read dark mode from store (single source of truth)
        themeMode, setThemeMode,
    } = useAppStore();

    const darkMode = themeMode === 'dark';

    // Layout state
    const [panelOpen, setPanelOpen] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [showExport, setShowExport] = useState(false);

    // Filter state
    const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'trash'>('all');

    // FIX 3 / PERF: Debounced search
    const [rawSearch, setRawSearch] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setSearchQuery(rawSearch), SEARCH_DEBOUNCE);
        return () => clearTimeout(t);
    }, [rawSearch]);

    // Editor state
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
    const [tagInput, setTagInput] = useState('');

    // Toasts
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    // Refs
    const saveTimerRef = useRef<number | null>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

    // Apply dark mode to document
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    // Derived: all unique tags from non-deleted notes
    const allTags = useMemo(() => {
        const set = new Set<string>();
        notes.filter((n) => !n.deleted).forEach((n) => (n.tags ?? []).forEach((t) => set.add(t)));
        return Array.from(set).sort();
    }, [notes]);

    // Filter + sort notes
    const filteredNotes = useMemo(() => {
        let list = [...notes];
        if (activeFilter === 'trash') list = list.filter((n) => n.deleted);
        else if (activeFilter === 'starred') list = list.filter((n) => !n.deleted && n.starred);
        else list = list.filter((n) => !n.deleted);

        if (searchQuery.trim()) {
            // FIX 3: Strip leading `#` when matching against tag strings
            const tagQ = searchQuery.startsWith('#') ? searchQuery.slice(1) : searchQuery;
            list = list.filter((n) =>
                fuzzyMatch(searchQuery, n.title) ||
                fuzzyMatch(searchQuery, stripHtml(n.body ?? '')) ||
                (n.tags ?? []).some((t) => fuzzyMatch(tagQ, t)),
            );
        }

        return list.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [notes, activeFilter, searchQuery]);

    // Badge counts for filter pills
    const counts = useMemo(() => ({
        all: notes.filter((n) => !n.deleted).length,
        starred: notes.filter((n) => !n.deleted && n.starred).length,
        trash: notes.filter((n) => n.deleted).length,
    }), [notes]);

    // ── Toast helpers ──────────────────────────────────────────────────────────
    const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
        const id = genId();
        setToasts((prev) => [...prev, { ...toast, id }]);
        return id;
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // ── Note actions ───────────────────────────────────────────────────────────

    const openNote = useCallback((note: Note) => {
        setActiveNoteId(note.id);
        setPanelOpen(true);
        setSaveStatus('saved');
        setTagInput('');
        // Set title (plain text)
        requestAnimationFrame(() => {
            if (titleRef.current) {
                titleRef.current.innerText = note.title === 'Untitled' ? '' : note.title;
            }
            titleRef.current?.focus();
        });
    }, []);

    const closePanel = useCallback(() => {
        setPanelOpen(false);
        setFocusMode(false);
    }, []);

    // FIX 4: Deterministic ID — no more fragile notes[0] access
    const createNote = useCallback(() => {
        const tempId = genId();
        const now = new Date().toISOString();
        const shell: Note = {
            id: tempId, title: 'Untitled', body: '',
            tags: [], pinned: false, starred: false, deleted: false,
            wordCount: 0, createdAt: now, updatedAt: now,
        };
        addNote(shell);
        // Open immediately using the ID we just generated
        setTimeout(() => {
            const found = useAppStore.getState().notes.find((n) => n.id === tempId);
            if (found) openNote(found);
        }, 20);
    }, [addNote, openNote]);

    // Save title on blur / save trigger
    const saveTitleNow = useCallback(() => {
        if (!activeNoteId || !titleRef.current) return;
        const title = titleRef.current.innerText.trim() || 'Untitled';
        updateNote(activeNoteId, { title });
    }, [activeNoteId, updateNote]);

    // Called by Lexical OnChangePlugin
    const handleEditorSave = useCallback((html: string, wordCount: number) => {
        if (!activeNoteId) return;
        updateNote(activeNoteId, { body: html, wordCount });
    }, [activeNoteId, updateNote]);

    // Trash / restore
    const handleTrash = useCallback((noteId: string) => {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;
        trashNote(noteId);
        if (activeNoteId === noteId) closePanel();
        const toastId = addToast({
            message: `"${note.title}" moved to Trash`,
            type: 'danger',
            undoFn: () => { restoreNote(noteId); dismissToast(toastId); },
        });
    }, [notes, trashNote, restoreNote, activeNoteId, closePanel, addToast, dismissToast]);

    const handleRestore = useCallback((noteId: string) => {
        restoreNote(noteId);
        if (activeNoteId === noteId) closePanel();
        addToast({ message: 'Note restored', type: 'success' });
    }, [restoreNote, activeNoteId, closePanel, addToast]);

    const handlePermDelete = useCallback((noteId: string) => {
        permanentDeleteNote(noteId);
        if (activeNoteId === noteId) closePanel();
        addToast({ message: 'Note permanently deleted', type: 'danger' });
    }, [permanentDeleteNote, activeNoteId, closePanel, addToast]);

    const handleDuplicate = useCallback((note: Note) => {
        const { id, createdAt, updatedAt, ...rest } = note;
        addNote({ ...rest, title: `${note.title} (copy)`, pinned: false });
        addToast({ message: 'Note duplicated', type: 'success' });
    }, [addNote, addToast]);

    const handlePin = useCallback((id: string) => {
        const note = notes.find((n) => n.id === id);
        if (note) updateNote(id, { pinned: !note.pinned });
    }, [notes, updateNote]);

    const handleStar = useCallback((id: string) => {
        const note = notes.find((n) => n.id === id);
        if (note) updateNote(id, { starred: !note.starred });
    }, [notes, updateNote]);

    // Tag management
    const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!activeNoteId) return;
        const note = notes.find((n) => n.id === activeNoteId);
        const current = note?.tags ?? [];
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
            if (!tag || current.includes(tag)) return;
            updateNote(activeNoteId, { tags: [...current, tag] });
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && current.length > 0) {
            updateNote(activeNoteId, { tags: current.slice(0, -1) });
        }
    }, [activeNoteId, tagInput, notes, updateNote]);

    const removeTag = useCallback((tag: string) => {
        if (!activeNote) return;
        updateNote(activeNote.id, { tags: activeNote.tags.filter((t) => t !== tag) });
    }, [activeNote, updateNote]);

    // Export
    const handleExport = useCallback((format: 'html' | 'txt') => {
        if (!activeNote) return;
        const slug = activeNote.title.replace(/[^a-zA-Z0-9]/g, '_');
        if (format === 'html') {
            downloadFile(`${slug}.html`,
                `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${activeNote.title}</title>`
                + `<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;line-height:1.7;color:#1a1a1a}`
                + `h1,h2,h3{margin-top:1.5em}pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow-x:auto}`
                + `blockquote{border-left:3px solid #6366f1;padding-left:1em;color:#555;margin:1em 0}</style></head>`
                + `<body><h1>${activeNote.title}</h1>${activeNote.body}</body></html>`,
                'text/html');
        } else {
            downloadFile(`${slug}.txt`, `${activeNote.title}\n${'─'.repeat(40)}\n\n${stripHtml(activeNote.body)}`);
        }
        setShowExport(false);
        addToast({ message: `Exported as ${format.toUpperCase()}`, type: 'success' });
    }, [activeNote, addToast]);

    // Close export menu on outside click
    useEffect(() => {
        if (!showExport) return;
        const handler = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node))
                setShowExport(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showExport]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.key === 'n') { e.preventDefault(); createNote(); return; }
            if (ctrl && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); setFocusMode((p) => !p); return; }
            if (e.key === 'Escape') {
                if (focusMode) { setFocusMode(false); return; }
                if (panelOpen) { closePanel(); return; }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [createNote, panelOpen, focusMode, closePanel]);

    // Cleanup save timer
    useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

    // ── RENDER ─────────────────────────────────────────────────────────────────
    return (
        <div className={cn(
            'flex flex-col h-screen max-h-screen overflow-hidden font-sans transition-colors duration-200',
            darkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900',
        )}>

            {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
            <header className="flex items-center justify-between px-5 h-14 min-h-[56px] bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-30 gap-4 shrink-0">
                <h1 className="text-base font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap select-none shrink-0 flex items-center gap-2">
                    📒 <span>Notes</span>
                </h1>

                {/* Search */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-3 py-1.5 gap-2 max-w-sm w-full">
                    <Search size={14} className="text-zinc-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search notes…"
                        value={rawSearch}
                        onChange={(e) => setRawSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-400"
                    />
                    {rawSearch && (
                        <button onClick={() => { setRawSearch(''); setSearchQuery(''); }}>
                            <X size={13} className="text-zinc-400 hover:text-zinc-600" />
                        </button>
                    )}
                </div>

                {/* Filter pills with badge counts */}
                <div className="hidden sm:flex gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 shrink-0">
                    {(['all', 'starred', 'trash'] as const).map((key) => (
                        <button
                            key={key}
                            onClick={() => setActiveFilter(key)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all duration-150',
                                activeFilter === key
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                            )}
                        >
                            {key === 'all' ? 'All' : key === 'starred' ? 'Starred' : 'Trash'}
                            <span className={cn(
                                'px-1.5 py-0.5 rounded-full text-[10px] font-semibold min-w-[18px] text-center',
                                activeFilter === key
                                    ? 'bg-white/20 text-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500',
                            )}>
                                {counts[key]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {activeNote && panelOpen && (
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                onClick={() => setShowExport((p) => !p)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                            >
                                <Download size={13} /><span className="hidden sm:inline">Export</span>
                            </button>
                            {showExport && (
                                <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl py-1 z-50 min-w-[140px] overflow-hidden">
                                    <button onClick={() => handleExport('html')} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                        <FileText size={13} /> HTML file
                                    </button>
                                    <button onClick={() => handleExport('txt')} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                        <FileText size={13} /> Plain text
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FIX 5: Toggle writes to store */}
                    <button
                        onClick={() => setThemeMode(darkMode ? 'light' : 'dark')}
                        className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title={darkMode ? 'Light mode' : 'Dark mode'}
                    >
                        {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                    </button>

                    <button
                        onClick={createNote}
                        className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
                        title="New note (Ctrl+N)"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </header>

            {/* ══ TAG CLOUD ════════════════════════════════════════════════════════ */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-5 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    {allTags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setRawSearch('#' + tag)}
                            className={cn(
                                'px-2.5 py-0.5 text-xs rounded-full font-medium transition-all duration-150',
                                searchQuery === '#' + tag
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
                            )}
                        >
                            #{tag}
                        </button>
                    ))}
                    {rawSearch.startsWith('#') && (
                        <button onClick={() => setRawSearch('')} className="px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                            Clear ×
                        </button>
                    )}
                </div>
            )}

            {/* ══ MAIN GRID ════════════════════════════════════════════════════════ */}
            <div className={cn(
                'flex-1 overflow-y-auto p-5 transition-all duration-300 ease-in-out',
                panelOpen && !focusMode && 'mr-[44%]',
            )}>
                {filteredNotes.length === 0
                    ? <EmptyState filter={activeFilter} query={rawSearch} onCreate={createNote} />
                    : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(256px,1fr))] gap-3 pb-10">
                            {filteredNotes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    isActive={activeNoteId === note.id}
                                    onOpen={openNote}
                                    onPin={handlePin}
                                    onStar={handleStar}
                                    onTrash={handleTrash}
                                    onDuplicate={handleDuplicate}
                                    onRestore={handleRestore}
                                    onPermDelete={handlePermDelete}
                                />
                            ))}
                        </div>
                    )}
            </div>

            {/* ══ SLIDE-IN EDITOR PANEL ════════════════════════════════════════════ */}
            <div className={cn(
                'fixed top-0 right-0 h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800',
                'shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col',
                focusMode ? 'w-full' : 'w-[44%]',
                panelOpen ? 'translate-x-0' : 'translate-x-full',
            )}>
                {activeNote ? (
                    <>
                        {/* ── Panel Header ───────────────────────────────────────────── */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 shrink-0 bg-white dark:bg-zinc-900">
                            <div className="flex items-center gap-0.5">
                                {activeNote.deleted ? (
                                    // FIX 6: Restore / Perm-delete in panel header for trash notes
                                    <>
                                        <button onClick={() => handleRestore(activeNote.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors">
                                            <RotateCcw size={13} /> Restore
                                        </button>
                                        <button onClick={() => handlePermDelete(activeNote.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 transition-colors ml-1">
                                            <Trash2 size={13} /> Delete forever
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <ActionBtn onClick={() => handlePin(activeNote.id)} title="Pin" active={!!activeNote.pinned} activeColor="text-amber-500"><Pin size={16} /></ActionBtn>
                                        <ActionBtn onClick={() => handleStar(activeNote.id)} title="Star" active={!!activeNote.starred} activeColor="text-yellow-500"><Star size={16} /></ActionBtn>
                                        <ActionBtn onClick={() => handleDuplicate(activeNote)} title="Duplicate"><Copy size={16} /></ActionBtn>
                                        <ActionBtn onClick={() => handleTrash(activeNote.id)} title="Move to trash" danger><Trash2 size={16} /></ActionBtn>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-0.5">
                                {/* Save status */}
                                <span className={cn(
                                    'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full mr-1',
                                    saveStatus === 'saved' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' :
                                        saveStatus === 'saving' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' :
                                            'text-zinc-400',
                                )}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', saveStatus === 'saved' ? 'bg-green-500' : 'bg-amber-500 animate-pulse')} />
                                    {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                                </span>
                                <ActionBtn onClick={() => setFocusMode((p) => !p)} title={focusMode ? 'Exit focus' : 'Focus mode'}>
                                    {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </ActionBtn>
                                <ActionBtn onClick={closePanel} title="Close panel"><X size={16} /></ActionBtn>
                            </div>
                        </div>

                        {/* ── Trash banner ───────────────────────────────────────────── */}
                        {activeNote.deleted && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs shrink-0">
                                <AlertTriangle size={13} />
                                <span>This note is in Trash and is read-only. Restore it to edit.</span>
                            </div>
                        )}

                        {/* ── Title ──────────────────────────────────────────────────── */}
                        <div className="px-5 pt-4 pb-2 shrink-0">
                            <div
                                ref={titleRef}
                                contentEditable={!activeNote.deleted}
                                suppressContentEditableWarning
                                className={cn(
                                    'text-2xl font-bold outline-none text-zinc-900 dark:text-zinc-100 leading-tight',
                                    'empty:before:content-["Untitled"] empty:before:text-zinc-300 dark:empty:before:text-zinc-600',
                                    activeNote.deleted && 'opacity-60 cursor-default',
                                )}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); } }}
                                onBlur={saveTitleNow}
                            />
                        </div>

                        {/* ── Lexical Editor ─────────────────────────────────────────── */}
                        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                            {!activeNote.deleted ? (
                                <LexicalNoteEditor
                                    note={activeNote}
                                    onSave={handleEditorSave}
                                    saveTimerRef={saveTimerRef}
                                    setSaveStatus={setSaveStatus}
                                />
                            ) : (
                                // Read-only preview for trashed notes
                                <div
                                    className="px-5 py-4 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed opacity-70 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: activeNote.body }}
                                />
                            )}
                        </div>

                        {/* ── Panel Footer: tags + metadata ──────────────────────────── */}
                        <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-700 shrink-0 flex flex-col gap-2">
                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {activeNote.tags.map((tag) => (
                                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-medium">
                                        #{tag}
                                        {!activeNote.deleted && (
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors ml-0.5">
                                                <X size={9} />
                                            </button>
                                        )}
                                    </span>
                                ))}
                                {!activeNote.deleted && (
                                    <input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder="+ tag"
                                        className="border-none bg-transparent outline-none text-xs text-zinc-500 placeholder:text-zinc-400 min-w-[50px] max-w-[100px]"
                                    />
                                )}
                            </div>

                            {/* Metadata row */}
                            <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                                <span className="flex items-center gap-1"><Clock size={10} /> Updated {timeAgo(activeNote.updatedAt)}</span>
                                <span>{activeNote.wordCount ?? 0} words · {readTime(activeNote.wordCount ?? 0)} read</span>
                            </div>
                        </div>
                    </>
                ) : (
                    /* No note selected placeholder */
                    <div className="flex-1 flex items-center justify-center text-zinc-400 text-center p-8">
                        <div>
                            <div className="text-4xl mb-3">✍️</div>
                            <p className="text-sm">Select a note or create a new one</p>
                            <button onClick={createNote} className="mt-4 px-4 py-2 text-xs bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors">
                                New Note
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile backdrop */}
            {panelOpen && !focusMode && (
                <div
                    className="hidden max-md:block fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
                    onClick={closePanel}
                />
            )}

            {/* Toasts */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION BUTTON (panel header utility)
// ─────────────────────────────────────────────────────────────────────────────

function ActionBtn({ children, onClick, title, active, activeColor, danger }: {
    children: React.ReactNode;
    onClick: () => void;
    title?: string;
    active?: boolean;
    activeColor?: string;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                'p-2 rounded-lg transition-all duration-150',
                active
                    ? cn('bg-zinc-100 dark:bg-zinc-800', activeColor ?? 'text-indigo-600')
                    : danger
                        ? 'text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300',
            )}
        >
            {children}
        </button>
    );
}