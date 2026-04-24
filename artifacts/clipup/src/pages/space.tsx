import React, { useState } from "react";
import { Link, useParams } from "wouter";
import { useGetSpace, useListProjects, getListProjectsQueryKey, useCreateProject, getGetSpaceQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, ArrowLeft, FolderKanban, ChevronRight, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SpaceIcon } from "@/components/space-icon";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  on_hold: "bg-amber-500/10 text-amber-600 border-amber-200",
  completed: "bg-blue-500/10 text-blue-600 border-blue-200",
  cancelled: "bg-red-500/10 text-red-600 border-red-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600 border-red-200",
  high: "bg-orange-500/10 text-orange-600 border-orange-200",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  low: "bg-slate-500/10 text-slate-600 border-slate-200",
};

export default function SpaceDetail() {
  const { id } = useParams();
  const spaceId = parseInt(id!);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState("medium");
  const [color, setColor] = useState("#6366f1");

  const { data: space } = useGetSpace(spaceId, { query: { enabled: !!spaceId, queryKey: getGetSpaceQueryKey(spaceId) } });
  const { data: projects = [] } = useListProjects({ spaceId }, { query: { enabled: !!spaceId, queryKey: getListProjectsQueryKey({ spaceId }) } });
  const createProject = useCreateProject();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await createProject.mutateAsync({ data: { name, description: description || null, status: status as "active", priority: priority as "medium", color, spaceId, ownerId: user.id } });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey({ spaceId }) });
      setOpen(false); setName(""); setDescription("");
      toast({ title: "Project created" });
    } catch {
      toast({ variant: "destructive", title: "Failed to create project" });
    }
  };

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/spaces"><span className="hover:text-foreground cursor-pointer">Spaces</span></Link>
        <span>/</span>
        <span className="text-foreground font-medium">{space?.name || "..."}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {space && (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/70">
              <SpaceIcon icon={space.icon} className="h-6 w-6" style={{ color: space.color }} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{space?.name}</h1>
            {space?.description && <p className="text-muted-foreground text-sm mt-0.5">{space.description}</p>}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Project name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createProject.isPending}>Create Project</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No projects in this space</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer group border-l-4" style={{ borderLeftColor: project.color }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{project.name}</CardTitle>
                      {project.description && <CardDescription className="text-xs mt-0.5 line-clamp-2">{project.description}</CardDescription>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-2" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[project.status]}`}>{project.status.replace("_", " ")}</Badge>
                    <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[project.priority]}`}>{project.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1.5" />
                  {project.dueDate && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Due {new Date(project.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
