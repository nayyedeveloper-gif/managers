import React, { useState } from "react";
import { Link } from "wouter";
import { useListGoals, useCreateGoal, getListGoalsQueryKey } from "@workspace/api-client-react";
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
import { Plus, Target, ChevronRight, TrendingUp, AlertTriangle, CheckCircle2, Clock, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  on_track: { label: "On Track", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: <TrendingUp className="h-3 w-3" /> },
  at_risk: { label: "At Risk", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: <AlertTriangle className="h-3 w-3" /> },
  off_track: { label: "Off Track", color: "bg-red-500/10 text-red-600 border-red-200", icon: <AlertTriangle className="h-3 w-3" /> },
  completed: { label: "Completed", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  not_started: { label: "Not Started", color: "bg-slate-500/10 text-slate-600 border-slate-200", icon: <Minus className="h-3 w-3" /> },
};

export default function Goals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("not_started");
  const [targetValue, setTargetValue] = useState("100");
  const [currentValue, setCurrentValue] = useState("0");
  const [unit, setUnit] = useState("%");
  const [dueDate, setDueDate] = useState("");

  const { data: goals = [], isLoading } = useListGoals(undefined, {
    query: { queryKey: getListGoalsQueryKey() }
  });
  const createGoal = useCreateGoal();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await createGoal.mutateAsync({
        data: {
          title,
          description: description || null,
          status: status as "not_started",
          ownerId: user.id,
          targetValue: parseFloat(targetValue),
          currentValue: parseFloat(currentValue),
          unit,
          dueDate: dueDate || null
        }
      });
      queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      setOpen(false); setTitle(""); setDescription(""); setTargetValue("100"); setCurrentValue("0"); setUnit("%"); setDueDate("");
      toast({ title: "Goal created" });
    } catch {
      toast({ variant: "destructive", title: "Failed to create goal" });
    }
  };

  const stats = {
    total: goals.length,
    onTrack: goals.filter(g => g.status === "on_track").length,
    atRisk: goals.filter(g => g.status === "at_risk").length,
    completed: goals.filter(g => g.status === "completed").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track progress toward team and company objectives</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Goal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Increase MAU to 10,000" required />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Target</Label>
                  <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Current</Label>
                  <Input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="%" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="off_track">Off Track</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createGoal.isPending}>Create Goal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Goals", value: stats.total, color: "text-foreground" },
          { label: "On Track", value: stats.onTrack, color: "text-emerald-600" },
          { label: "At Risk", value: stats.atRisk, color: "text-amber-600" },
          { label: "Completed", value: stats.completed, color: "text-blue-600" },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No goals yet</p>
          <p className="text-sm text-muted-foreground mt-1">Set a goal to start tracking progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const cfg = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.not_started;
            return (
              <Link key={goal.id} href={`/goals/${goal.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{goal.title}</span>
                          <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </Badge>
                        </div>
                        {goal.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{goal.description}</p>}
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                            <span className="font-medium text-foreground">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>by {goal.ownerName}</span>
                          <span>{goal.completedMilestoneCount}/{goal.milestoneCount} milestones</span>
                          {goal.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(goal.dueDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
