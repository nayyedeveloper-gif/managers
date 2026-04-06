import React, { useState } from "react";
import { Link, useParams } from "wouter";
import { useGetProject, useGetProjectTasks, useGetProjectStats, useCreateTask, useUpdateTask, useDeleteTask, useListUsers, getGetProjectQueryKey, getGetProjectTasksQueryKey, getGetProjectStatsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, Clock, Tag, List, Kanban, Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLS = [
  { key: "todo", label: "To Do", color: "bg-slate-500/10 text-slate-600 border-slate-200" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { key: "in_review", label: "In Review", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { key: "done", label: "Done", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600 border-red-200",
  high: "bg-orange-500/10 text-orange-600 border-orange-200",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  low: "bg-slate-500/10 text-slate-600 border-slate-200",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  on_hold: "bg-amber-500/10 text-amber-600 border-amber-200",
  completed: "bg-blue-500/10 text-blue-600 border-blue-200",
  cancelled: "bg-red-500/10 text-red-600 border-red-200",
};

type Task = {
  id: number; title: string; description?: string | null; status: string; priority: string;
  assigneeName?: string | null; dueDate?: string | null; tags: string[]; commentCount: number;
};

function TaskCard({ task, onStatusChange, onDelete }: { task: Task; onStatusChange: (id: number, s: string) => void; onDelete: (id: number) => void }) {
  return (
    <div className="border rounded-lg p-3 bg-card hover:shadow-sm transition-all group">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{task.title}</p>
          {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
            {task.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Tag className="h-2.5 w-2.5" />{tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {task.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}</span>}
            {task.commentCount > 0 && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{task.commentCount}</span>}
            {task.assigneeName && <span>{task.assigneeName}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Select value={task.status} onValueChange={(val) => onStatusChange(task.id, val)}>
            <SelectTrigger className="w-7 h-7 p-0 border-0 bg-transparent [&>svg]:hidden">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rotate-90" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_COLS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = parseInt(id!);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");

  const { data: project } = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } });
  const { data: tasks = [] } = useGetProjectTasks(projectId, undefined, { query: { enabled: !!projectId, queryKey: getGetProjectTasksQueryKey(projectId) } });
  const { data: stats } = useGetProjectStats(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectStatsQueryKey(projectId) } });
  const { data: users = [] } = useListUsers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await createTask.mutateAsync({
        data: {
          title, description: description || null, priority: priority as "medium",
          projectId, assigneeId: assigneeId ? parseInt(assigneeId) : null,
          creatorId: user.id, dueDate: dueDate || null, tags: []
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectTasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
      setOpen(false); setTitle(""); setDescription(""); setDueDate(""); setAssigneeId("");
      toast({ title: "Task created" });
    } catch {
      toast({ variant: "destructive", title: "Failed to create task" });
    }
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { status: status as "todo" } });
      queryClient.invalidateQueries({ queryKey: getGetProjectTasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    } catch {
      toast({ variant: "destructive", title: "Failed to update task" });
    }
  };

  const handleDelete = async (taskId: number) => {
    try {
      await deleteTask.mutateAsync({ id: taskId });
      queryClient.invalidateQueries({ queryKey: getGetProjectTasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete task" });
    }
  };

  const grouped = STATUS_COLS.map(col => ({
    ...col,
    tasks: (tasks as Task[]).filter(t => t.status === col.key)
  }));

  if (!project) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects"><span className="hover:text-foreground cursor-pointer">Projects</span></Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[project.status]}`}>{project.status.replace("_", " ")}</Badge>
            <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[project.priority]}`}>{project.priority}</Badge>
          </div>
          {project.description && <p className="text-muted-foreground text-sm mt-1">{project.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>by {project.ownerName}</span>
            {project.spaceName && <span>{project.spaceName}</span>}
            {project.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {new Date(project.dueDate).toLocaleDateString()}</span>}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" required />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <Label>Assign To</Label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={createTask.isPending}>Create Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stats && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold">{stats.progress}%</span>
            </div>
            <Progress value={stats.progress} className="h-2.5 mb-3" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-medium">{stats.completedCount} done</span>
              <span className="text-blue-600 font-medium">{stats.inProgressCount} in progress</span>
              <span className="text-slate-600 font-medium">{stats.todoCount} to do</span>
              {stats.overdueCount > 0 && <span className="text-red-600 font-medium">{stats.overdueCount} overdue</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
        <div className="flex border rounded-md overflow-hidden">
          <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-8 px-3" onClick={() => setView("list")}>
            <List className="h-3.5 w-3.5 mr-1" />List
          </Button>
          <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="rounded-none h-8 px-3" onClick={() => setView("kanban")}>
            <Kanban className="h-3.5 w-3.5 mr-1" />Board
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No tasks yet. Create your first task!</div>
          ) : (
            (tasks as Task[]).map(task => (
              <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} />
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
          {grouped.map(group => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Badge variant="outline" className={`text-xs ${group.color}`}>{group.label}</Badge>
                <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
              </div>
              <div className="min-h-24 space-y-2">
                {group.tasks.map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
