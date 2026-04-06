import React, { useState } from "react";
import { Link } from "wouter";
import { useListDepartments, getListDepartmentsQueryKey, useCreateDepartment } from "@workspace/api-client-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Departments() {
  const isAdmin = useIsAdmin();
  const { data: departments, isLoading } = useListDepartments({
    query: { queryKey: getListDepartmentsQueryKey() }
  });
  const createDepartment = useCreateDepartment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", color: "#4f46e5" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDepartment.mutateAsync({ data: formData });
      queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "", color: "#4f46e5" });
      toast({ title: "Department created" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to create department" });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground mt-1">Manage organizational units and their channels.</p>
        </div>
        
        {isAdmin && (<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
                <DialogDescription>
                  Add a new department to organize your team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="color" 
                      type="color" 
                      value={formData.color} 
                      onChange={e => setFormData({...formData, color: e.target.value})} 
                      className="w-16 h-10 p-1"
                    />
                    <Input 
                      value={formData.color} 
                      onChange={e => setFormData({...formData, color: e.target.value})} 
                      pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createDepartment.isPending}>
                  {createDepartment.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>)}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full mt-4" />
              </CardContent>
            </Card>
          ))
        ) : departments?.map((dept) => (
          <Card key={dept.id} className="hover:border-primary/50 transition-colors flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm border border-black/10" 
                  style={{ backgroundColor: dept.color }} 
                />
                <CardTitle className="truncate">{dept.name}</CardTitle>
              </div>
              <CardDescription className="line-clamp-2 min-h-10 mt-2">
                {dept.description || "No description provided."}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pb-4">
              <div className="flex items-center text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                <Users className="mr-2 h-4 w-4" />
                {dept.memberCount} members
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Link href={`/departments/${dept.id}`} className="w-full">
                <Button variant="outline" className="w-full">View Details</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
        {departments?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
            <h3 className="text-lg font-medium">No departments</h3>
            <p className="text-muted-foreground mt-1">Get started by creating your first department.</p>
          </div>
        )}
      </div>
    </div>
  );
}
