import React, { useState } from "react";
import { useListTasks, useGetMyTasks, useCreateTask, useUpdateTask, useListProjects, getListTasksQueryKey, getGetMyTasksQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckSquare, Clock, Tag, MessageSquare, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_GROUPS = [
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

type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  projectName?: string | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  tags: string[];
  commentCount: number;
};

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: number, status: string) => void }) {
  return (
    <div className="group border rounded-lg p-3 bg-card hover:shadow-sm transition-all">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{task.title}</p>
          {task.projectName && <p className="text-xs text-muted-foreground mt-0.5">{task.projectName}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
            {task.tags.slice(0, 2).map(tag => (
              <span key={tag} className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
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
        <Select value={task.status} onValueChange={(val) => onStatusChange(task.id, val)}>
          <SelectTrigger className="w-7 h-7 p-0 border-0 bg-transparent [&>svg]:hidden">
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");

  const userId = user?.id || 0;
  const { data: myTasksSummary } = useGetMyTasks({ userId }, { query: { enabled: !!userId, queryKey: getGetMyTasksQueryKey({ userId }) } });
  const { data: myTasks = [] } = useListTasks({ assigneeId: userId }, { query: { enabled: !!userId, queryKey: getListTasksQueryKey({ assigneeId: userId }) } });
  const { data: projects = [] } = useListProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await createTask.mutateAsync({
        data: {
          title, description: description || null, priority: priority as "medium",
          projectId: projectId && projectId !== "__none__" ? parseInt(projectId) : null,
          creatorId: user.id, assigneeId: user.id,
          dueDate: dueDate || null, tags: []
        }
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ assigneeId: userId }) });
      queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey({ userId }) });
      setOpen(false); setTitle(""); setDescription(""); setDueDate(""); setProjectId("");
      toast({ title: "Task created" });
    } catch {
      toast({ variant: "destructive", title: "Failed to create task" });
    }
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { status: status as "todo" } });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ assigneeId: userId }) });
      queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey({ userId }) });
    } catch {
      toast({ variant: "destructive", title: "Failed to update task" });
    }
  };

  const activeTasks = myTasks.filter(t => t.status !== "done" && t.status !== "cancelled");
  const groupedTasks = STATUS_GROUPS.map(group => ({
    ...group,
    tasks: myTasks.filter(t => t.status === group.key) as Task[]
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{activeTasks.length} active task{activeTasks.length !== 1 ? "s" : ""}</p>
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
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Project (optional)</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createTask.isPending}>Create Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {myTasksSummary && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "To Do", value: myTasksSummary.todo, color: "text-slate-600" },
            { label: "In Progress", value: myTasksSummary.inProgress, color: "text-blue-600" },
            { label: "In Review", value: myTasksSummary.inReview, color: "text-purple-600" },
            { label: "Done", value: myTasksSummary.done, color: "text-emerald-600" },
            { label: "Overdue", value: myTasksSummary.overdue, color: "text-red-600" },
            { label: "Due Today", value: myTasksSummary.dueToday, color: "text-amber-600" },
          ].map(stat => (
            <Card key={stat.label} className="p-3 text-center">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {groupedTasks.map(group => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${group.color}`}>{group.label}</Badge>
                <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {group.tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-xs text-muted-foreground">No tasks</p>
                </div>
              ) : (
                group.tasks.map(task => (
                  <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
