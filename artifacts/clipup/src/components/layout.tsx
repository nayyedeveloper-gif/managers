import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useListNotifications, getListNotificationsQueryKey, useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bell, Hash, LayoutDashboard, Settings, Users, LogOut, Menu, Activity, FolderKanban, Target, CheckSquare, Layers, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { requestNotificationPermission } from "@/utils/notification-sound";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const [location] = useLocation();

  // Request browser notification permission on first load
  useEffect(() => {
    if (user) {
      requestNotificationPermission().catch(() => {});
    }
  }, [user?.id]);

  const { data: notifications } = useListNotifications(
    { unreadOnly: true },
    { query: { enabled: !!user, queryKey: getListNotificationsQueryKey({ unreadOnly: true }) } }
  );

  const { data: health } = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey() }
  });

  const { data: channelsData } = useQuery<{ id: number; unreadCount: number }[]>({
    queryKey: ["channels-unread", user?.id],
    queryFn: () => fetch(`/api/channels?userId=${user!.id}`).then(r => r.json()),
    enabled: !!user,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const unreadChannelCount = channelsData?.reduce((s, c) => s + (c.unreadCount ?? 0), 0) ?? 0;

  const NavItems = () => (
    <>
      <div className="px-3 py-2">
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview</p>
        <div className="space-y-0.5">
          <Link href="/">
            <Button variant={location === "/" ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/notifications">
            <Button variant={location.startsWith("/notifications") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work</p>
        <div className="space-y-0.5">
          <Link href="/spaces">
            <Button variant={location.startsWith("/spaces") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <Layers className="mr-2 h-4 w-4" />
              Spaces
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant={location.startsWith("/projects") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <FolderKanban className="mr-2 h-4 w-4" />
              Projects
            </Button>
          </Link>
          <Link href="/tasks">
            <Button variant={location.startsWith("/tasks") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <CheckSquare className="mr-2 h-4 w-4" />
              My Tasks
            </Button>
          </Link>
          <Link href="/goals">
            <Button variant={location.startsWith("/goals") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <Target className="mr-2 h-4 w-4" />
              Goals
            </Button>
          </Link>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Communicate</p>
        <div className="space-y-0.5">
          <Link href="/departments">
            <Button variant={location.startsWith("/departments") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <Users className="mr-2 h-4 w-4" />
              Departments
            </Button>
          </Link>
          <Link href="/channels">
            <Button variant={location.startsWith("/channels") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <Hash className="mr-2 h-4 w-4" />
              Channels
              {unreadChannelCount > 0 && (
                <Badge variant="destructive" className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">
                  {unreadChannelCount > 99 ? "99+" : unreadChannelCount}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
      {isAdmin && (
        <div className="px-3 py-2">
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-amber-500/80">Admin</p>
          <div className="space-y-0.5">
            <Link href="/admin">
              <Button variant={location.startsWith("/admin") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3 text-amber-600 hover:text-amber-600 hover:bg-amber-500/10">
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      )}
      <div className="px-3 py-2">
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
        <div className="space-y-0.5">
          <Link href="/settings">
            <Button variant={location.startsWith("/settings") ? "secondary" : "ghost"} size="sm" className="w-full justify-start h-8 px-3">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-56 border-r bg-card md:flex flex-col">
        <div className="flex h-12 items-center border-b px-4 shrink-0">
          <div className="flex items-center gap-2 font-bold text-primary">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Hash className="h-3.5 w-3.5" />
            </div>
            29 Management
          </div>
        </div>
        <ScrollArea className="flex-1 py-2">
          <NavItems />
        </ScrollArea>
        <div className="p-3 border-t shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center">
            <Activity className="w-3 h-3 mr-1" />
            API
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            {health?.status || 'checking'}
          </span>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 mr-2 h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-56 p-0 flex flex-col">
                <div className="flex h-12 items-center border-b px-4 shrink-0">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Hash className="h-3.5 w-3.5" />
                    </div>
                    29 Management
                  </div>
                </div>
                <ScrollArea className="flex-1 py-2">
                  <NavItems />
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm">29 Management</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                      <AvatarFallback className="text-xs">{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onSelect={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
