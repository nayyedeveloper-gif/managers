import React, { useState } from "react";
import { useListUsers, getListUsersQueryKey, useListDepartments, getListDepartmentsQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Hash, Building2, Search, Crown, UserCheck, UserX, RefreshCw } from "lucide-react";

export default function AdminPanel() {
  const isAdmin = useIsAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  if (!isAdmin) {
    setLocation("/");
    return null;
  }

  const { data: users = [], isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const { data: departments = [] } = useListDepartments({
    query: { queryKey: getListDepartmentsQueryKey() }
  });

  const { data: channels = [] } = useQuery<{ id: number; name: string; memberCount: number; type: string }[]>({
    queryKey: ["channels-admin"],
    queryFn: () => fetch("/api/channels").then(r => r.json()),
  });

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === "admin").length;
  const activeCount = users.filter(u => u.status !== "offline").length;

  const updateUser = async (userId: number, updates: { role?: string; status?: string }) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message || "Failed to update user" });
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"><Crown className="h-3 w-3 mr-1" />Admin</Badge>;
    return <Badge variant="secondary"><UserCheck className="h-3 w-3 mr-1" />Member</Badge>;
  };

  const getStatusDot = (status: string) => {
    if (status === "online") return "bg-emerald-500";
    if (status === "away") return "bg-amber-500";
    return "bg-muted-foreground";
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Shield className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground mt-0.5">Manage users, roles, and workspace settings.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users, color: "text-blue-500 bg-blue-500/10" },
          { label: "Admins", value: adminCount, icon: Crown, color: "text-amber-500 bg-amber-500/10" },
          { label: "Departments", value: departments.length, icon: Building2, color: "text-purple-500 bg-purple-500/10" },
          { label: "Channels", value: channels.length, icon: Hash, color: "text-emerald-500 bg-emerald-500/10" },
        ].map(stat => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Management */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription className="mt-1">Change roles and status for all users.</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8 w-64"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading users...</div>
          ) : (
            <div className="divide-y">
              {filtered.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback className="text-sm">{u.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${getStatusDot(u.status)}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{u.displayName}</span>
                      {getRoleBadge(u.role)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">@{u.username} · {u.email}</p>
                    {u.departmentName && (
                      <p className="text-xs text-muted-foreground">{u.departmentName}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Role selector */}
                    <Select
                      value={u.role}
                      onValueChange={(val) => updateUser(u.id, { role: val })}
                      disabled={updatingId === u.id}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Status selector */}
                    <Select
                      value={u.status}
                      onValueChange={(val) => updateUser(u.id, { status: val })}
                      disabled={updatingId === u.id}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>

                    {updatingId === u.id && (
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Departments overview */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            Departments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {departments.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 border rounded-md bg-muted/20 hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ background: d.color || "#6366f1" }}>
                  {d.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{users.filter(u => u.departmentId === d.id).length} members</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Reference */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            Permission Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                role: "Admin",
                color: "border-amber-500/30 bg-amber-500/5",
                badge: <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 text-xs"><Crown className="h-3 w-3 mr-1" />Admin</Badge>,
                perms: ["Create/delete channels", "Create/delete departments", "Create spaces & projects", "Manage all users & roles", "View all activity", "Full system access"],
              },
              {
                role: "Member",
                color: "border-blue-500/30 bg-blue-500/5",
                badge: <Badge variant="secondary" className="text-xs"><UserCheck className="h-3 w-3 mr-1" />Member</Badge>,
                perms: ["Send messages & react", "Create & manage tasks", "Create projects", "View assigned content", "Update own profile", "Join public channels"],
              },
              {
                role: "Viewer",
                color: "border-muted bg-muted/20",
                badge: <Badge variant="outline" className="text-xs"><UserX className="h-3 w-3 mr-1" />Viewer</Badge>,
                perms: ["View channels (read-only)", "View projects & tasks", "View departments", "Cannot create anything", "Cannot send messages", "Profile view only"],
              },
            ].map(item => (
              <div key={item.role} className={`rounded-lg border p-4 ${item.color}`}>
                <div className="flex items-center gap-2 mb-3">{item.badge}</div>
                <ul className="space-y-1.5">
                  {item.perms.map(p => (
                    <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
