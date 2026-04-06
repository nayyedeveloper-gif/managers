import React, { useState } from "react";
import { Link } from "wouter";
import { 
  useListChannels, getListChannelsQueryKey,
  useCreateChannel, useListDepartments, getListDepartmentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hash, Plus, Lock, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Channels() {
  const { data: channels, isLoading } = useListChannels({
    query: { queryKey: getListChannelsQueryKey() }
  });
  const { data: departments } = useListDepartments({
    query: { queryKey: getListDepartmentsQueryKey() }
  });

  const createChannel = useCreateChannel();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    type: "public" as const,
    departmentId: "0" 
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        departmentId: parseInt(formData.departmentId, 10) || null
      };
      
      await createChannel.mutateAsync({ data: payload });
      queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "", type: "public", departmentId: "0" });
      toast({ title: "Channel created" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to create channel" });
    }
  };

  const getChannelIcon = (type: string) => {
    if (type === "private") return <Lock className="h-5 w-5 text-amber-500" />;
    if (type === "direct") return <MessageSquare className="h-5 w-5 text-blue-500" />;
    return <Hash className="h-5 w-5 text-emerald-500" />;
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground mt-1">Browse and join conversation spaces.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Channel</DialogTitle>
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
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(val: any) => setFormData({...formData, type: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="direct">Direct Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="departmentId">Department (Optional)</Label>
                  <Select value={formData.departmentId} onValueChange={(val) => setFormData({...formData, departmentId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {departments?.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createChannel.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading channels...</div>
        ) : channels?.length ? (
          <div className="divide-y">
            {channels.map(channel => (
              <div key={channel.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-background border rounded-md shadow-sm">
                    {getChannelIcon(channel.type)}
                  </div>
                  <div>
                    <Link href={`/channels/${channel.id}`} className="font-semibold text-lg hover:underline decoration-primary">
                      {channel.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1 max-w-2xl">
                      {channel.description || "No description"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center bg-muted px-2 py-0.5 rounded-full">
                        {channel.type}
                      </span>
                      {channel.departmentName && (
                        <span className="flex items-center">
                          Department: {channel.departmentName}
                        </span>
                      )}
                      <span>{channel.memberCount} members</span>
                    </div>
                  </div>
                </div>
                <Link href={`/channels/${channel.id}`}>
                  <Button variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Join
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Hash className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
            <h3 className="text-lg font-medium">No channels</h3>
            <p className="text-muted-foreground mt-1">Create a channel to start collaborating.</p>
          </div>
        )}
      </div>
    </div>
  );
}
