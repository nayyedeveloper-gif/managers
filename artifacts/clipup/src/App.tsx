import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Departments from "@/pages/departments";
import DepartmentDetail from "@/pages/department";
import Channels from "@/pages/channels";
import ChannelChat from "@/pages/channel";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
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
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/login" component={Login} />
            <ProtectedRoute path="/" component={Dashboard} />
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
    </QueryClientProvider>
  );
}

export default App;
