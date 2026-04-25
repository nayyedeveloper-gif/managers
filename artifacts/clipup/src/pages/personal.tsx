import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PersonalItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export default function Personal() {
  const { toast } = useToast();
  const [items, setItems] = useState<PersonalItem[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [editingItem, setEditingItem] = useState<PersonalItem | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newItem: PersonalItem = {
      id: Date.now().toString(),
      title,
      completed: false,
      createdAt: new Date().toISOString()
    };
    setItems([...items, newItem]);
    setTitle("");
    setOpen(false);
    toast({ title: "Item added" });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !editingItem) return;
    setItems(items.map(item => item.id === editingItem.id ? { ...item, title } : item));
    setTitle("");
    setEditingItem(null);
    setOpen(false);
    toast({ title: "Item updated" });
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast({ title: "Item deleted" });
  };

  const handleToggle = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const openEditDialog = (item: PersonalItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setOpen(true);
  };

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal List</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{completedCount} of {totalCount} completed</p>
        </div>
        <Dialog open={open} onOpenChange={(open) => { setOpen(open); if (!open) setEditingItem(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle></DialogHeader>
            <form onSubmit={editingItem ? handleEdit : handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Item title" required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingItem(null); }}>Cancel</Button>
                <Button type="submit">{editingItem ? "Update" : "Add"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No items yet. Add your first item to get started.</p>
            </CardContent>
          </Card>
        ) : (
          items.map(item => (
            <Card key={item.id} className={item.completed ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${item.completed ? "text-green-600" : ""}`}
                    onClick={() => handleToggle(item.id)}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
