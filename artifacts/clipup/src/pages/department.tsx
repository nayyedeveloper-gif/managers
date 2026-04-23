import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetDepartment, getGetDepartmentQueryKey, 
  useGetDepartmentMembers, getGetDepartmentMembersQueryKey,
  useListChannels, getListChannelsQueryKey,
  useUpdateDepartment, useDeleteDepartment
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, Settings, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function DepartmentDetail() {
  const { id } = useParams();
  const departmentId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dept, isLoading: isDeptLoading } = useGetDepartment(departmentId, {
    query: { enabled: !!departmentId, queryKey: getGetDepartmentQueryKey(departmentId) }
  });

  const { data: members, isLoading: isMembersLoading } = useGetDepartmentMembers(departmentId, {
    query: { enabled: !!departmentId, queryKey: getGetDepartmentQueryKey(departmentId) }
  });

  const { data: channels, isLoading: isChannelsLoading } = useListChannels({
    departmentId: departmentId
  });

  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", color: "" });

  React.useEffect(() => {
    if (dept) {
      setFormData({ name: dept.name, description: dept.description || "", color: dept.color });
    }
  }, [dept]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDept.mutateAsync({ id: departmentId, data: formData });
      queryClient.invalidateQueries({ queryKey: getGetDepartmentQueryKey(departmentId) });
      setIsEditOpen(false);
      toast({ title: "Department updated" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update department" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDept.mutateAsync({ id: departmentId });
      toast({ title: "Department deleted" });
      setLocation("/departments");
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to delete department" });
    }
  };

  if (isDeptLoading) {
    return <div className="p-8">Loading department...</div>;
  }

  if (!dept) {
    return <div className="p-8 text-destructive">Department not found</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href="/departments" className="hover:text-primary flex items-center transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Departments
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex-shrink-0 shadow-sm border border-black/10 flex items-center justify-center text-white font-bold text-xl" 
            style={{ backgroundColor: dept.color }}
          >
            {dept.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{dept.name}</h1>
            <p className="text-muted-foreground">{dept.description || "No description"}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUpdate}>
                <DialogHeader>
                  <DialogTitle>Edit Department</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex gap-2">
                      <Input id="color" type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-16 h-10 p-1" />
                      <Input value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updateDept.isPending}>Save changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Button variant="destructive" onClick={handleDelete} disabled={deleteDept.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-4">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Hash className="mr-2 h-5 w-5 text-primary" />
              Department Channels
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {isChannelsLoading ? (
                <p className="text-muted-foreground text-sm">Loading channels...</p>
              ) : channels?.length ? (
                channels.map(ch => (
                  <Card key={ch.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Hash className="mr-1 h-4 w-4 text-muted-foreground" />
                        {ch.name}
                        {ch.type === "private" && <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Private</span>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-1">{ch.description || "No description"}</p>
                      <div className="mt-3">
                        <Link href={`/channels/${ch.id}`}>
                          <Button variant="secondary" size="sm" className="w-full">Join Channel</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                  <p className="text-muted-foreground">No channels in this department.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Settings className="mr-2 h-5 w-5 text-primary" />
            Members ({members?.length || 0})
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col divide-y">
                {isMembersLoading ? (
                  <p className="p-4 text-muted-foreground text-sm">Loading members...</p>
                ) : members?.length ? (
                  members.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-4">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback>{member.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-background rounded-full ${
                          member.status === 'online' ? 'bg-emerald-500' :
                          member.status === 'away' ? 'bg-amber-500' :
                          member.status === 'busy' ? 'bg-rose-500' : 'bg-slate-300'
                        }`} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-muted-foreground text-sm text-center">No members found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
