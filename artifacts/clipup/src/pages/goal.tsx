import React, { useState } from "react";
import { Link, useParams } from "wouter";
import { useGetGoal, useGetGoalMilestones, useUpdateGoal, useUpdateMilestone, useCreateMilestone, getGetGoalQueryKey, getGetGoalMilestonesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, TrendingUp, AlertTriangle, CheckCircle2, Minus, ChevronRight, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  on_track: { label: "On Track", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  at_risk: { label: "At Risk", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  off_track: { label: "Off Track", color: "bg-red-500/10 text-red-600 border-red-200" },
  completed: { label: "Completed", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  not_started: { label: "Not Started", color: "bg-slate-500/10 text-slate-600 border-slate-200" },
};

export default function GoalDetail() {
  const { id } = useParams();
  const goalId = parseInt(id!);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mTarget, setMTarget] = useState("");
  const [mDue, setMDue] = useState("");
  const [editCurrentValue, setEditCurrentValue] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editMode, setEditMode] = useState(false);

  const { data: goal } = useGetGoal(goalId, { query: { enabled: !!goalId, queryKey: getGetGoalQueryKey(goalId) } });
  const { data: milestones = [] } = useGetGoalMilestones(goalId, { query: { enabled: !!goalId, queryKey: getGetGoalMilestonesQueryKey(goalId) } });
  const updateGoal = useUpdateGoal();
  const updateMilestone = useUpdateMilestone();
  const createMilestone = useCreateMilestone();

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateGoal.mutateAsync({ id: goalId, data: { currentValue: parseFloat(editCurrentValue), status: editStatus as "on_track" } });
      queryClient.invalidateQueries({ queryKey: getGetGoalQueryKey(goalId) });
      setEditMode(false);
      toast({ title: "Goal updated" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update goal" });
    }
  };

  const handleToggleMilestone = async (milestoneId: number, isCompleted: boolean) => {
    try {
      await updateMilestone.mutateAsync({ id: goalId, milestoneId, data: { isCompleted: !isCompleted } });
      queryClient.invalidateQueries({ queryKey: getGetGoalMilestonesQueryKey(goalId) });
      queryClient.invalidateQueries({ queryKey: getGetGoalQueryKey(goalId) });
    } catch {
      toast({ variant: "destructive", title: "Failed to update milestone" });
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMilestone.mutateAsync({ id: goalId, data: { title: mTitle, targetValue: parseFloat(mTarget), dueDate: mDue || null } });
      queryClient.invalidateQueries({ queryKey: getGetGoalMilestonesQueryKey(goalId) });
      setOpen(false); setMTitle(""); setMTarget(""); setMDue("");
      toast({ title: "Milestone created" });
    } catch {
      toast({ variant: "destructive", title: "Failed to create milestone" });
    }
  };

  if (!goal) return <div className="p-6 text-muted-foreground text-sm">Loading...</div>;

  const cfg = STATUS_CONFIG[goal.status];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/goals"><span className="hover:text-foreground cursor-pointer">Goals</span></Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate">{goal.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{goal.title}</CardTitle>
                  {goal.description && <p className="text-muted-foreground text-sm mt-1">{goal.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${cfg.color}`}>{cfg.label}</Badge>
                  <Button variant="outline" size="sm" onClick={() => { setEditCurrentValue(String(goal.currentValue)); setEditStatus(goal.status); setEditMode(true); }}>Update</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                  <span className="font-bold text-lg">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} className="h-3" />
              </div>

              {editMode && (
                <form onSubmit={handleUpdateGoal} className="space-y-3 p-4 bg-muted/40 rounded-lg border">
                  <p className="text-sm font-medium">Update Progress</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Current Value</Label>
                      <Input type="number" value={editCurrentValue} onChange={e => setEditCurrentValue(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="on_track">On Track</SelectItem>
                          <SelectItem value="at_risk">At Risk</SelectItem>
                          <SelectItem value="off_track">Off Track</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={updateGoal.isPending}>Save</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Milestones</CardTitle>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateMilestone} className="space-y-4 mt-2">
                      <div className="space-y-1.5">
                        <Label>Title</Label>
                        <Input value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="Milestone title" required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Target Value</Label>
                          <Input type="number" value={mTarget} onChange={e => setMTarget(e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Due Date</Label>
                          <Input type="date" value={mDue} onChange={e => setMDue(e.target.value)} />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={createMilestone.isPending}>Create</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No milestones yet</p>
              ) : (
                <div className="space-y-2">
                  {milestones.map(m => (
                    <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${m.isCompleted ? "bg-muted/30 opacity-70" : "bg-card"}`}>
                      <Checkbox
                        checked={m.isCompleted}
                        onCheckedChange={() => handleToggleMilestone(m.id, m.isCompleted)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${m.isCompleted ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
                        <p className="text-xs text-muted-foreground">Target: {m.targetValue} {goal.unit}</p>
                      </div>
                      {m.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {m.isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium">{goal.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{goal.progress}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Milestones</span>
                <span className="font-medium">{goal.completedMilestoneCount}/{goal.milestoneCount}</span>
              </div>
              {goal.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">{new Date(goal.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{new Date(goal.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
