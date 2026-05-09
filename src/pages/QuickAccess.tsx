import { useAppStore } from "../store/useAppStore";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  X,
  Zap,
  GripVertical,
  Trash2,
  AlertTriangle,
  Search,
  Pencil,
  Settings,
  Keyboard,
} from "lucide-react";
import { cn } from "../lib/utils";

// Renders link icon: emoji as text, favicon as image, empty as link emoji
const renderIcon = (icon: string) => {
  if (!icon) return <span className="text-lg">🔗</span>;
  if (icon.startsWith("favicon:")) {
    const domain = icon.replace("favicon:", "");
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        className="w-6 h-6 rounded object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return <span className="text-lg">{icon}</span>;
};
const COMMON_EMOJIS = [
  "🐙",
  "💻",
  "📦",
  "🚀",
  "🔧",
  "🎨",
  "🖼️",
  "💬",
  "📧",
  "🐦",
  "🎵",
  "📊",
  "📝",
  "🔗",
  "⚡",
  "🌟",
  "🎯",
  "📌",
  "🛠️",
  "🌐",
];

const fetchFavicon = (url: string) => {
  try {
    const domain = new URL(url.startsWith("http") ? url : "https://" + url)
      .hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
};
export default function QuickAccessPage() {
  const {
    quickCategories,
    quickLinks,
    addQuickCategory,
    deleteQuickCategory,
    addQuickLink,
    deleteQuickLink,
    updateQuickLink,
    reorderLinks,
    incrementClickCount,
  } = useAppStore();

  // Search
  const [search, setSearch] = useState("");

  // Add/Edit link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkCategoryId, setLinkCategoryId] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkIcon, setLinkIcon] = useState("");

  // Add category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "link";
    id: string;
    name: string;
  } | null>(null);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    linkId: string;
    linkName: string;
  } | null>(null);

  // Drag
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);

  // Keyboard bindings: map key 1-9 to link IDs
  const [keyBindings, setKeyBindings] = useState<Record<number, string>>({});

  // Load key bindings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("qa-keybindings");
    if (saved) {
      try {
        setKeyBindings(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Save key bindings
  const saveKeyBindings = (bindings: Record<number, string>) => {
    setKeyBindings(bindings);
    localStorage.setItem("qa-keybindings", JSON.stringify(bindings));
  };

  // Close context menu on click outside
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      // / to focus search
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        document.getElementById("qa-search")?.focus();
        return;
      }

      // 1-9 to open bound links
      if (
        e.key >= "1" &&
        e.key <= "9" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        const num = parseInt(e.key);
        const boundId = keyBindings[num];
        if (boundId) {
          const link = quickLinks.find((l) => l.id === boundId);
          if (link) {
            e.preventDefault();
            window.open(link.url, "_blank");
            incrementClickCount(link.id);
            return;
          }
        }
        // Fallback: open by visible order
        const allVisible = getVisibleLinks();
        if (allVisible[num - 1]) {
          e.preventDefault();
          window.open(allVisible[num - 1].url, "_blank");
          incrementClickCount(allVisible[num - 1].id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickLinks, search, keyBindings]);

  const getVisibleLinks = useCallback(() => {
    const q = search.toLowerCase();
    return quickLinks
      .filter((l) => {
        if (!q) return true;
        return (
          l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.order - b.order);
  }, [quickLinks, search]);

  // Most used links
  const mostUsedLinks = useMemo(() => {
    return [...quickLinks]
      .filter((l) => l.clickCount > 0)
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 6);
  }, [quickLinks]);

  // Filtered categories
  const filteredData = useMemo(() => {
    const q = search.toLowerCase();
    return [...quickCategories]
      .sort((a, b) => a.order - b.order)
      .map((cat) => ({
        ...cat,
        links: quickLinks
          .filter((l) => l.categoryId === cat.id)
          .filter(
            (l) =>
              !q ||
              l.name.toLowerCase().includes(q) ||
              l.url.toLowerCase().includes(q),
          )
          .sort((a, b) => a.order - b.order),
      }))
      .filter((cat) => !q || cat.links.length > 0);
  }, [quickCategories, quickLinks, search]);

  const openAddModal = (categoryId: string) => {
    setEditingLinkId(null);
    setLinkCategoryId(categoryId);
    setLinkName("");
    setLinkUrl("");
    setLinkIcon("");
    setShowLinkModal(true);
  };

  const openEditModal = (link: (typeof quickLinks)[0]) => {
    setEditingLinkId(link.id);
    setLinkCategoryId(link.categoryId);
    setLinkName(link.name);
    setLinkUrl(link.url);
    setLinkIcon(link.icon);
    setShowLinkModal(true);
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkName.trim() || !linkUrl.trim() || !linkCategoryId) return;
    if (editingLinkId) {
      updateQuickLink(editingLinkId, {
        name: linkName.trim(),
        url: linkUrl.trim().startsWith("http")
          ? linkUrl.trim()
          : "https://" + linkUrl.trim(),
        icon: linkIcon.trim() || "🔗",
        categoryId: linkCategoryId,
      });
    } else {
      const catLinks = quickLinks.filter(
        (l) => l.categoryId === linkCategoryId,
      );
      if (catLinks.length >= 10) return;
      addQuickLink(
        linkCategoryId,
        linkName.trim(),
        linkUrl.trim(),
        linkIcon.trim() || "🔗",
      );
    }
    setShowLinkModal(false);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    addQuickCategory(catName.trim(), catIcon.trim() || "📁");
    setCatName("");
    setCatIcon("");
    setShowCatModal(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "category") deleteQuickCategory(deleteTarget.id);
    else deleteQuickLink(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    link: (typeof quickLinks)[0],
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      linkId: link.id,
      linkName: link.name,
    });
  };

  const handleDragStart = (id: string) => {
    dragItem.current = id;
  };
  const handleDragEnter = (id: string) => {
    dragOverItem.current = id;
  };
  const handleDragEnd = (categoryId: string) => {
    if (
      !dragItem.current ||
      !dragOverItem.current ||
      dragItem.current === dragOverItem.current
    )
      return;
    const catLinks = quickLinks
      .filter((l) => l.categoryId === categoryId)
      .sort((a, b) => a.order - b.order);
    const fromIdx = catLinks.findIndex((l) => l.id === dragItem.current);
    const toIdx = catLinks.findIndex((l) => l.id === dragOverItem.current);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...catLinks];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    reorderLinks(
      categoryId,
      reordered.map((l) => l.id),
    );
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const visibleLinks = getVisibleLinks();
  const allLinksSorted = [...quickLinks].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </span>
            Quick Access
          </h2>
          <p className="text-xs text-muted-foreground mt-1 ml-10">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-section border border-border rounded text-[9px] font-mono">
              /
            </kbd>{" "}
            search ·{" "}
            <kbd className="px-1.5 py-0.5 bg-section border border-border rounded text-[9px] font-mono">
              1-9
            </kbd>{" "}
            open · Right-click to edit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="bg-card border border-border text-muted-foreground px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:border-primary/50 hover:text-primary transition-all"
          >
            <Settings className="w-3.5 h-3.5" /> Shortcuts
          </button>
          <button
            onClick={() => setShowCatModal(true)}
            className="bg-card border border-border text-muted-foreground px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:border-primary/50 hover:text-primary transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Category
          </button>
          <button
            onClick={() => {
              if (quickCategories.length > 0)
                openAddModal(quickCategories[0].id);
            }}
            className="bg-primary text-primary-foreground px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:shadow-glow-cyan transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Link
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          id="qa-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search links by name or URL..."
          className="w-full bg-card border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
            {/* Active Shortcuts Bar */}
      {Object.keys(keyBindings).length > 0 && !search && (
        <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border/50 rounded-xl overflow-x-auto">
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Shortcuts
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const boundId = keyBindings[num];
              const boundLink = boundId ? quickLinks.find((l) => l.id === boundId) : null;
              if (!boundLink) return null;
              return (
                <div
                  key={num}
                  className="flex items-center gap-1 bg-section/60 rounded-md px-2 py-1 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    window.open(boundLink.url, "_blank");
                    incrementClickCount(boundLink.id);
                  }}
                  title={`Press ${num} to open ${boundLink.name}`}
                >
                  <span className="text-[10px] font-mono font-bold text-primary">{num}</span>
                  <span className="text-sm">{renderIcon(boundLink.icon)}</span>
                  <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[80px] hidden sm:inline">
                    {boundLink.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {quickCategories.length === 0 && (
        <div className="widget flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              No categories yet
            </p>
            <button
              onClick={() => setShowCatModal(true)}
              className="text-xs text-primary font-mono hover:opacity-70"
            >
              Create your first category →
            </button>
          </div>
        </div>
      )}

      {/* Most Used Section */}
      {!search && mostUsedLinks.length > 0 && (
        <div className="widget !p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⭐</span>
            <span className="text-[11px] font-semibold text-foreground/80 tracking-wide">
              Most Used
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              · {mostUsedLinks.length} links
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {mostUsedLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => incrementClickCount(link.id)}
                onContextMenu={(e) => handleContextMenu(e, link)}
                className="block bg-card/50 border border-border/50 hover:border-primary/40 rounded-xl p-2.5 text-center transition-all duration-200 hover:bg-primary/[0.03] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,212,255,0.08)] cursor-pointer"
              >
                <span className="text-lg flex items-center justify-center mb-1">
                  {renderIcon(link.icon)}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground truncate block">
                  {link.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* No search results */}
      {search && filteredData.length === 0 && (
        <div className="widget flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground font-mono">
            No links match "<span className="text-foreground">{search}</span>"
          </p>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {filteredData.map((cat) => (
          <div key={cat.id} className="widget !p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-base">{cat.icon}</span>
              <span className="text-[11px] font-semibold text-foreground/80 tracking-wide">
                {cat.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                · {cat.links.length}/10
              </span>
              <div className="flex-1 border-t border-border/30 ml-2" />
              <button
                onClick={() => openAddModal(cat.id)}
                disabled={cat.links.length >= 10}
                className="text-[10px] text-primary font-mono hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              >
                + Add
              </button>
              <button
                onClick={() =>
                  setDeleteTarget({
                    type: "category",
                    id: cat.id,
                    name: cat.name,
                  })
                }
                className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
                title="Delete category"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {cat.links.length === 0 && !search ? (
              <div className="text-center py-6 text-[10px] text-muted-foreground font-mono border border-dashed border-border/50 rounded-lg">
                No links yet · Click "+ Add" above
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
                {" "}
                {cat.links.map((link, idx) => {
                  const globalIdx = allLinksSorted.findIndex(
                    (l) => l.id === link.id,
                  );
                  return (
                    <div
                      key={link.id}
                      draggable
                      onDragStart={() => handleDragStart(link.id)}
                      onDragEnter={() => handleDragEnter(link.id)}
                      onDragEnd={() => handleDragEnd(cat.id)}
                      onDragOver={(e) => e.preventDefault()}
                      className="relative group"
                    >
                      {!search && globalIdx < 9 && (
                        <span className="absolute top-1.5 left-2 text-[8px] font-mono text-muted-foreground/30 z-10">
                          {globalIdx + 1}
                        </span>
                      )}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => incrementClickCount(link.id)}
                        onContextMenu={(e) => handleContextMenu(e, link)}
                        className="block bg-card/50 border border-border/40 hover:border-blue-400/60 rounded-xl px-2 py-2 text-center transition-all duration-300 hover:bg-blue-500/[0.02] hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(59,130,246,0.3),0_0_4px_rgba(59,130,246,0.2)] cursor-pointer"
                      >
<span className="text-lg flex items-center justify-center mb-1">
  {renderIcon(link.icon)}
</span>                        <span className="text-[9px] font-mono text-muted-foreground truncate block group-hover:text-foreground/80 transition-colors">
                          {link.name}
                        </span>
                      </a>
                      <GripVertical className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-25 cursor-grab transition-opacity" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-card border border-border rounded-xl shadow-2xl shadow-black/40 py-1.5 w-40 animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const link = quickLinks.find((l) => l.id === contextMenu.linkId);
              if (link) openEditModal(link);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 text-foreground transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => {
              setDeleteTarget({
                type: "link",
                id: contextMenu.linkId,
                name: contextMenu.linkName,
              });
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}

      {/* Add/Edit Link Modal */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowLinkModal(false)}
        >
          <form
            onSubmit={handleSaveLink}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl shadow-black/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editingLinkId ? "Edit Link" : "Add Quick Link"}
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Category
              </label>
              <select
                value={linkCategoryId}
                onChange={(e) => setLinkCategoryId(e.target.value)}
                className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none transition-colors"
              >
                {quickCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Name
              </label>
              <input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="e.g. GitHub"
                maxLength={20}
                className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                URL
              </label>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="e.g. https://github.com"
                className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Icon
              </label>

                   {/* Current icon preview */}
              {linkIcon && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {renderIcon(linkIcon)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Current icon
                  </span>
                  <button
                    onClick={() => setLinkIcon("")}
                    className="text-[9px] text-muted-foreground hover:text-destructive ml-auto"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Fetch favicon button */}
              {linkUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    setLinkIcon("loading");
                    try {
                      const domain = new URL(
                        linkUrl.startsWith("http")
                          ? linkUrl
                          : "https://" + linkUrl,
                      ).hostname;
                      // Store as favicon:domain format
                      const faviconData = `favicon:${domain}`;

                      // Test if it loads
                      const testImg = new Image();
                      testImg.onload = () => setLinkIcon(faviconData);
                      testImg.onerror = () => setLinkIcon("");
                      testImg.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                    } catch {
                      setLinkIcon("");
                    }
                  }}
                  disabled={linkIcon === "loading"}
                  className="w-full bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-all mb-2 disabled:opacity-50"
                >
                  {linkIcon === "loading" ? (
                    <>
                      <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      Fetching icon...
                    </>
                  ) : (
                    <>🌐 Fetch favicon from URL</>
                  )}
                </button>
              )}

              {/* Manual emoji input */}
              <input
                value={
                  typeof linkIcon === "string" && !linkIcon.startsWith("http")
                    ? linkIcon
                    : ""
                }
                onChange={(e) => setLinkIcon(e.target.value)}
                placeholder="Or type emoji (e.g. 🐙)"
                maxLength={2}
                className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none transition-colors"
              />

              {/* Emoji picker */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setLinkIcon(emoji)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-sm flex items-center justify-center hover:bg-primary/10 transition-all",
                      linkIcon === emoji &&
                        "bg-primary/15 ring-1 ring-primary/30",
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:shadow-glow-cyan transition-all"
            >
              {editingLinkId ? "Save Changes" : "Save Link"}
            </button>
          </form>
        </div>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowCatModal(false)}
        >
          <form
            onSubmit={handleAddCategory}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl shadow-black/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">New Category</h3>
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Name
              </label>
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Development"
                maxLength={20}
                className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Icon
              </label>
              <input
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="e.g. 💻"
                maxLength={2}
                className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none transition-colors"
              />
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[
                  "💻",
                  "🎨",
                  "📱",
                  "🎵",
                  "📊",
                  "📝",
                  "🔧",
                  "🛠️",
                  "📚",
                  "🏠",
                ].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setCatIcon(emoji)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-sm flex items-center justify-center hover:bg-primary/10 transition-all",
                      catIcon === emoji &&
                        "bg-primary/15 ring-1 ring-primary/30",
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:shadow-glow-cyan transition-all"
            >
              Create Category
            </button>
          </form>
        </div>
      )}

      {/* Keyboard Shortcuts Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl shadow-black/20 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-primary" /> Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Bind keys{" "}
              <kbd className="px-1 py-0.5 bg-section border border-border rounded text-[9px]">
                1
              </kbd>{" "}
              to{" "}
              <kbd className="px-1 py-0.5 bg-section border border-border rounded text-[9px]">
                9
              </kbd>{" "}
              to specific links. Press the key on Quick Access page to open.
            </p>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const boundId = keyBindings[num];
                const boundLink = boundId
                  ? quickLinks.find((l) => l.id === boundId)
                  : null;
                return (
                  <div key={num} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-section border border-border flex items-center justify-center text-xs font-mono font-bold text-muted-foreground shrink-0">
                      {num}
                    </span>
                    <select
                      value={boundId || ""}
                      onChange={(e) => {
                        const newBindings = { ...keyBindings };
                        if (e.target.value) {
                          newBindings[num] = e.target.value;
                        } else {
                          delete newBindings[num];
                        }
                        saveKeyBindings(newBindings);
                      }}
                      className="flex-1 bg-section border border-border rounded-lg px-3 py-2 text-xs font-mono focus:border-primary outline-none transition-colors"
                    >
                      <option value="">— Not bound —</option>
                      {quickLinks.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.icon} {l.name}
                        </option>
                      ))}
                    </select>
                    {boundLink && (
                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                        {boundLink.icon} {boundLink.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:shadow-glow-cyan transition-all"
            >
              Done
            </button>
            {/* Active shortcuts reference */}
            <div className="border-t border-border/50 pt-3 mt-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Active Shortcuts
              </p>
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const boundId = keyBindings[num];
                  const boundLink = boundId
                    ? quickLinks.find((l) => l.id === boundId)
                    : null;
                  return (
                    <div
                      key={num}
                      className="flex items-center gap-1.5 bg-section/40 rounded-md px-2 py-1.5"
                    >
                      <span className="text-[10px] font-mono font-bold text-primary w-4">
                        {num}
                      </span>
                      {boundLink ? (
                        <>
                          <span className="text-xs">{boundLink.icon}</span>
                          <span className="text-[8px] font-mono text-muted-foreground truncate">
                            {boundLink.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-[8px] font-mono text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl shadow-black/20 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                Delete {deleteTarget.type === "category" ? "Category" : "Link"}?
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                Are you sure you want to delete{" "}
                <span className="text-foreground font-semibold">
                  "{deleteTarget.name}"
                </span>
                ?
                {deleteTarget.type === "category" && (
                  <span className="block mt-1 text-destructive/80">
                    All links in this category will also be deleted.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-section border border-border text-muted-foreground px-4 py-2.5 rounded-lg text-xs font-medium hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-destructive text-destructive-foreground px-4 py-2.5 rounded-lg text-xs font-medium hover:bg-destructive/90 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
