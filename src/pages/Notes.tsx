import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useAppStore, type Note } from '../store/useAppStore';
import { cn } from '../lib/utils';
import ToastContainer, { type ToastItem } from '../components/Toast';
import {
    Plus, Search, Star, Trash2, Pin, X, Maximize2, Minimize2,
    Copy, Bold, Italic, Underline, Strikethrough,
    Code, Quote, List, ListOrdered,
    Heading1, Heading2, Heading3, Minus, Link as LinkIcon, Image,
    Undo2, Redo2, Sun, Moon, Download, FileText, Clock,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function fuzzyMatch(q: string, text: string) {
    if (!q) return true;
    const ql = q.toLowerCase();
    const tl = text.toLowerCase();
    let qi = 0;
    for (let i = 0; i < tl.length && qi < ql.length; i++)
        if (tl[i] === ql[qi]) qi++;
    return qi === ql.length;
}

function stripHtml(html: string) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(html: string) {
    const t = stripHtml(html);
    return t ? t.split(/\s+/).length : 0;
}

function genId(): string {
    return Math.random().toString(36).slice(2, 11);
}

function timeAgo(d: string) {
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

function readTime(words: number) {
    const min = Math.ceil(words / 200);
    return min <= 0 ? 'less than 1 min' : `${min} min read`;
}

function downloadFile(filename: string, content: string, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────────────────────────────────────
// NOTE CARD
// ──────────────────────────────────────────────────────────────────────────────
const NoteCard = memo(function NoteCard({
    note, isActive, onOpen, onPin, onStar, onTrash, onDuplicate,
}: {
    note: Note; isActive: boolean;
    onOpen: (note: Note) => void;
    onPin: (id: string) => void;
    onStar: (id: string) => void;
    onTrash: (id: string) => void;
    onDuplicate: (note: Note) => void;
}) {
    const preview = stripHtml(note.body ?? '').slice(0, 100);
    return (
        <article
            onClick={() => onOpen(note)}
            className={cn(
                'relative flex flex-col gap-2 p-4 cursor-pointer rounded-xl border transition-all duration-200 shadow-sm',
                'hover:-translate-y-1 hover:shadow-md hover:border-indigo-400',
                'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100',
                isActive && 'border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/50 bg-indigo-50 dark:bg-zinc-700'
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpen(note)}
        >
            {note.pinned && !note.deleted && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500" />
            )}
            {(note.starred ?? false) && !note.deleted && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-yellow-400" />
            )}
            <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold text-sm leading-tight break-words flex-1 min-w-0">
                    {note.title || 'Untitled'}
                </h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onPin(note.id)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400" title="Pin">
                        <Pin size={14} className={note.pinned ? 'text-amber-500' : ''} />
                    </button>
                    <button onClick={() => onStar(note.id)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400" title="Star">
                        <Star size={14} className={note.starred ? 'text-yellow-500' : ''} />
                    </button>
                    <button onClick={() => onDuplicate(note)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400" title="Duplicate">
                        <Copy size={14} />
                    </button>
                    <button onClick={() => onTrash(note.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-500 dark:text-zinc-400 hover:text-red-500" title="Trash">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
            {preview && <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 flex-1 leading-relaxed">{preview}</p>}
            <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500">
                <div className="flex gap-1 flex-wrap">
                    {(note.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium">
                            #{tag}
                        </span>
                    ))}
                </div>
                <time className="flex items-center gap-1 whitespace-nowrap"><Clock size={10} />{timeAgo(note.updatedAt)}</time>
            </div>
        </article>
    );
});

// ──────────────────────────────────────────────────────────────────────────────
// MAIN NOTES PAGE
// ──────────────────────────────────────────────────────────────────────────────
export default function NotesPage() {
    const { notes, addNote, updateNote, trashNote, restoreNote } = useAppStore();

    // Theme
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('notes-dark-mode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Layout
    const [focusMode, setFocusMode] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Filter
    const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'trash'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Editor
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
    const [tagInput, setTagInput] = useState('');
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

    // Toasts
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    // Refs
    const saveTimerRef = useRef<number | null>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

    // Apply dark mode
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('notes-dark-mode', String(darkMode));
    }, [darkMode]);

    // Derived
    const allTags = useMemo(() => {
        const set = new Set<string>();
        notes.filter((n) => !n.deleted).forEach((n) => (n.tags ?? []).forEach((t) => set.add(t)));
        return Array.from(set).sort();
    }, [notes]);

    const filteredNotes = useMemo(() => {
        let list = notes;
        if (activeFilter === 'trash') list = list.filter((n) => n.deleted ?? false);
        else if (activeFilter === 'starred') list = list.filter((n) => (n.starred ?? false) && !(n.deleted ?? false));
        else list = list.filter((n) => !(n.deleted ?? false));
        if (searchQuery.trim()) {
            const q = searchQuery;
            list = list.filter((n) => fuzzyMatch(q, n.title) || fuzzyMatch(q, stripHtml(n.body ?? '')) || (n.tags ?? []).some((t) => fuzzyMatch(q, t)));
        }
        return [...list].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [notes, activeFilter, searchQuery]);

    // Toast helpers
    const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
        const id = genId();
        setToasts((prev) => [...prev, { ...toast, id }]);
        return id;
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Check active formats on selection change
    const checkActiveFormats = useCallback(() => {
        if (!bodyRef.current) return;
        const sel = window.getSelection();
        if (!sel || !bodyRef.current.contains(sel.anchorNode)) return;

        const formats = new Set<string>();

        // Text formatting
        if (document.queryCommandState('bold')) formats.add('bold');
        if (document.queryCommandState('italic')) formats.add('italic');
        if (document.queryCommandState('underline')) formats.add('underline');
        if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');

        // Lists
        if (document.queryCommandState('insertUnorderedList')) formats.add('bullet');
        if (document.queryCommandState('insertOrderedList')) formats.add('number');

        // Block types - check parent elements
        const node = sel.anchorNode;
        if (node) {
            const parent = (node as Element).parentElement;
            if (parent) {
                const h1 = parent.closest('h1');
                const h2 = parent.closest('h2');
                const h3 = parent.closest('h3');
                const blockquote = parent.closest('blockquote');
                const pre = parent.closest('pre');

                if (h1) formats.add('h1');
                if (h2) formats.add('h2');
                if (h3) formats.add('h3');
                if (blockquote) formats.add('quote');
                if (pre) formats.add('codeBlock');
            }
        }

        setActiveFormats(formats);
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', checkActiveFormats);
        return () => document.removeEventListener('selectionchange', checkActiveFormats);
    }, [checkActiveFormats]);

    // Auto-save
    const forceSave = useCallback((noteId: string) => {
        if (!titleRef.current || !bodyRef.current) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        const title = titleRef.current.innerText.trim() || 'Untitled';
        const body = bodyRef.current.innerHTML;
        const wc = countWords(body);
        setSaveStatus('saving');
        updateNote(noteId, { title, body, wordCount: wc });
        requestAnimationFrame(() => setSaveStatus('saved'));
    }, [updateNote]);

    const triggerAutoSave = useCallback(() => {
        if (!activeNoteId) return;
        setSaveStatus('unsaved');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => forceSave(activeNoteId), 800);
    }, [activeNoteId, forceSave]);

    // MutationObserver to catch execCommand changes
    useEffect(() => {
        if (!bodyRef.current) return;
        const observer = new MutationObserver(() => {
            triggerAutoSave();
            checkActiveFormats();
        });
        observer.observe(bodyRef.current, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: false,
        });
        return () => observer.disconnect();
    }, [triggerAutoSave, checkActiveFormats, activeNoteId]);

    // Note actions
    const openNote = useCallback((note: Note) => {
        if (activeNoteId && activeNoteId !== note.id) forceSave(activeNoteId);
        setActiveNoteId(note.id);
        setPanelOpen(true);
        setSaveStatus('saved');
        requestAnimationFrame(() => {
            if (titleRef.current) titleRef.current.innerText = note.title === 'Untitled' ? '' : note.title;
            if (bodyRef.current) bodyRef.current.innerHTML = note.body || '<p><br></p>';
            titleRef.current?.focus();
        });
    }, [activeNoteId, forceSave]);

    const closePanel = useCallback(() => {
        if (activeNoteId) forceSave(activeNoteId);
        setPanelOpen(false);
    }, [activeNoteId, forceSave]);

    const toggleFocusMode = useCallback(() => setFocusMode((p) => !p), []);

    const createNote = useCallback(() => {
        addNote({ title: 'Untitled', body: '', tags: [], pinned: false, starred: false, deleted: false, wordCount: 0 });
        setTimeout(() => {
            const latest = useAppStore.getState().notes[0];
            if (latest) openNote(latest);
        }, 50);
    }, [addNote, openNote]);

    // Formatting
    const execFormat = useCallback((cmd: string, val?: string) => {
        bodyRef.current?.focus();

        if (cmd === 'formatBlock' && val === '<pre>') {
            document.execCommand(cmd, false, val);
            // Add empty paragraph after pre for exit point
            setTimeout(() => {
                const pre = bodyRef.current?.querySelector('pre:last-of-type');
                if (pre && (!pre.nextSibling || !pre.nextSibling.textContent?.trim())) {
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    pre.after(p);
                }
            }, 10);
        } else {
            document.execCommand(cmd, false, val);
        }

        triggerAutoSave();
        setTimeout(checkActiveFormats, 50);
    }, [triggerAutoSave, checkActiveFormats]);

    // Handle block exits
    const handleBodyKeyDown = useCallback((e: React.KeyboardEvent) => {
        const sel = window.getSelection();
        if (!sel?.rangeCount || !bodyRef.current) return;

        const range = sel.getRangeAt(0);
        const node = sel.anchorNode;
        if (!node) return;

        const blockEl = (node as Element).parentElement?.closest('h1, h2, h3, blockquote, pre, li') as HTMLElement | null;
        if (!blockEl) return;

        // Heading: Enter creates paragraph
        if (/^H[1-3]$/.test(blockEl.tagName) && e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertParagraph');
            return;
        }

        // Code block: Ctrl+Enter to exit
        if (blockEl.tagName === 'PRE' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            blockEl.after(p);
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            return;
        }

        const isEmpty = !blockEl.textContent?.trim() || blockEl.innerHTML === '<br>';

        // Lists & Quote: double Enter on empty to exit
        if (e.key === 'Enter' && isEmpty && (blockEl.tagName === 'LI' || blockEl.tagName === 'BLOCKQUOTE')) {
            e.preventDefault();
            document.execCommand('formatBlock', false, '<p>');
            return;
        }

        // Backspace at start to exit
        if (e.key === 'Backspace' && range.startOffset === 0 && range.collapsed) {
            if (blockEl.tagName === 'BLOCKQUOTE' || blockEl.tagName === 'PRE') {
                e.preventDefault();
                document.execCommand('formatBlock', false, '<p>');
                return;
            }
            if (blockEl.tagName === 'LI' && isEmpty) {
                e.preventDefault();
                document.execCommand('outdent');
                return;
            }
        }
    }, []);

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            bodyRef.current?.focus();
        }
    }, []);

    const handleTrash = useCallback((noteId: string) => {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;
        trashNote(noteId);
        if (activeNoteId === noteId) { closePanel(); setActiveNoteId(null); }
        const toastId = addToast({ message: `"${note.title}" moved to Trash`, type: 'danger', undoFn: () => { restoreNote(noteId); dismissToast(toastId); } });
    }, [notes, trashNote, restoreNote, activeNoteId, closePanel, addToast, dismissToast]);

    const handleDuplicate = useCallback((note: Note) => {
        addNote({ ...note, title: `${note.title} (copy)`, pinned: false });
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

    const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!activeNoteId) return;
        const note = notes.find((n) => n.id === activeNoteId);
        const currentTags = note?.tags ?? [];
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
            if (!tag || currentTags.includes(tag)) return;
            updateNote(activeNoteId, { tags: [...currentTags, tag] });
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && currentTags.length > 0) {
            updateNote(activeNoteId, { tags: currentTags.slice(0, -1) });
        }
    }, [activeNoteId, tagInput, notes, updateNote]);

    const handleExport = useCallback((format: 'html' | 'txt') => {
        if (!activeNote) return;
        const title = activeNote.title.replace(/[^a-zA-Z0-9]/g, '_');
        if (format === 'html') {
            downloadFile(`${title}.html`, `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${activeNote.title}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;}h1,h2,h3{margin-top:1.5em;}pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow-x:auto;}blockquote{border-left:3px solid #ddd;padding-left:16px;color:#666;}</style></head><body><h1>${activeNote.title}</h1>${activeNote.body}</body></html>`, 'text/html');
        } else {
            downloadFile(`${title}.txt`, stripHtml(activeNote.body));
        }
        setShowExportMenu(false);
        addToast({ message: `Exported as ${format.toUpperCase()}`, type: 'success' });
    }, [activeNote, addToast]);

    useEffect(() => {
        if (!showExportMenu) return;
        const handler = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showExportMenu]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.shiftKey && e.key === 'F') { e.preventDefault(); toggleFocusMode(); return; }
            if (ctrl && e.key === 'n') { e.preventDefault(); createNote(); return; }
            if (ctrl && e.key === 's') { e.preventDefault(); if (activeNoteId) forceSave(activeNoteId); return; }
            if (activeNoteId && panelOpen) {
                if (ctrl && e.key === 'b') { e.preventDefault(); execFormat('bold'); return; }
                if (ctrl && e.key === 'i') { e.preventDefault(); execFormat('italic'); return; }
                if (ctrl && e.key === 'u') { e.preventDefault(); execFormat('underline'); return; }
            }
            if (e.key === 'Escape') {
                if (panelOpen) { closePanel(); return; }
                if (focusMode) { setFocusMode(false); return; }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeNoteId, panelOpen, focusMode, createNote, closePanel, toggleFocusMode, forceSave, execFormat]);

    useEffect(() => {
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, []);

    // Toolbar button class helper
    const tbBtn = (format: string) => cn(
        'p-1.5 rounded-md transition-colors',
        activeFormats.has(format)
            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
    );

    // ──────────────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────────────
    return (
        <div className={cn(
            'flex flex-col h-screen max-h-screen overflow-hidden font-sans transition-colors duration-200',
            darkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
        )}>
            {/* ═══ TOP BAR ═══ */}
            <header className="flex items-center justify-between px-5 h-14 min-h-[56px] bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-30 gap-4">
                <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap select-none shrink-0">📒 Notes</h1>

                <div className="flex items-center gap-3 flex-1 justify-center min-w-0">
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-3 py-1.5 gap-2 max-w-sm w-full">
                        <Search size={16} className="text-zinc-400 shrink-0" />
                        <input type="text" placeholder="Search notes…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-400" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="shrink-0"><X size={14} className="text-zinc-400 hover:text-zinc-600" /></button>}
                    </div>
                    <div className="hidden sm:flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                        {(['all', 'starred', 'trash'] as const).map((key) => (
                            <button key={key} onClick={() => setActiveFilter(key)} className={cn('px-3 py-1.5 text-xs font-medium rounded-full transition-colors', activeFilter === key ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-700')}>{key === 'all' ? 'All' : key === 'starred' ? 'Starred' : 'Trash'}</button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {activeNote && panelOpen && (
                        <div className="relative">
                            <button onClick={() => setShowExportMenu((p) => !p)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700">
                                <Download size={14} /><span className="hidden sm:inline">Export</span>
                            </button>
                            {showExportMenu && (
                                <div ref={exportMenuRef} className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 z-50 min-w-[160px]">
                                    <button onClick={() => handleExport('html')} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"><FileText size={14} /> HTML</button>
                                    <button onClick={() => handleExport('txt')} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"><FileText size={14} /> Plain Text</button>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={() => setDarkMode((d) => !d)} className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" title={darkMode ? 'Light mode' : 'Dark mode'}>
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button onClick={createNote} className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm hover:bg-indigo-700" title="New note (Ctrl+N)">
                        <Plus size={20} />
                    </button>
                </div>
            </header>

            {/* ═══ TAG CLOUD ═══ */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 px-5 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    {allTags.map((tag) => (
                        <button key={tag} onClick={() => setSearchQuery('#' + tag)} className="px-3 py-1 text-xs rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50">#{tag}</button>
                    ))}
                </div>
            )}

            {/* ═══ MAIN GRID ═══ */}
            <div className={cn('flex-1 overflow-y-auto p-5 transition-all duration-300', panelOpen && 'mr-[45%]')}>
                {filteredNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400">
                        <div className="text-6xl mb-4">{activeFilter === 'trash' ? '🗑️' : searchQuery ? '🔍' : '📝'}</div>
                        <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">{activeFilter === 'trash' ? 'Trash is empty' : searchQuery ? 'No results' : 'No notes yet'}</h2>
                        {!searchQuery && activeFilter !== 'trash' && (
                            <button onClick={createNote} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700">Create Your First Note</button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 pb-10">
                        {filteredNotes.map((note) => (
                            <NoteCard key={note.id} note={note} isActive={activeNoteId === note.id} onOpen={openNote} onPin={handlePin} onStar={handleStar} onTrash={handleTrash} onDuplicate={handleDuplicate} />
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ SLIDE-IN EDITOR ═══ */}
            <div className={cn('fixed top-0 right-0 w-[45%] h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transform translate-x-full transition-transform duration-300 z-40 flex flex-col', panelOpen && 'translate-x-0')}>
                {activeNote ? (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
                            <div className="flex items-center gap-1">
                                <button onClick={() => handlePin(activeNote.id)} className={cn('p-2 rounded-lg', activeNote.pinned ? 'text-amber-500' : 'text-zinc-500')} title="Pin"><Pin size={18} /></button>
                                <button onClick={() => handleStar(activeNote.id)} className={cn('p-2 rounded-lg', activeNote.starred ? 'text-yellow-500' : 'text-zinc-500')} title="Star"><Star size={18} /></button>
                                <button onClick={() => handleDuplicate(activeNote)} className="p-2 rounded-lg text-zinc-500" title="Duplicate"><Copy size={18} /></button>
                                <button onClick={() => handleTrash(activeNote.id)} className="p-2 rounded-lg text-zinc-500 hover:text-red-500" title="Trash"><Trash2 size={18} /></button>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={toggleFocusMode} className="p-2 rounded-lg text-zinc-500" title="Focus mode">{focusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
                                <button onClick={closePanel} className="p-2 rounded-lg text-zinc-500" title="Close"><X size={18} /></button>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="flex flex-wrap gap-1 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
                            <button onClick={() => execFormat('undo')} className={tbBtn('undo')} title="Undo"><Undo2 size={15} /></button>
                            <button onClick={() => execFormat('redo')} className={tbBtn('redo')} title="Redo"><Redo2 size={15} /></button>
                            <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
                            <button onClick={() => execFormat('bold')} className={tbBtn('bold')} title="Bold"><Bold size={15} /></button>
                            <button onClick={() => execFormat('italic')} className={tbBtn('italic')} title="Italic"><Italic size={15} /></button>
                            <button onClick={() => execFormat('underline')} className={tbBtn('underline')} title="Underline"><Underline size={15} /></button>
                            <button onClick={() => execFormat('strikeThrough')} className={tbBtn('strikeThrough')} title="Strikethrough"><Strikethrough size={15} /></button>
                            <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
                            <button onClick={() => execFormat('formatBlock', '<h1>')} className={tbBtn('h1')} title="Heading 1"><Heading1 size={15} /></button>
                            <button onClick={() => execFormat('formatBlock', '<h2>')} className={tbBtn('h2')} title="Heading 2"><Heading2 size={15} /></button>
                            <button onClick={() => execFormat('formatBlock', '<h3>')} className={tbBtn('h3')} title="Heading 3"><Heading3 size={15} /></button>
                            <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
                            <button onClick={() => execFormat('insertUnorderedList')} className={tbBtn('bullet')} title="Bullet List"><List size={15} /></button>
                            <button onClick={() => execFormat('insertOrderedList')} className={tbBtn('number')} title="Numbered List"><ListOrdered size={15} /></button>
                            <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
                            <button onClick={() => execFormat('formatBlock', '<blockquote>')} className={tbBtn('quote')} title="Quote"><Quote size={15} /></button>
                            <button onClick={() => execFormat('formatBlock', '<pre>')} className={tbBtn('codeBlock')} title="Code Block"><Code size={15} /></button>
                            <button onClick={() => execFormat('insertHorizontalRule')} className={tbBtn('divider')} title="Divider"><Minus size={15} /></button>
                            <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
                            <button onClick={() => { const url = prompt('Enter URL:'); if (url) execFormat('createLink', url); }} className={tbBtn('link')} title="Insert Link"><LinkIcon size={15} /></button>
                            <button onClick={() => { const url = prompt('Enter image URL:'); if (url) execFormat('insertImage', url); }} className={tbBtn('image')} title="Insert Image"><Image size={15} /></button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5">
                            <div
                                ref={titleRef}
                                contentEditable
                                suppressContentEditableWarning
                                className="text-2xl font-bold outline-none mb-2 text-zinc-900 dark:text-zinc-100 empty:before:content-['Untitled'] empty:before:text-zinc-400"
                                onKeyDown={handleTitleKeyDown}
                                onInput={triggerAutoSave}
                                data-placeholder="Untitled"
                            />
                            <div
                                ref={bodyRef}
                                contentEditable
                                suppressContentEditableWarning
                                className="outline-none min-h-[300px] text-zinc-900 dark:text-zinc-100 prose prose-sm max-w-none"
                                onInput={triggerAutoSave}
                                onKeyDown={handleBodyKeyDown}
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 text-xs shrink-0 flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                {activeNote.tags.map((tag) => (
                                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-medium">
                                        #{tag}
                                        <button onClick={() => updateNote(activeNote.id, { tags: (activeNote.tags ?? []).filter((t) => t !== tag) })} className="hover:text-red-500"><X size={10} /></button>
                                    </span>
                                ))}
                                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Add tag…" className="border-none bg-transparent outline-none text-xs min-w-[60px]" />
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-500">
                                <span>{activeNote.wordCount} words</span>
                                <span>·</span>
                                <span>{readTime(activeNote.wordCount)}</span>
                                <span>·</span>
                                <span className={cn('w-2 h-2 rounded-full', saveStatus === 'saved' ? 'bg-green-500' : 'bg-amber-500 animate-pulse')} />
                                <span>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-400 text-center p-8">
                        <div><div className="text-4xl mb-3">✍️</div><p>Select a note or create a new one</p></div>
                    </div>
                )}
            </div>

            {/* ═══ MOBILE OVERLAY ═══ */}
            {panelOpen && <div className="hidden max-md:block fixed inset-0 bg-black/40 z-30" onClick={closePanel} />}

            {/* ═══ TOASTS ═══ */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}