import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, GripVertical } from "lucide-react";
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

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  media_url: string;
  type: string;
  order_index: number;
  created_at: string;
}

const SortableItem = ({ item, onEdit, onDelete }: { item: PortfolioItem; onEdit: (item: PortfolioItem) => void; onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="card-glass p-4 flex items-center gap-4">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      {item.media_url && (
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
          {item.type === "video" ? (
            <video src={item.media_url} className="w-full h-full object-cover" />
          ) : (
            <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        <span className="text-[10px] uppercase text-primary font-medium">{item.type}</span>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const AdminPortfolio = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [form, setForm] = useState({ title: "", description: "", type: "image" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const init = async () => {
      const isAdmin = await checkAuth();
      if (isAdmin) {
        await fetchItems();
      }
    };
    init();
  }, []);

  const checkAuth = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/admin-portal"); return false; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin");
    if (!roles || roles.length === 0) { await supabase.auth.signOut(); navigate("/admin-portal"); return false; }
    return true;
  };

  const fetchItems = async () => {
    const { data } = await supabase.from("portfolio_items").select("*").order("order_index", { ascending: true });
    if (data) setItems(data as PortfolioItem[]);
  };

  const handleSave = async () => {
    setSaving(true);
    let media_url = editItem?.media_url || "";

    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("portfolio-media").upload(path, file);
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("portfolio-media").getPublicUrl(path);
      media_url = urlData.publicUrl;
    }

    if (editItem) {
      await supabase.from("portfolio_items").update({ title: form.title, description: form.description, type: form.type, media_url }).eq("id", editItem.id);
    } else {
      await supabase.from("portfolio_items").insert({ title: form.title, description: form.description, type: form.type, media_url, order_index: items.length });
    }

    setDialogOpen(false);
    setEditItem(null);
    setForm({ title: "", description: "", type: "image" });
    setFile(null);
    fetchItems();
    setSaving(false);
    toast({ title: editItem ? "Updated!" : "Added!" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("portfolio_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Deleted" });
  };

  const openEdit = (item: PortfolioItem) => {
    setEditItem(item);
    setForm({ title: item.title, description: item.description, type: item.type });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ title: "", description: "", type: "image" });
    setFile(null);
    setDialogOpen(true);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    // Save new order
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("portfolio_items").update({ order_index: i }).eq("id", reordered[i].id);
    }
  }, [items]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-portal");
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold">Portfolio Items</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm" onClick={openNew} className="gap-1">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="card-glass">
              <DialogHeader>
                <DialogTitle className="font-heading">{editItem ? "Edit Item" : "Add New Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-secondary border-border" />
                <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border" />
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="bg-secondary border-border" />
                {editItem?.media_url && !file && (
                  <div className="text-xs text-muted-foreground">Current file will be kept if no new file is selected.</div>
                )}
                <Button variant="hero" className="w-full" onClick={handleSave} disabled={saving || !form.title}>
                  {saving ? "Saving…" : editItem ? "Update" : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {items.length === 0 ? (
          <div className="card-glass p-12 text-center text-muted-foreground">
            <p>No portfolio items yet. Add your first one!</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {items.map((item) => (
                  <SortableItem key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  );
};

export default AdminPortfolio;
