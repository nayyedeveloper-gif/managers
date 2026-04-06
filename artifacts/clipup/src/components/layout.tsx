import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListNotifications, getListNotificationsQueryKey, useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Bell, Hash, LayoutDashboard, Settings, Users, LogOut, Menu, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const { data: notifications } = useListNotifications(
    { query: { enabled: !!user, queryKey: getListNotificationsQueryKey({ unreadOnly: true }) } }
  );

  const { data: health } = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey() }
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const NavItems = () => (
    <>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview</h2>
        <div className="space-y-1">
          <Link href="/">
            <Button variant={location === "/" ? "secondary" : "ghost"} className="w-full justify-start">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/notifications">
            <Button variant={location.startsWith("/notifications") ? "secondary" : "ghost"} className="w-full justify-start">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization</h2>
        <div className="space-y-1">
          <Link href="/departments">
            <Button variant={location.startsWith("/departments") ? "secondary" : "ghost"} className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Departments
            </Button>
          </Link>
          <Link href="/channels">
            <Button variant={location.startsWith("/channels") ? "secondary" : "ghost"} className="w-full justify-start">
              <Hash className="mr-2 h-4 w-4" />
              Channels
            </Button>
          </Link>
        </div>
      </div>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</h2>
        <div className="space-y-1">
          <Link href="/settings">
            <Button variant={location.startsWith("/settings") ? "secondary" : "ghost"} className="w-full justify-start">
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
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-card md:flex flex-col">
        <div className="flex h-14 items-center border-b px-6 shrink-0">
          <div className="flex items-center gap-2 font-bold text-primary">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Hash className="h-4 w-4" />
            </div>
            Clipup
          </div>
        </div>
        <ScrollArea className="flex-1 py-4">
          <NavItems />
        </ScrollArea>
        <div className="p-4 border-t shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center">
            <Activity className="w-3 h-3 mr-1" /> System Status
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            {health?.status || 'checking'}
          </span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
          <div className="flex items-center md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 flex flex-col">
                <div className="flex h-14 items-center border-b px-6 shrink-0">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Hash className="h-4 w-4" />
                    </div>
                    Clipup
                  </div>
                </div>
                <ScrollArea className="flex-1 py-4">
                  <NavItems />
                </ScrollArea>
                <div className="p-4 border-t shrink-0 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Activity className="w-3 h-3 mr-1" /> System Status
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {health?.status || 'checking'}
                  </span>
                </div>
              </SheetContent>
            </Sheet>
            <div className="font-semibold md:hidden">Clipup</div>
          </div>
          
          <div className="ml-auto flex items-center space-x-4">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                      <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onSelect={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/20">
          {children}
        </div>
      </main>
    </div>
  );
}
