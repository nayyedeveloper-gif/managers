import React, { useState } from "react";
import { useListTasks, useGetMyTasks, useCreateTask, useUpdateTask, useDeleteTask, useListProjects, getListTasksQueryKey, getGetMyTasksQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckSquare, Clock, Tag, MessageSquare, ChevronDown, List, LayoutGrid, Edit2, Trash2, Calendar, Users, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";

const STATUS_GROUPS = [
  { key: "todo", label: "Todo", color: "bg-slate-500/10 text-slate-600 border-slate-200" },
  { key: "done", label: "Done", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { key: "delegated", label: "Delegated", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
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
  description: string | null;
  status: string;
  priority: string;
  projectName?: string | null;
  assigneeName?: string | null;
  assigneeId?: number | null;
  dueDate?: string | null;
  startDate?: string | null;
  dateDone?: string | null;
  tags: string[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: number;
  username: string;
  displayName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
};

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: number, status: string) => void }) {
  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="group border rounded-lg p-3 bg-card hover:shadow-sm transition-all cursor-pointer">
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
          <Select value={task.status} onValueChange={(val) => { onStatusChange(task.id, val); }}>
            <SelectTrigger className="w-7 h-7 p-0 border-0 bg-transparent [&>svg]:hidden">
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Link>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dateDone, setDateDone] = useState("");

  const userId = user?.id || 0;
  const { data: myTasksSummary } = useGetMyTasks({ userId }, { query: { enabled: !!userId, queryKey: getGetMyTasksQueryKey({ userId }) } });
  const { data: apiTasks = [] } = useListTasks({ assigneeId: userId }, { query: { enabled: !!userId, queryKey: getListTasksQueryKey({ assigneeId: userId }) } });
  const { data: delegatedTasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks-delegated", userId],
    queryFn: () => fetch(`/api/tasks?creatorId=${userId}`).then(r => r.json()),
    enabled: !!userId,
  });
  const myTasks = apiTasks as Task[];
  const { data: projects = [] } = useListProjects();
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then(r => r.json()),
  });

  // Determine filter based on route
  const filterMode = location.split("/").pop() || "all";
  const taskIdParam = location.split("/")[2];
  
  const filterLabel = {
    all: "Assigned to Me",
    "today-overdue": "Today & Overdue"
  }[filterMode] || "Assigned to Me";

  // Check if viewing task details
  const isDetailView = !!taskIdParam && filterMode === "all";
  const selectedTask = isDetailView ? myTasks.find(t => t.id === parseInt(taskIdParam)) : null;

  // Filter tasks based on mode
  const filteredTasks = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasks = myTasks;
    
    if (filterMode === "today-overdue") {
      return tasks.filter(t => {
        const dueDate = t.dueDate ? new Date(t.dueDate) : null;
        const isToday = dueDate && dueDate.toDateString() === today.toDateString();
        const isOverdue = dueDate && dueDate < today && t.status !== "done";
        return isToday || isOverdue;
      });
    }
    
    return tasks;
  })();

  // Separate tasks into Todo, Done, Delegated for board view
  const boardColumns = {
    todo: filteredTasks.filter(t => t.status !== "done" && t.assigneeId === user?.id),
    done: filteredTasks.filter(t => t.status === "done"),
    delegated: delegatedTasks.filter(t => t.assigneeId !== user?.id)
  };
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description: description || null, priority: priority as "medium",
          projectId: projectId && projectId !== "__none__" ? parseInt(projectId) : null,
          creatorId: user.id, assigneeId: user.id,
          dueDate: dueDate || null, startDate: startDate || null, dateDone: dateDone || null, tags: []
        })
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ assigneeId: userId }) });
      queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey({ userId }) });
      setOpen(false); setTitle(""); setDescription(""); setDueDate(""); setStartDate(""); setDateDone(""); setProjectId("");
      toast({ title: "Task created" });
    } catch {
      toast({ variant: "destructive", title: "Failed to create task" });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description: description || null, priority: priority as "medium",
          projectId: projectId && projectId !== "__none__" ? parseInt(projectId) : null,
          assigneeId: parseInt(projectId) || editingTask.assigneeId,
          dueDate: dueDate || null, startDate: startDate || null, dateDone: dateDone || null
        })
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ assigneeId: userId }) });
      queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey({ userId }) });
      setEditingTask(null); setOpen(false); setTitle(""); setDescription(""); setDueDate(""); setStartDate(""); setDateDone(""); setProjectId("");
      toast({ title: "Task updated" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update task" });
    }
  };

  const handleDelete = async (taskId: number) => {
    try {
      await deleteTask.mutateAsync({ id: taskId });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ assigneeId: userId }) });
      queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey({ userId }) });
      toast({ title: "Task deleted" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete task" });
    }
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: status as "todo", 
          dateDone: status === "done" ? new Date().toISOString() : null 
        })
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ assigneeId: userId }) });
      queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey({ userId }) });
    } catch {
      toast({ variant: "destructive", title: "Failed to update task" });
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setProjectId(task.projectName ? projects.find(p => p.name === task.projectName)?.id?.toString() || "" : "");
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : "");
    setStartDate(task.startDate ? task.startDate.split('T')[0] : "");
    setDateDone(task.dateDone ? task.dateDone.split('T')[0] : "");
    setOpen(true);
  };

  const activeTasks = filteredTasks.filter(t => t.status !== "done" && t.status !== "cancelled");
  const groupedTasks = STATUS_GROUPS.map(group => ({
    ...group,
    tasks: boardColumns[group.key as keyof typeof boardColumns] as Task[]
  }));

  return (
    <div className="p-6 space-y-6">
      {isDetailView && selectedTask ? (
        <>
          <div className="flex items-center gap-4">
            <Link href="/tasks">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Task Details</h1>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedTask.title}</CardTitle>
                  {selectedTask.projectName && <p className="text-sm text-muted-foreground mt-1">{selectedTask.projectName}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedTask)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedTask.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTask.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1">{selectedTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant="outline" className={STATUS_GROUPS.find(g => g.key === selectedTask.status)?.color || ""}>
                    {STATUS_GROUPS.find(g => g.key === selectedTask.status)?.label || selectedTask.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge variant="outline" className={`mt-1 ${PRIORITY_COLORS[selectedTask.priority]}`}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="text-sm mt-1">{selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="text-sm mt-1">{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date Done</Label>
                  <p className="text-sm mt-1">{selectedTask.dateDone ? new Date(selectedTask.dateDone).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Assignee</Label>
                  <p className="text-sm mt-1">{selectedTask.assigneeName || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Comments</Label>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {selectedTask.commentCount}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm mt-1">{new Date(selectedTask.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedTask.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTask.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        <Tag className="h-3 w-3" />{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{filterLabel}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{activeTasks.length} active task{activeTasks.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md">
                <Button
                  variant={view === "board" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setView("board")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setView("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Dialog open={open} onOpenChange={(open) => { setOpen(open); if (!open) setEditingTask(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Task</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
                  <form onSubmit={editingTask ? handleUpdate : handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
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
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date Done</Label>
                    <Input type="date" value={dateDone} onChange={e => setDateDone(e.target.value)} />
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
                {users.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Assignee</Label>
                    <Select value={editingTask?.assigneeId?.toString() || user?.id.toString() || ""} onValueChange={(val) => setProjectId(val)}>
                      <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.displayName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingTask(null); }}>Cancel</Button>
                  <Button type="submit" disabled={createTask.isPending}>{editingTask ? "Update" : "Create"} Task</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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

      {view === "board" ? (
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
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Date Done</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No tasks yet
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_GROUPS.find(g => g.key === task.status)?.color || ""}>
                        {STATUS_GROUPS.find(g => g.key === task.status)?.label || task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{task.startDate ? new Date(task.startDate).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{task.dateDone ? new Date(task.dateDone).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {task.commentCount}
                      </span>
                    </TableCell>
                    <TableCell>{task.assigneeName || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
        </div>
      )}
    </div>
  );
}
