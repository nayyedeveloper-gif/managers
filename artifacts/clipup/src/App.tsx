import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/contexts/auth-context";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Departments from "@/pages/departments";
import DepartmentDetail from "@/pages/department";
import Channels from "@/pages/channels";
import ChannelChat from "@/pages/channel";
import DMs from "@/pages/dms";
import Personal from "@/pages/personal";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import Spaces from "@/pages/spaces";
import SpaceDetail from "@/pages/space";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project";
import Tasks from "@/pages/tasks";
import Goals from "@/pages/goals";
import GoalDetail from "@/pages/goal";
import AdminPanel from "@/pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-sm text-muted-foreground">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (adminOnly && user?.role !== "admin") {
    return (
      <Route {...rest}>
        <AppLayout>
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="text-6xl">🔒</div>
            <h2 className="text-xl font-semibold">Admin Access Required</h2>
            <p className="text-muted-foreground max-w-sm">You don't have permission to view this page. Contact your administrator.</p>
          </div>
        </AppLayout>
      </Route>
    );
  }

  return (
    <Route {...rest}>
      <AppLayout>
        <Component />
      </AppLayout>
    </Route>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/login" component={Login} />
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/spaces" component={Spaces} />
            <ProtectedRoute path="/spaces/:id" component={SpaceDetail} />
            <ProtectedRoute path="/projects" component={Projects} />
            <ProtectedRoute path="/projects/:id" component={ProjectDetail} />
            <ProtectedRoute path="/tasks" component={Tasks} />
            <ProtectedRoute path="/tasks/today-overdue" component={Tasks} />
            <ProtectedRoute path="/tasks/:id" component={Tasks} />
            <ProtectedRoute path="/personal" component={Personal} />
            <ProtectedRoute path="/goals" component={Goals} />
            <ProtectedRoute path="/goals/:id" component={GoalDetail} />
            <ProtectedRoute path="/departments" component={Departments} />
            <ProtectedRoute path="/departments/:id" component={DepartmentDetail} />
            <ProtectedRoute path="/channels" component={Channels} />
            <ProtectedRoute path="/channels/:id" component={ChannelChat} />
            <ProtectedRoute path="/dms" component={DMs} />
            <ProtectedRoute path="/notifications" component={Notifications} />
            <ProtectedRoute path="/settings" component={Settings} />
            <ProtectedRoute path="/admin" component={AdminPanel} adminOnly={true} />
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
