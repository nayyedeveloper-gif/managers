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
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import Spaces from "@/pages/spaces";
import SpaceDetail from "@/pages/space";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project";
import Tasks from "@/pages/tasks";
import Goals from "@/pages/goals";
import GoalDetail from "@/pages/goal";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-sm text-muted-foreground">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
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
            <ProtectedRoute path="/goals" component={Goals} />
            <ProtectedRoute path="/goals/:id" component={GoalDetail} />
            <ProtectedRoute path="/departments" component={Departments} />
            <ProtectedRoute path="/departments/:id" component={DepartmentDetail} />
            <ProtectedRoute path="/channels" component={Channels} />
            <ProtectedRoute path="/channels/:id" component={ChannelChat} />
            <ProtectedRoute path="/notifications" component={Notifications} />
            <ProtectedRoute path="/settings" component={Settings} />
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
