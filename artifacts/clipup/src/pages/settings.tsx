import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateUser, getGetUserQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Save, User as UserIcon, ShieldCheck, AlertCircle, Bell, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export default function Settings() {
  const { user } = useAuth();
  const { status: pushStatus, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications(user?.id ?? null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateUser = useUpdateUser();

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    avatarUrl: "",
    status: "online" as const
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl || "",
        status: user.status
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: formData
      });
      
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(user.id) });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update profile" });
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="flex flex-col items-center justify-center p-6 bg-card border rounded-lg">
            <Avatar className="h-24 w-24 mb-4 ring-4 ring-background">
              <AvatarImage src={formData.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl">{formData.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="font-semibold">{user.username}</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{user.role}</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="mr-2 h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal details and how others see you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    value={formData.displayName} 
                    onChange={e => setFormData({...formData, displayName: e.target.value})} 
                    required 
                  />
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    {(user as any)?.emailVerified ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 cursor-default flex items-center gap-1 px-2 py-0.5 text-xs">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Your email is verified{(user as any)?.googleId ? " via Google" : ""}.</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30 cursor-default flex items-center gap-1 px-2 py-0.5 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            Unverified
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Sign in with Google to verify your email automatically.</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required 
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <Input 
                    id="avatarUrl" 
                    value={formData.avatarUrl} 
                    onChange={e => setFormData({...formData, avatarUrl: e.target.value})} 
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Current Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(val: any) => setFormData({...formData, status: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"/>Online</div>
                      </SelectItem>
                      <SelectItem value="away">
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2"/>Away</div>
                      </SelectItem>
                      <SelectItem value="busy">
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2"/>Do Not Disturb</div>
                      </SelectItem>
                      <SelectItem value="offline">
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-slate-400 mr-2"/>Invisible</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t bg-muted/20 px-6 py-4">
                <Button type="submit" disabled={updateUser.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>
          </form>

          {/* Push Notifications Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Receive push notifications on this device when you are @mentioned or assigned a task.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pushStatus === "unsupported" ? (
                <p className="text-sm text-muted-foreground">Push notifications are not supported on this browser.</p>
              ) : pushStatus === "denied" ? (
                <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Notification permission was denied. Please enable it in your browser settings, then reload.</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {isSubscribed ? "Push notifications are enabled" : "Push notifications are disabled"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isSubscribed
                        ? "You will receive notifications even when the app is closed."
                        : "Enable to get notified about mentions and task updates."}
                    </p>
                  </div>
                  {isSubscribed ? (
                    <Button variant="outline" size="sm" onClick={unsubscribe} disabled={pushLoading}>
                      <BellOff className="mr-2 h-4 w-4" />
                      {pushLoading ? "Disabling..." : "Disable"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={subscribe} disabled={pushLoading}>
                      <Bell className="mr-2 h-4 w-4" />
                      {pushLoading ? "Enabling..." : "Enable Notifications"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
