import React, { useState } from "react";
import { Link } from "wouter";
import { useListSpaces, useCreateSpace, getListSpacesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers, FolderOpen, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Spaces() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("📁");

  const { data: spaces = [], isLoading } = useListSpaces({
    query: { queryKey: getListSpacesQueryKey() }
  });
  const createSpace = useCreateSpace();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await createSpace.mutateAsync({ data: { name, description: description || null, color, icon, ownerId: user.id } });
      queryClient.invalidateQueries({ queryKey: getListSpacesQueryKey() });
      setOpen(false);
      setName(""); setDescription(""); setColor("#6366f1"); setIcon("📁");
      toast({ title: "Space created" });
    } catch {
      toast({ variant: "destructive", title: "Failed to create space" });
    }
  };

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];
  const ICONS = ["📁", "⚙️", "🎨", "📈", "🚀", "💡", "🔬", "🏆"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spaces</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Organize your projects into workspaces</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Space</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Space</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Engineering Hub" required />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setIcon(ic)} className={`w-9 h-9 text-lg rounded-lg border-2 transition-all ${icon === ic ? "border-primary bg-primary/10" : "border-border"}`}>{ic}</button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createSpace.isPending}>Create Space</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : spaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Layers className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No spaces yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a space to organize your projects</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map(space => (
            <Link key={space.id} href={`/spaces/${space.id}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer group border-l-4" style={{ borderLeftColor: space.color }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{space.icon}</div>
                      <div>
                        <CardTitle className="text-base">{space.name}</CardTitle>
                        {space.description && <CardDescription className="text-xs mt-0.5 line-clamp-1">{space.description}</CardDescription>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FolderOpen className="h-3.5 w-3.5" />
                      {space.projectCount} project{space.projectCount !== 1 ? "s" : ""}
                    </span>
                    <span>by {space.ownerName}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
