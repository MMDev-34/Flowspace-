import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useAppStore, type Note } from '../store/useAppStore';
import { cn } from '../lib/utils';
import {
    Plus, Search, Star, Trash2, Pin, X, Maximize2, Minimize2,
    Bold, Italic, Underline, Strikethrough,
    Code, Quote, List, ListOrdered,
    Heading1, Heading2, Heading3, Link as LinkIcon,
    Undo2, Redo2, Clock, RotateCcw, AlertTriangle, FileText as NoteIcon,
} from 'lucide-react';

// Lexical imports
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
    $createParagraphNode,
    type EditorState, type LexicalCommand, type TextFormatType
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, HeadingNode, QuoteNode, $createQuoteNode } from '@lexical/rich-text';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode, $createCodeNode } from '@lexical/code';
import { LinkNode, AutoLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

// ── Constants ──────────────────────────────────────────────

const AUTO_SAVE_DELAY = 800;
const SEARCH_DEBOUNCE = 300;
const AUTO_LINK_MATCHERS = [
    createLinkMatcherWithRegExp(/(https?:\/\/[^\s]+)/i, (text: string) => text),
    createLinkMatcherWithRegExp(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i, (text: string) => `mailto:${text}`),
];

const EDITOR_NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, CodeHighlightNode, LinkNode, AutoLinkNode];

const EDITOR_THEME = {
    heading: {
        h1: 'text-2xl font-bold mt-4 mb-2 text-foreground',
        h2: 'text-xl font-semibold mt-3 mb-2 text-foreground',
        h3: 'text-lg font-semibold mt-2 mb-1 text-foreground',
    },
    text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline underline-offset-2',
        strikethrough: 'line-through opacity-60',
        code: 'font-mono bg-section px-1.5 py-0.5 rounded text-primary text-[0.85em]',
        underlineStrikethrough: 'underline line-through opacity-60',
    },
    quote: 'border-l-2 border-primary/50 pl-4 text-muted-foreground italic my-3',
    list: { ul: 'list-disc pl-6 my-2 space-y-1', ol: 'list-decimal pl-6 my-2 space-y-1', listitem: 'leading-relaxed', nested: { listitem: 'list-none' }, checklist: 'pl-0 my-2 space-y-1' },
    code: 'block bg-section border border-border p-4 rounded-xl font-mono text-sm my-3 overflow-x-auto whitespace-pre',
    link: 'text-primary underline cursor-pointer hover:opacity-80',
    paragraph: 'leading-relaxed mb-2 text-foreground',
};

const NOTE_COLORS = [
    '#6366f1', '#8b5cf6', '#00d4ff', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
];

// ── Types ──────────────────────────────────────────────────

interface ToolbarState {
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isStrikethrough: boolean;
    isCode: boolean;
    blockType: string;
}

// ── Helpers ──────────────────────────────────────────────────

function stripHtml(html: string | undefined | null): string {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function countWords(html: string | undefined | null): number {
    const t = stripHtml(html);
    return t ? t.split(/\s+/).length : 0;
}
function genId(): string {
    return Math.random().toString(36).slice(2, 11);
}
function timeAgo(d: string | undefined | null): string {
    if (!d) return '';
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
function fuzzyMatch(q: string, text: string | undefined | null): boolean {
    if (!q) return true;
    if (!text) return false;
    const ql = q.toLowerCase();
    const tl = text.toLowerCase();
    let qi = 0;
    for (let i = 0; i < tl.length && qi < ql.length; i++) if (tl[i] === ql[qi]) qi++;
    return qi === ql.length;
}
function highlightText(text: string | undefined | null, query: string) {
    if (!text) return '';
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part) =>
        part.toLowerCase() === query.toLowerCase()
            ? `<mark class="bg-yellow-400/30 text-yellow-200 rounded-sm">${part}</mark>`
            : part
    ).join('');
}

// ── Toolbar Plugin (unchanged) ────────────────────────────

function ToolbarPlugin({ onStateChange }: { onStateChange: (s: ToolbarState) => void }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const sel = $getSelection();
                if (!$isRangeSelection(sel)) return;
                const anchor = sel.anchor.getNode();
                const topEl = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElementOrThrow();
                onStateChange({
                    isBold: sel.hasFormat('bold'),
                    isItalic: sel.hasFormat('italic'),
                    isUnderline: sel.hasFormat('underline'),
                    isStrikethrough: sel.hasFormat('strikethrough'),
                    isCode: sel.hasFormat('code'),
                    blockType: (topEl as unknown as { getTag?: () => string }).getTag?.() ?? topEl.getType(),
                });
            });
        });
    }, [editor, onStateChange]);
    return null;
}

// ── Editor Core (handles content and focus) ────────────────

interface EditorCoreProps {
    note: Note;
    onSave: (html: string, wc: number) => void;
    saveTimerRef: React.MutableRefObject<number | null>;
    setSaveStatus: (s: 'saved' | 'unsaved' | 'saving') => void;
    toolbar: ToolbarState;
    setToolbar: (s: ToolbarState) => void;
}

function EditorCore({ note, onSave, saveTimerRef, setSaveStatus, toolbar, setToolbar }: EditorCoreProps) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        editor.update(() => {
            const root = $getRoot();
            root.clear();
            if (note.body) {
                try {
                    const parser = new DOMParser();
                    const dom = parser.parseFromString(note.body, 'text/html');
                    const nodes = $generateNodesFromDOM(editor, dom);
                    if (nodes.length > 0) root.append(...nodes);
                    else root.append($createParagraphNode());
                } catch {
                    root.append($createParagraphNode());
                }
            } else {
                root.append($createParagraphNode());
            }
        });
        editor.focus();
    }, [editor, note.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = useCallback((editorState: EditorState) => {
        setSaveStatus('unsaved');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            setSaveStatus('saving');
            editorState.read(() => {
                const html = $generateHtmlFromNodes(editor, null);
                onSave(html, countWords(html));
                requestAnimationFrame(() => setSaveStatus('saved'));
            });
        }, AUTO_SAVE_DELAY);
    }, [onSave, setSaveStatus, saveTimerRef, editor]);

    return (
        <>
            <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                <EditorButton icon={<Undo2 size={14} />} title="Undo" cmd={UNDO_COMMAND} />
                <EditorButton icon={<Redo2 size={14} />} title="Redo" cmd={REDO_COMMAND} />
                <span className="w-px h-4 bg-border mx-0.5" />
                <FormatButton icon={<Bold size={14} />} title="Bold" format="bold" active={toolbar.isBold} />
                <FormatButton icon={<Italic size={14} />} title="Italic" format="italic" active={toolbar.isItalic} />
                <FormatButton icon={<Underline size={14} />} title="Underline" format="underline" active={toolbar.isUnderline} />
                <FormatButton icon={<Strikethrough size={14} />} title="Strikethrough" format="strikethrough" active={toolbar.isStrikethrough} />
                <FormatButton icon={<Code size={14} />} title="Code" format="code" active={toolbar.isCode} />
                <span className="w-px h-4 bg-border mx-0.5" />
                <BlockButton icon={<Heading1 size={14} />} title="H1" blockType="h1" current={toolbar.blockType} />
                <BlockButton icon={<Heading2 size={14} />} title="H2" blockType="h2" current={toolbar.blockType} />
                <BlockButton icon={<Heading3 size={14} />} title="H3" blockType="h3" current={toolbar.blockType} />
                <span className="w-px h-4 bg-border mx-0.5" />
                <ListButton icon={<List size={14} />} title="Bullet List" ordered={false} />
                <ListButton icon={<ListOrdered size={14} />} title="Numbered List" ordered={true} />
                <QuoteButton icon={<Quote size={14} />} title="Quote" active={toolbar.blockType === 'quote'} />
                <CodeBlockButton icon={<Code size={14} />} title="Code Block" active={toolbar.blockType === 'code'} />
                <span className="w-px h-4 bg-border mx-0.5" />
                <LinkButton icon={<LinkIcon size={14} />} title="Link" />
            </div>
            <div className="relative flex-1">
                <RichTextPlugin
                    contentEditable={<ContentEditable className="outline-none min-h-[200px] px-5 py-4 text-foreground leading-relaxed cursor-text" />}
                    placeholder={<div className="absolute top-4 left-5 text-muted-foreground/50 pointer-events-none select-none text-sm font-mono">Start writing…</div>}
                    ErrorBoundary={LexicalErrorBoundary}
                />
            </div>
            <HistoryPlugin />
            <ListPlugin />
            <CheckListPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
            <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
            <ToolbarPlugin onStateChange={setToolbar} />
        </>
    );
}

// ── Lexical Wrapper ─────────────────────────────────────────

function LexicalNoteEditor({ note, onSave, saveTimerRef, setSaveStatus }: {
    note: Note; onSave: (html: string, wc: number) => void;
    saveTimerRef: React.MutableRefObject<number | null>; setSaveStatus: (s: 'saved' | 'unsaved' | 'saving') => void;
}) {
    const [toolbar, setToolbar] = useState<ToolbarState>({
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrikethrough: false,
        isCode: false,
        blockType: 'paragraph',
    });
    const initialConfig = useMemo(() => ({
        namespace: 'FlowspaceNotes',
        nodes: EDITOR_NODES,
        theme: EDITOR_THEME,
        onError: (err: Error) => console.error('[Lexical]', err),
    }), []);

    return (
        <LexicalComposer key={note.id} initialConfig={initialConfig}>
            <EditorCore note={note} onSave={onSave} saveTimerRef={saveTimerRef} setSaveStatus={setSaveStatus} toolbar={toolbar} setToolbar={setToolbar} />
        </LexicalComposer>
    );
}

// ── Toolbar Buttons (no require!) ──────────────────────────

function FormatButton({ icon, title, format, active }: { icon: React.ReactNode; title: string; format: TextFormatType; active: boolean }) {
    const [editor] = useLexicalComposerContext();
    return <button title={title} onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)} className={cn('p-1.5 rounded-md transition-all', active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-hover hover:text-foreground')}>{icon}</button>;
}
function EditorButton({ icon, title, cmd }: { icon: React.ReactNode; title: string; cmd: LexicalCommand<void> }) {
    const [editor] = useLexicalComposerContext();
    return <button title={title} onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(cmd, undefined)} className="p-1.5 rounded-md text-muted-foreground hover:bg-hover hover:text-foreground transition-all">{icon}</button>;
}
function BlockButton({ icon, title, blockType, current }: { icon: React.ReactNode; title: string; blockType: string; current: string }) {
    const [editor] = useLexicalComposerContext();
    const active = current === blockType;
    const handleClick = () => {
        editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
                if (active) {
                    $setBlocksType(sel, () => $createParagraphNode());
                } else {
                    $setBlocksType(sel, () => $createHeadingNode(blockType as 'h1' | 'h2' | 'h3'));
                }
            }
        });
    };
    return (
        <button title={title} onMouseDown={e => e.preventDefault()} onClick={handleClick} className={cn('p-1.5 rounded-md transition-all', active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-hover hover:text-foreground')}>
            {icon}
        </button>
    );
}
function QuoteButton({ icon, title, active }: { icon: React.ReactNode; title: string; active: boolean }) {
    const [editor] = useLexicalComposerContext();
    const handleClick = () => {
        editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
                $setBlocksType(sel, () => (active ? $createParagraphNode() : $createQuoteNode()));
            }
        });
    };
    return (
        <button title={title} onMouseDown={e => e.preventDefault()} onClick={handleClick} className={cn('p-1.5 rounded-md transition-all', active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-hover hover:text-foreground')}>
            {icon}
        </button>
    );
}
function CodeBlockButton({ icon, title, active }: { icon: React.ReactNode; title: string; active: boolean }) {
    const [editor] = useLexicalComposerContext();
    const handleClick = () => {
        editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
                $setBlocksType(sel, () => (active ? $createParagraphNode() : $createCodeNode()));
            }
        });
    };
    return (
        <button title={title} onMouseDown={e => e.preventDefault()} onClick={handleClick} className={cn('p-1.5 rounded-md transition-all', active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-hover hover:text-foreground')}>
            {icon}
        </button>
    );
}
function ListButton({ icon, title, ordered }: { icon: React.ReactNode; title: string; ordered: boolean }) {
    const [editor] = useLexicalComposerContext();
    return <button title={title} onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(ordered ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND, undefined)} className="p-1.5 rounded-md text-muted-foreground hover:bg-hover hover:text-foreground transition-all">{icon}</button>;
}
function LinkButton({ icon, title }: { icon: React.ReactNode; title: string }) {
    const [editor] = useLexicalComposerContext();
    return <button title={title} onMouseDown={e => e.preventDefault()} onClick={() => { const url = prompt('Enter URL:'); if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.startsWith('http') ? url : `https://${url}`); }} className="p-1.5 rounded-md text-muted-foreground hover:bg-hover hover:text-foreground transition-all">{icon}</button>;
}

// ── Note Card (fixed size, color left border, search highlight, hover border glow) ��─

const NoteCard = memo(function NoteCard({
    note, isActive, isNew, isDeleting, isBouncing, searchQuery, onOpen, onPin, onStar, onTrash, onRestore, onPermDelete,
}: {
    note: Note; isActive: boolean; isNew: boolean; isDeleting: boolean; isBouncing: boolean; searchQuery: string;
    onOpen: (n: Note) => void; onPin: (id: string) => void; onStar: (id: string) => void;
    onTrash: (id: string) => void; onRestore: (id: string) => void; onPermDelete: (id: string) => void;
}) {
    const previewText = stripHtml(note.body ?? '').slice(0, 120);
    const isTrash = note.deleted;
    const color = note.color || '#6366f1';

    const highlightPreview = searchQuery ? highlightText(previewText, searchQuery) : previewText;

    return (
        <div
            onClick={() => onOpen(note)}
            className={cn(
                'group relative flex flex-col gap-2 p-4 cursor-pointer rounded-2xl border transition-all duration-300 w-full h-[170px] overflow-hidden',
                isNew && 'ring-2 ring-primary/30 shadow-[0_0_20px_rgba(0,212,255,0.2)]',
                isDeleting && 'animate-shrink-out',
                isTrash
                    ? 'opacity-50 bg-card/50 border-border/30'
                    : isActive
                        ? 'bg-primary/5 border-primary/40 shadow-[0_0_15px_rgba(0,212,255,0.08)]'
                        : 'bg-card border-border/50 hover:border-primary/50 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
            )}
            style={{ borderLeftWidth: '4px', borderLeftColor: color }}
        >
            {/* Hover action buttons */}
            <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-card/90 backdrop-blur-sm rounded-lg p-1 border border-border/50 z-10" onClick={e => e.stopPropagation()}>
                {isTrash ? (
                    <>
                        <button onClick={() => onRestore(note.id)} className="p-1 rounded hover:bg-green-500/10 text-green-400 transition-colors" title="Restore"><RotateCcw size={11} /></button>
                        <button onClick={() => onPermDelete(note.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors" title="Delete forever"><Trash2 size={11} /></button>
                    </>
                ) : (
                    <>
                        <button onClick={() => onPin(note.id)} className={cn('p-1 rounded hover:bg-amber-500/10 transition-colors', note.pinned ? 'text-amber-400' : 'text-muted-foreground')} title="Pin"><Pin size={11} /></button>
                        <button onClick={() => onStar(note.id)} className={cn('p-1 rounded hover:bg-amber-500/10 transition-colors', note.starred ? 'text-amber-400' : 'text-muted-foreground')} title="Star"><Star size={11} /></button>
                        <button onClick={() => onTrash(note.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Trash"><Trash2 size={11} /></button>
                    </>
                )}
            </div>

            {/* Pin/Star indicators */}
            <div className="flex items-center gap-1">
                {note.pinned && !isTrash && <Pin size={10} className={cn('text-amber-400 fill-amber-400', isBouncing && 'animate-icon-bounce')} />}
                {note.starred && !isTrash && <Star size={10} className={cn('text-amber-400 fill-amber-400', isBouncing && 'animate-icon-bounce')} />}
            </div>

            {/* Title */}
            <h3 className={cn('font-semibold text-sm leading-snug', isTrash ? 'line-through text-muted-foreground' : 'text-foreground')}>
                {searchQuery && fuzzyMatch(searchQuery, note.title)
                    ? <span dangerouslySetInnerHTML={{ __html: highlightText(note.title || 'Untitled', searchQuery) }} />
                    : (note.title || 'Untitled')
                }
            </h3>

            {/* Preview with highlighted search */}
            {previewText && (
                <p
                    className="text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1"
                    dangerouslySetInnerHTML={{ __html: highlightPreview }}
                />
            )}

            {/* Tags */}
            {(note.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto">
                    {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono">#{tag}</span>
                    ))}
                    {note.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{note.tags.length - 3}</span>}
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={9} />{timeAgo(note.updatedAt)}</span>
                {(note.wordCount ?? 0) > 0 && <span>{note.wordCount} w · {readTime(note.wordCount)}</span>}
            </div>
        </div>
    );
});

// ── Empty State ────────────────────────────────────────────

function EmptyState({ filter, query, onCreate }: { filter: string; query: string; onCreate: () => void }) {
    if (query) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-4xl opacity-30">🔍</span>
            <p className="text-sm text-muted-foreground font-mono">No results for "{query}"</p>
        </div>
    );
    if (filter === 'trash') return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-4xl opacity-30">🗑️</span>
            <p className="text-sm text-muted-foreground font-mono">Trash is empty</p>
        </div>
    );
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center"><NoteIcon className="w-6 h-6 text-primary/40" /></div>
            <p className="text-sm text-muted-foreground font-mono">No notes yet</p>
            <button onClick={onCreate} className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-mono font-bold hover:shadow-glow-cyan transition-all">Create Note</button>
        </div>
    );
}

// ── Main Notes Page ────────────────────────────────────────

export default function NotesPage() {
    const { notes, addNote, updateNote, trashNote, restoreNote, permanentDeleteNote, themeMode, log } = useAppStore();
    const [panelOpen, setPanelOpen] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'trash'>('all');
    const [rawSearch, setRawSearch] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
    const [tagInput, setTagInput] = useState('');
    const [newNoteId, setNewNoteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [bouncingId, setBouncingId] = useState<string | null>(null);
    const [noteColor, setNoteColor] = useState('#6366f1');
    const wasModifiedRef = useRef(false);
    const lastActiveNoteRef = useRef<Note | null>(null);
    const isNewNoteCreationRef = useRef(false);
    const saveTimerRef = useRef<number | null>(null);
    const titleRef = useRef<HTMLDivElement>(null);

    const darkMode = themeMode === 'dark';

    useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
    useEffect(() => { const t = setTimeout(() => setSearchQuery(rawSearch), SEARCH_DEBOUNCE); return () => clearTimeout(t); }, [rawSearch]);

    const activeNote = notes.find(n => n.id === activeNoteId) ?? null;

    useEffect(() => {
        // Log "content updated" if the previous note was modified before switching
        if (lastActiveNoteRef.current && lastActiveNoteRef.current.id !== activeNoteId) {
            const n = lastActiveNoteRef.current;

            // If it was a new note that was never named, log its creation now
            if (isNewNoteCreationRef.current) {
                log('note', `Note created: "${n.title || 'Untitled'}"`, 'Notes');
                isNewNoteCreationRef.current = false;
            }

            if (wasModifiedRef.current) {
                log('note', `Note "${n.title || 'Untitled'}" content updated`, 'Notes');
                wasModifiedRef.current = false;
            }
        }

        // Update the ref to the current note
        lastActiveNoteRef.current = activeNote;
    }, [activeNoteId, activeNote, log]);

    useEffect(() => {
        return () => {
            // Log when component unmounts if modified or new
            if (lastActiveNoteRef.current) {
                const n = lastActiveNoteRef.current;
                if (isNewNoteCreationRef.current) {
                    log('note', `Note created: "${n.title || 'Untitled'}"`, 'Notes');
                }
                if (wasModifiedRef.current) {
                    log('note', `Note "${n.title || 'Untitled'}" content updated`, 'Notes');
                }
            }
        };
    }, [log]);

    const allTags = useMemo(() => {
        const s = new Set<string>();
        notes.filter(n => !n.deleted).forEach(n => (n.tags ?? []).forEach(t => s.add(t)));
        return Array.from(s).sort();
    }, [notes]);

    const filteredNotes = useMemo(() => {
        let list = [...notes];
        if (activeFilter === 'trash') list = list.filter(n => n.deleted);
        else if (activeFilter === 'starred') list = list.filter(n => !n.deleted && n.starred);
        else list = list.filter(n => !n.deleted);

        if (searchQuery.trim()) {
            const q = searchQuery.startsWith('#') ? searchQuery.slice(1) : searchQuery;
            list = list
                .filter(n => fuzzyMatch(searchQuery, n.title) || fuzzyMatch(searchQuery, stripHtml(n.body)) || (n.tags ?? []).some(t => fuzzyMatch(q, t)))
                // Sort: title matches first, then body matches, then tag matches
                .sort((a, b) => {
                    const aTitle = fuzzyMatch(searchQuery, a.title) ? 0 : fuzzyMatch(searchQuery, stripHtml(a.body)) ? 1 : 2;
                    const bTitle = fuzzyMatch(searchQuery, b.title) ? 0 : fuzzyMatch(searchQuery, stripHtml(b.body)) ? 1 : 2;
                    return aTitle - bTitle;
                });
        }

        // Then sort by pinned + date
        return list.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [notes, activeFilter, searchQuery]);

    const counts = useMemo(() => ({
        all: notes.filter(n => !n.deleted).length,
        starred: notes.filter(n => !n.deleted && n.starred).length,
        trash: notes.filter(n => n.deleted).length,
    }), [notes]);

    const openNote = useCallback((note: Note) => {
        setActiveNoteId(note.id);
        setPanelOpen(true);
        setSaveStatus('saved');
        setTagInput('');
        setNoteColor(note.color || '#6366f1');
        requestAnimationFrame(() => {
            if (titleRef.current) titleRef.current.innerText = note.title === 'Untitled' ? '' : note.title;
            titleRef.current?.focus();
        });
    }, []);
    const closePanel = useCallback(() => { setPanelOpen(false); setFocusMode(false); }, []);

    const createNote = useCallback(() => {
        const id = genId();
        const now = new Date().toISOString();
        const newNote: Note = { id, title: 'Untitled', body: '', tags: [], pinned: false, starred: false, deleted: false, color: '#6366f1', wordCount: 0, createdAt: now, updatedAt: now };
        addNote(newNote);
        isNewNoteCreationRef.current = true;
        setNewNoteId(id);
        setTimeout(() => setNewNoteId(null), 1000);
        openNote(newNote);
    }, [addNote, openNote]);

    const saveTitle = useCallback(() => {
        if (!activeNoteId || !titleRef.current) return;
        const newTitle = titleRef.current.innerText.trim() || 'Untitled';
        const currentNote = notes.find(n => n.id === activeNoteId);
        if (currentNote && currentNote.title !== newTitle) {
            updateNote(activeNoteId, { title: newTitle });
            if (isNewNoteCreationRef.current) {
                log('note', `Note created: "${newTitle}"`, 'Notes');
                isNewNoteCreationRef.current = false;
            } else {
                log('note', `Note renamed to "${newTitle}"`, 'Notes');
            }
        }
    }, [activeNoteId, updateNote, notes, log]);
    const handleEditorSave = useCallback((html: string, wc: number) => {
        if (!activeNoteId) return;
        updateNote(activeNoteId, { body: html, wordCount: wc });
        wasModifiedRef.current = true;
    }, [activeNoteId, updateNote]);

    const handleTrash = useCallback((id: string) => {
        setDeletingId(id);
        setTimeout(() => { trashNote(id); if (activeNoteId === id) closePanel(); setDeletingId(null); }, 280);
    }, [trashNote, activeNoteId, closePanel]);
    const handleRestore = useCallback((id: string) => { restoreNote(id); if (activeNoteId === id) closePanel(); }, [restoreNote, activeNoteId, closePanel]);
    const handlePermDelete = useCallback((id: string) => { permanentDeleteNote(id); if (activeNoteId === id) closePanel(); }, [permanentDeleteNote, activeNoteId, closePanel]);

    const handlePin = useCallback((id: string) => { const n = notes.find(x => x.id === id); if (n) updateNote(id, { pinned: !n.pinned }); setBouncingId(id); setTimeout(() => setBouncingId(null), 400); }, [notes, updateNote]);
    const handleStar = useCallback((id: string) => { const n = notes.find(x => x.id === id); if (n) updateNote(id, { starred: !n.starred }); setBouncingId(id); setTimeout(() => setBouncingId(null), 400); }, [notes, updateNote]);

    const handleTagKey = useCallback((e: React.KeyboardEvent) => { if (!activeNoteId) return; const note = notes.find(n => n.id === activeNoteId); const tags = note?.tags ?? []; if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-'); if (!tag || tags.includes(tag)) { setTagInput(''); return; } updateNote(activeNoteId, { tags: [...tags, tag] }); setTagInput(''); } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) { updateNote(activeNoteId, { tags: tags.slice(0, -1) }); } }, [activeNoteId, tagInput, notes, updateNote]);
    const removeTag = useCallback((tag: string) => { if (!activeNote) return; updateNote(activeNote.id, { tags: (activeNote.tags || []).filter(t => t !== tag) }); }, [activeNote, updateNote]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); createNote(); } if (e.key === 'Escape' && panelOpen) closePanel(); };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [createNote, panelOpen, closePanel]);
    useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><NoteIcon className="w-4 h-4 text-primary" /></span>Notes
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-10">Press <kbd className="px-1.5 py-0.5 bg-section border border-border rounded text-[9px] font-mono">Ctrl+N</kbd> to create</p>
                </div>
                <button onClick={createNote} className="bg-primary text-primary-foreground px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:shadow-glow-cyan transition-all font-mono">
                    <Plus className="w-3.5 h-3.5" /> New Note
                </button>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={rawSearch} onChange={e => setRawSearch(e.target.value)} placeholder="Search notes..." className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono focus:border-primary outline-none transition-all" />
                    {rawSearch && <button onClick={() => setRawSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
                </div>
                <div className="flex gap-1 bg-section rounded-lg p-0.5">
                    {(['all', 'starred', 'trash'] as const).map(k => (
                        <button key={k} onClick={() => setActiveFilter(k)} className={cn('px-3 py-1.5 text-[10px] font-mono rounded-md transition-all', activeFilter === k ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                            {k === 'all' ? 'All' : k === 'starred' ? '⭐ Starred' : '🗑️ Trash'} <span className="ml-1 opacity-60">{counts[k]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tag Cloud */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                        <button key={tag} onClick={() => setRawSearch('#' + tag)} className={cn('px-2.5 py-0.5 text-[10px] rounded-full font-mono border transition-all', searchQuery === '#' + tag ? 'bg-primary/15 text-primary border-primary/30' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-primary')}>#{tag}</button>
                    ))}
                </div>
            )}

            {/* Notes Grid */}
            <div className={cn('transition-all duration-300', panelOpen && !focusMode && 'lg:mr-[42%]')}>
                {filteredNotes.length === 0 ? <EmptyState filter={activeFilter} query={rawSearch} onCreate={createNote} /> : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                        {filteredNotes.map((note, idx) => (
                            <div key={note.id} className={cn('animate-card-enter', note.id === newNoteId && 'animate-slide-down')} style={{ animationDelay: `${idx * 50}ms` }}>
                                <NoteCard
                                    note={note}
                                    isActive={activeNoteId === note.id}
                                    isNew={note.id === newNoteId}
                                    isDeleting={note.id === deletingId}
                                    isBouncing={note.id === bouncingId}
                                    searchQuery={searchQuery}
                                    onOpen={openNote}
                                    onPin={handlePin}
                                    onStar={handleStar}
                                    onTrash={handleTrash}
                                    onRestore={handleRestore}
                                    onPermDelete={handlePermDelete}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Editor Panel */}
            <div
                className={cn(
                    'fixed top-0 right-0 h-full bg-card border-l border-border shadow-2xl transform z-40 flex flex-col',
                    panelOpen ? 'translate-x-0' : 'translate-x-full',
                )}
                style={{
                    width: focusMode ? '100%' : '42%',
                    maxWidth: focusMode ? '900px' : undefined,
                    margin: focusMode ? '0 auto' : undefined,
                    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.5s ease',
                }}
            >
                {activeNote ? (
                    <>
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0 bg-card">
                            <div className="flex items-center gap-0.5">
                                {activeNote.deleted ? (
                                    <>
                                        <button onClick={() => handleRestore(activeNote.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"><RotateCcw size={12} /> Restore</button>
                                        <button onClick={() => handlePermDelete(activeNote.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors ml-1"><Trash2 size={12} /> Delete</button>
                                    </>
                                ) : (
                                    <>
                                        <ActionBtn onClick={() => handlePin(activeNote.id)} active={activeNote.pinned} activeColor="text-amber-400"><Pin size={14} /></ActionBtn>
                                        <ActionBtn onClick={() => handleStar(activeNote.id)} active={activeNote.starred} activeColor="text-amber-400"><Star size={14} /></ActionBtn>
                                        <ActionBtn onClick={() => handleTrash(activeNote.id)} danger><Trash2 size={14} /></ActionBtn>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {saveStatus === 'saving' ? (
                                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Saving…</span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-0.5 rounded-full bg-green-500/10">
                                        <span className="w-12 h-1.5 rounded-full overflow-hidden bg-green-500/20">
                                            <span className="block h-full w-full animate-shimmer-bar rounded-full" />
                                        </span>
                                        <span className="text-green-400">Saved</span>
                                    </span>
                                )}
                                <ActionBtn onClick={() => setFocusMode(p => !p)}>{focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</ActionBtn>
                                <ActionBtn onClick={closePanel}><X size={14} /></ActionBtn>
                            </div>
                        </div>

                        {/* Trash banner */}
                        {activeNote.deleted && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[10px] font-mono shrink-0">
                                <AlertTriangle size={12} /> This note is in Trash. Restore to edit.
                            </div>
                        )}

                        {/* Title */}
                        <div className="px-5 pt-4 pb-2 shrink-0">
                            <div ref={titleRef} contentEditable={!activeNote.deleted} suppressContentEditableWarning
                                className={cn('text-xl font-bold outline-none text-foreground leading-tight empty:before:content-["Untitled"] empty:before:text-muted-foreground/40', activeNote.deleted && 'opacity-60')}
                                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} onBlur={saveTitle}
                                onPaste={e => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData('text/plain');
                                    document.execCommand('insertText', false, text);
                                }}
                            />
                        </div>

                        {/* Lexical Editor */}
                        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                            {!activeNote.deleted
                                ? <LexicalNoteEditor note={activeNote} onSave={handleEditorSave} saveTimerRef={saveTimerRef} setSaveStatus={setSaveStatus} />
                                : <div className="px-5 py-4 text-muted-foreground text-sm leading-relaxed opacity-70" dangerouslySetInnerHTML={{ __html: activeNote.body }} />
                            }
                        </div>

                        {/* Footer with tags and color picker */}
                        <div className="px-4 py-2.5 border-t border-border shrink-0 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {(activeNote.tags || []).map(tag => (
                                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono animate-tag-pop">
                                        #{tag}
                                        {!activeNote.deleted && <button onClick={() => removeTag(tag)} className="hover:text-red-400 ml-0.5"><X size={9} /></button>}
                                    </span>
                                ))}
                                {!activeNote.deleted && (
                                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey}
                                        placeholder="+ tag" className="bg-transparent outline-none text-[10px] font-mono text-muted-foreground placeholder:text-muted-foreground/50 w-20"
                                    />
                                )}
                                {/* Color picker */}
                                {!activeNote.deleted && (
                                    <div className="flex items-center gap-1 ml-2">
                                        <span className="text-[10px] font-mono text-muted-foreground">Color:</span>
                                        {NOTE_COLORS.map(c => (
                                            <button key={c} onClick={() => { setNoteColor(c); updateNote(activeNote.id, { color: c }); }}
                                                className={cn('w-4 h-4 rounded-full transition-transform', noteColor === c && 'ring-2 ring-white scale-125')}
                                                style={{ background: c }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(activeNote.updatedAt)}</span>
                                <span>{activeNote.wordCount ?? 0} w · {readTime(activeNote.wordCount ?? 0)}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-center p-8">
                        <div><div className="text-4xl mb-3 opacity-30">📝</div><p className="text-sm font-mono">Select a note or create one</p></div>
                    </div>
                )}
            </div>

            {/* Overlay */}
            {panelOpen && !focusMode && (
                <div className="hidden lg:block fixed inset-0 bg-black/50 z-30 backdrop-blur-xl transition-opacity duration-500" onClick={closePanel} />
            )}
        </div>
    );
}

// ── Utility Action Button ──────────────────────────────────

function ActionBtn({ children, onClick, active, activeColor, danger }: { children: React.ReactNode; onClick: () => void; active?: boolean; activeColor?: string; danger?: boolean }) {
    return <button onClick={onClick} className={cn('p-1.5 rounded-lg transition-all', active ? cn('bg-primary/10', activeColor ?? 'text-primary') : danger ? 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-hover')}>{children}</button>;
}