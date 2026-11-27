import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AdminNavbar from "@/components/AdminNavbar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ALL_BUILTIN_PROJECTS,
  KIND_LABELS,
  PILLAR_LABELS,
  buildSeedInsertPayloads,
  decodePortfolioDescription,
  encodePortfolioDescription,
  isSystemResumeRow,
  resolvePortfolioImageUrl,
  sanitizeSafeLinkUrl,
  type BuiltInAssetKey,
  type CaseMetric,
  type PortfolioRow,
  type ProjectKind,
  type ProjectPillar,
} from "@/data/portfolioData";

const SEEDED_FLAG_KEY = "glynova_cms_catalog_seeded_v1";
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type FilterOption = "all" | ProjectPillar | "case-study";

interface FormState {
  title: string;
  itemKind: ProjectKind;
  pillar: ProjectPillar;
  categoryLabel: string;
  clientType: string;
  summary: string;
  challenge: string;
  architecture: string;
  stackText: string;
  outcomeHeadline: string;
  metrics: CaseMetric[];
  liveDemoUrl: string;
  repoUrl: string;
  type: string;
  published: boolean;
  seedKey?: string;
  assetKey?: BuiltInAssetKey;
}

const emptyForm: FormState = {
  title: "",
  itemKind: "work",
  pillar: "full-stack",
  categoryLabel: "",
  clientType: "",
  summary: "",
  challenge: "",
  architecture: "",
  stackText: "",
  outcomeHeadline: "",
  metrics: [],
  liveDemoUrl: "",
  repoUrl: "",
  type: "image",
  published: true,
};

const FILTER_TABS: { id: FilterOption; label: string }[] = [
  { id: "all", label: "All" },
  { id: "full-stack", label: "Full-Stack" },
  { id: "business-ops", label: "Business Ops" },
  { id: "paid-media", label: "Paid Media" },
  { id: "case-study", label: "Case Studies" },
];

const SortableItem = ({
  item,
  dragEnabled,
  onEdit,
  onTogglePublished,
  onRequestDelete,
}: {
  item: PortfolioRow;
  dragEnabled: boolean;
  onEdit: (item: PortfolioRow) => void;
  onTogglePublished: (item: PortfolioRow) => void;
  onRequestDelete: (item: PortfolioRow) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
    disabled: !dragEnabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const meta = decodePortfolioDescription(item.description);
  const pillarLabel = meta.pillar ? PILLAR_LABELS[meta.pillar] : "Project";
  const kindLabel = KIND_LABELS[meta.itemKind || "work"];
  const isPublished = meta.published !== false;
  const resolvedMedia = resolvePortfolioImageUrl(item.media_url, meta.assetKey);
  const safeExternalDemo =
    meta.liveDemoUrl && meta.liveDemoUrl.startsWith("http")
      ? meta.liveDemoUrl
      : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-glass p-4 flex items-center gap-4 transition-opacity ${
        isPublished ? "opacity-100" : "opacity-65"
      }`}
    >
      <button
        type="button"
        {...(dragEnabled ? attributes : {})}
        {...(dragEnabled ? listeners : {})}
        disabled={!dragEnabled}
        className={`shrink-0 ${
          dragEnabled
            ? "cursor-grab text-muted-foreground hover:text-foreground"
            : "cursor-not-allowed text-muted-foreground/30"
        }`}
        aria-label={
          dragEnabled
            ? `Reorder ${item.title}`
            : "Clear search or filter to reorder"
        }
        title={
          dragEnabled
            ? "Drag to reorder"
            : "Switch filter to All and clear search to drag-reorder"
        }
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border flex items-center justify-center">
        {resolvedMedia ? (
          item.type === "video" ? (
            <video src={resolvedMedia} className="w-full h-full object-cover" />
          ) : (
            <img
              src={resolvedMedia}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )
        ) : (
          <Layers className="h-5 w-5 text-primary/70" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium tabular-nums mb-0.5">
          <span className="text-primary">{kindLabel}</span>
          <span aria-hidden="true" className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{pillarLabel}</span>
          {meta.clientType && (
            <>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span className="text-muted-foreground truncate">{meta.clientType}</span>
            </>
          )}
          {meta.metrics && meta.metrics.length > 0 && (
            <>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span className="text-foreground/80">
                {meta.metrics.length} metric{meta.metrics.length === 1 ? "" : "s"}
              </span>
            </>
          )}
          <span aria-hidden="true" className="text-muted-foreground">·</span>
          <span className={isPublished ? "text-emerald-500" : "text-amber-500"}>
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <p className="font-heading font-semibold text-sm text-foreground truncate">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{meta.summary}</p>
        {(meta.outcomeHeadline || (meta.stack && meta.stack.length > 0)) && (
          <p className="text-[11px] font-medium text-muted-foreground/80 truncate mt-1 tabular-nums">
            {meta.outcomeHeadline ? meta.outcomeHeadline : ""}
            {meta.outcomeHeadline && meta.stack && meta.stack.length > 0 ? " · " : ""}
            {meta.stack && meta.stack.length > 0 ? meta.stack.join(" · ") : ""}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {safeExternalDemo && (
          <Button variant="ghost" size="icon" asChild>
            <a
              href={safeExternalDemo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open live demo"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onTogglePublished(item)}
          aria-label={
            isPublished ? `Hide ${item.title} from homepage` : `Publish ${item.title} to homepage`
          }
          title={isPublished ? "Hide from homepage" : "Publish to homepage"}
        >
          {isPublished ? (
            <Eye className="h-4 w-4 text-emerald-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.title}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRequestDelete(item)}
          className="text-destructive hover:text-destructive"
          aria-label={`Delete ${item.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const AdminPortfolio = () => {
  const [items, setItems] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PortfolioRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioRow | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const checkAuth = useCallback(async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin-portal");
      return false;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      navigate("/admin-portal");
      return false;
    }
    return true;
  }, [navigate]);

  const fetchItems = useCallback(async (): Promise<PortfolioRow[]> => {
    const { data, error } = await supabase
      .from("portfolio_items")
      .select("*")
      .order("order_index", { ascending: true });
    if (!error && data) {
      const rows = (data as PortfolioRow[]).filter(
        (row) => !isSystemResumeRow(row)
      );
      setItems(rows);
      return rows;
    }
    return [];
  }, []);

  const syncBuiltInCatalog = useCallback(
    async (currentRows: PortfolioRow[], silentIfEmpty = false) => {
      const payloads = buildSeedInsertPayloads(currentRows);
      if (payloads.length === 0) {
        if (!silentIfEmpty) {
          toast({
            title: "Catalog already synced",
            description: "All built-in works and case studies are already in Project CMS.",
          });
        }
        return;
      }

      setSyncing(true);
      const { error } = await supabase.from("portfolio_items").insert(payloads);
      setSyncing(false);

      if (error) {
        toast({
          title: "Catalog sync failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      try {
        localStorage.setItem(SEEDED_FLAG_KEY, "1");
      } catch {
        // Ignore storage restriction
      }

      await fetchItems();
      toast({
        title: "Works & Case Studies Synced",
        description: `Synced ${payloads.length} item${payloads.length === 1 ? "" : "s"} into Project CMS.`,
      });
    },
    [fetchItems, toast]
  );

  useEffect(() => {
    const init = async () => {
      const isAdmin = await checkAuth();
      if (!isAdmin) return;
      const rows = await fetchItems();

      const hasSeededRows = rows.some(
        (r) => Boolean(decodePortfolioDescription(r.description).seedKey)
      );
      let alreadySeededFlag = false;
      try {
        alreadySeededFlag = localStorage.getItem(SEEDED_FLAG_KEY) === "1";
      } catch {
        alreadySeededFlag = false;
      }

      if (hasSeededRows) {
        try {
          localStorage.setItem(SEEDED_FLAG_KEY, "1");
        } catch {
          // Ignore storage restriction
        }
      } else if (!alreadySeededFlag) {
        await syncBuiltInCatalog(rows, true);
      }

      setLoading(false);
    };
    init();
  }, [checkAuth, fetchItems, syncBuiltInCatalog]);

  const missingBuiltInCount = useMemo(
    () => buildSeedInsertPayloads(items).length,
    [items]
  );

  const summaryCounts = useMemo(() => {
    let works = 0;
    let caseStudies = 0;
    let published = 0;
    for (const item of items) {
      const meta = decodePortfolioDescription(item.description);
      if (meta.itemKind === "case-study") caseStudies++;
      else works++;
      if (meta.published !== false) published++;
    }
    return { total: items.length, works, caseStudies, published };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const meta = decodePortfolioDescription(item.description);
      if (filter === "case-study" && meta.itemKind !== "case-study") return false;
      if (
        filter !== "all" &&
        filter !== "case-study" &&
        (meta.pillar || "full-stack") !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (meta.summary || "").toLowerCase().includes(q) ||
        (meta.clientType || "").toLowerCase().includes(q) ||
        (meta.stack || []).join(" ").toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  const dragEnabled = filter === "all" && search.trim() === "";

  const handleSave = async () => {
    if (!form.title.trim()) return;

    const demoCandidate = form.liveDemoUrl.trim();
    if (demoCandidate && !sanitizeSafeLinkUrl(demoCandidate)) {
      toast({
        title: "Invalid Live Demo URL",
        description: "Use a valid https://, http://, or #anchor URL.",
        variant: "destructive",
      });
      return;
    }

    const repoCandidate = form.repoUrl.trim();
    if (repoCandidate && !sanitizeSafeLinkUrl(repoCandidate)) {
      toast({
        title: "Invalid GitHub Repo URL",
        description: "Use a valid https:// or http:// URL.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    let media_url = editItem?.media_url || "";

    if (file) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast({
          title: "File too large",
          description: "Maximum upload size is 15 MB.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("portfolio-media")
        .upload(path, file);
      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("portfolio-media")
        .getPublicUrl(path);
      media_url = urlData.publicUrl;
    }

    const encodedDescription = encodePortfolioDescription({
      seedKey: form.seedKey,
      itemKind: form.itemKind,
      pillar: form.pillar,
      categoryLabel: form.categoryLabel.trim(),
      clientType: form.clientType.trim(),
      summary: form.summary.trim(),
      challenge: form.challenge.trim(),
      architecture: form.architecture.trim(),
      outcomeHeadline: form.outcomeHeadline.trim(),
      stack: form.stackText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      metrics: form.metrics.filter((m) => m.label.trim()),
      liveDemoUrl: demoCandidate,
      repoUrl: repoCandidate,
      assetKey: form.assetKey,
      published: form.published,
    });

    if (editItem) {
      const { error } = await supabase
        .from("portfolio_items")
        .update({
          title: form.title.trim(),
          description: encodedDescription,
          type: form.type,
          media_url,
        })
        .eq("id", editItem.id);
      if (error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    } else {
      const nextOrder =
        items.reduce(
          (max, item) =>
            typeof item.order_index === "number" && item.order_index > max
              ? item.order_index
              : max,
          -1
        ) + 1;
      const { error } = await supabase.from("portfolio_items").insert({
        title: form.title.trim(),
        description: encodedDescription,
        type: form.type,
        media_url,
        order_index: nextOrder,
      });
      if (error) {
        toast({
          title: "Save failed",
          description: error.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    setDialogOpen(false);
    setEditItem(null);
    setForm(emptyForm);
    setFile(null);
    await fetchItems();
    setSaving(false);
    toast({
      title: editItem ? "Project updated" : "Project published to CMS",
    });
  };

  const handleTogglePublished = async (item: PortfolioRow) => {
    const meta = decodePortfolioDescription(item.description);
    const nextPublished = meta.published === false;
    const updatedDescription = encodePortfolioDescription({
      ...meta,
      published: nextPublished,
    });

    const { error } = await supabase
      .from("portfolio_items")
      .update({ description: updatedDescription })
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Status update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, description: updatedDescription } : row
      )
    );
    toast({
      title: nextPublished ? "Published to homepage" : "Moved to draft",
      description: item.title,
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    const { error } = await supabase
      .from("portfolio_items")
      .delete()
      .eq("id", target.id);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== target.id));
    toast({
      title: "Project deleted",
      description: `${target.title} removed from Project CMS.`,
    });
  };

  const openEdit = (item: PortfolioRow) => {
    const meta = decodePortfolioDescription(item.description);
    setEditItem(item);
    setForm({
      title: item.title,
      itemKind: meta.itemKind || "work",
      pillar: meta.pillar || "full-stack",
      categoryLabel: meta.categoryLabel || "",
      clientType: meta.clientType || "",
      summary: meta.summary || "",
      challenge: meta.challenge || "",
      architecture: meta.architecture || "",
      stackText: (meta.stack || []).join(", "),
      outcomeHeadline: meta.outcomeHeadline || "",
      metrics: meta.metrics ? meta.metrics.map((m) => ({ ...m })) : [],
      liveDemoUrl: meta.liveDemoUrl || "",
      repoUrl: meta.repoUrl || "",
      type: item.type || "image",
      published: meta.published !== false,
      seedKey: meta.seedKey,
      assetKey: meta.assetKey,
    });
    setFile(null);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditItem(null);
    setForm(emptyForm);
    setFile(null);
    setDialogOpen(true);
  };

  const addMetricRow = () => {
    setForm((prev) => ({
      ...prev,
      metrics: [...prev.metrics, { label: "", before: "", after: "", delta: "" }],
    }));
  };

  const updateMetricRow = (
    idx: number,
    field: keyof CaseMetric,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      metrics: prev.metrics.map((m, i) =>
        i === idx ? { ...m, [field]: value } : m
      ),
    }));
  };

  const removeMetricRow = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      metrics: prev.metrics.filter((_, i) => i !== idx),
    }));
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!dragEnabled) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      setItems(reordered);

      await Promise.all(
        reordered.map((row, index) =>
          supabase
            .from("portfolio_items")
            .update({ order_index: index })
            .eq("id", row.id)
        )
      );
      toast({ title: "Display order saved" });
    },
    [dragEnabled, items, toast]
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Project CMS
            </h1>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              {summaryCounts.total} Total · {summaryCounts.works} Works ·{" "}
              {summaryCounts.caseStudies} Case Studies · {summaryCounts.published}{" "}
              Published to Homepage
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {missingBuiltInCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => syncBuiltInCatalog(items, false)}
                disabled={syncing}
                className="gap-1.5 whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing
                  ? "Syncing…"
                  : `Sync Built-In (${missingBuiltInCount})`}
              </Button>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="hero"
                  size="sm"
                  onClick={openNew}
                  className="gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" /> Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className="card-glass max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading">
                    {editItem ? "Edit Project / Case Study" : "Add Project / Case Study"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                  {/* Section 1: Identity & Placement */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Identity &amp; Placement
                    </p>
                    <Input
                      placeholder="Project or Case Study Title *"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="bg-secondary border-border"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Select
                        value={form.itemKind}
                        onValueChange={(v) =>
                          setForm({ ...form, itemKind: v as ProjectKind })
                        }
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Entry Kind" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="work">Work / System</SelectItem>
                          <SelectItem value="case-study">Case Study</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={form.pillar}
                        onValueChange={(v) =>
                          setForm({ ...form, pillar: v as ProjectPillar })
                        }
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Pillar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-stack">Full-Stack</SelectItem>
                          <SelectItem value="business-ops">Business Ops</SelectItem>
                          <SelectItem value="paid-media">Paid Media</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={form.published ? "published" : "draft"}
                        onValueChange={(v) =>
                          setForm({ ...form, published: v === "published" })
                        }
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published (Live)</SelectItem>
                          <SelectItem value="draft">Draft (Hidden)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Client / Industry (e.g. Fashion & Apparel)"
                        value={form.clientType}
                        onChange={(e) =>
                          setForm({ ...form, clientType: e.target.value })
                        }
                        className="bg-secondary border-border"
                      />
                      <Input
                        placeholder="Category Label (optional, e.g. Full-Stack · SaaS)"
                        value={form.categoryLabel}
                        onChange={(e) =>
                          setForm({ ...form, categoryLabel: e.target.value })
                        }
                        className="bg-secondary border-border"
                      />
                    </div>

                    <Input
                      placeholder="Headline Outcome (e.g. 4.8x Blended ROAS · 38 hrs/wk saved)"
                      value={form.outcomeHeadline}
                      onChange={(e) =>
                        setForm({ ...form, outcomeHeadline: e.target.value })
                      }
                      className="bg-secondary border-border"
                    />
                  </div>

                  {/* Section 2: Narrative & Brief */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Case Study Narrative
                    </p>
                    <Textarea
                      placeholder="Summary (shown on portfolio card & modal header)"
                      rows={2}
                      value={form.summary}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                      className="bg-secondary border-border"
                    />
                    <Textarea
                      placeholder="The Challenge (client bottleneck before engagement)"
                      rows={2}
                      value={form.challenge}
                      onChange={(e) =>
                        setForm({ ...form, challenge: e.target.value })
                      }
                      className="bg-secondary border-border"
                    />
                    <Textarea
                      placeholder="Architecture & Execution Notes"
                      rows={2}
                      value={form.architecture}
                      onChange={(e) =>
                        setForm({ ...form, architecture: e.target.value })
                      }
                      className="bg-secondary border-border"
                    />
                    <Input
                      placeholder="Tech / Channel Stack (comma-separated, e.g. React, Supabase, Meta Ads)"
                      value={form.stackText}
                      onChange={(e) =>
                        setForm({ ...form, stackText: e.target.value })
                      }
                      className="bg-secondary border-border"
                    />
                  </div>

                  {/* Section 3: Quantified Metrics Builder */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Quantified Metrics (Before → After)
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMetricRow}
                        className="h-7 text-xs gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Metric
                      </Button>
                    </div>

                    {form.metrics.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No KPI metrics added yet. Add before/after rows to display quantified proof inside the Case Study modal.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {form.metrics.map((metric, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 items-center"
                          >
                            <Input
                              placeholder="Metric (e.g. ROAS)"
                              value={metric.label}
                              onChange={(e) =>
                                updateMetricRow(idx, "label", e.target.value)
                              }
                              className="col-span-4 bg-secondary border-border h-9 text-xs"
                            />
                            <Input
                              placeholder="Before"
                              value={metric.before}
                              onChange={(e) =>
                                updateMetricRow(idx, "before", e.target.value)
                              }
                              className="col-span-2 bg-secondary border-border h-9 text-xs tabular-nums"
                            />
                            <Input
                              placeholder="After"
                              value={metric.after}
                              onChange={(e) =>
                                updateMetricRow(idx, "after", e.target.value)
                              }
                              className="col-span-3 bg-secondary border-border h-9 text-xs tabular-nums"
                            />
                            <Input
                              placeholder="Delta (+390%)"
                              value={metric.delta}
                              onChange={(e) =>
                                updateMetricRow(idx, "delta", e.target.value)
                              }
                              className="col-span-2 bg-secondary border-border h-9 text-xs tabular-nums"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMetricRow(idx)}
                              aria-label="Remove metric row"
                              className="col-span-1 h-9 w-9 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 4: Links & Cover Media */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Links &amp; Media
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Live Demo URL (https://... or #contact)"
                        value={form.liveDemoUrl}
                        onChange={(e) =>
                          setForm({ ...form, liveDemoUrl: e.target.value })
                        }
                        className="bg-secondary border-border"
                      />
                      <Input
                        placeholder="GitHub Repo URL (optional)"
                        value={form.repoUrl}
                        onChange={(e) =>
                          setForm({ ...form, repoUrl: e.target.value })
                        }
                        className="bg-secondary border-border"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm({ ...form, type: v })}
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Media Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="sm:col-span-2 bg-secondary border-border"
                      />
                    </div>

                    {(editItem?.media_url || form.assetKey) && !file && (
                      <p className="text-xs text-muted-foreground">
                        Current visual asset will be preserved unless you upload a new file.
                      </p>
                    )}
                  </div>

                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={handleSave}
                    disabled={saving || !form.title.trim()}
                  >
                    {saving
                      ? "Saving…"
                      : editItem
                      ? "Save Changes to CMS"
                      : "Publish to Project CMS"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search & Discipline Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search works, case studies, clients, or tech stack…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {!dragEnabled && items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Showing {filteredItems.length} of {items.length} entries. Switch to{" "}
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
              className="text-primary hover:underline"
            >
              All
            </button>{" "}
            to drag-and-drop reorder homepage placement.
          </p>
        )}

        {loading ? (
          <div className="card-glass p-12 text-center text-sm text-muted-foreground">
            Loading Project CMS…
          </div>
        ) : items.length === 0 ? (
          <div className="card-glass p-12 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Project CMS is currently empty. Sync the {ALL_BUILTIN_PROJECTS.length}{" "}
              built-in works &amp; case studies or add a new project.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncBuiltInCatalog(items, false)}
                disabled={syncing}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync All {ALL_BUILTIN_PROJECTS.length} Works &amp; Case Studies
              </Button>
              <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add New Project
              </Button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="card-glass p-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No CMS entries match your current filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
            >
              Reset Filter
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    dragEnabled={dragEnabled}
                    onEdit={openEdit}
                    onTogglePublished={handleTogglePublished}
                    onRequestDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete from Project CMS?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.title}
              </span>
              ? Since Project CMS is the live source of truth, this will also remove it from the public homepage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPortfolio;
