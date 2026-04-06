import React from "react";
import { Link } from "wouter";
import { useGetDashboardStats, getGetDashboardStatsQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useGetMyTasks, getGetMyTasksQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Hash, MessageSquare, FolderKanban, Target, CheckSquare, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id || 0;

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });

  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  const { data: myTasks } = useGetMyTasks({ userId }, {
    query: { enabled: !!userId, queryKey: getGetMyTasksQueryKey({ userId }) }
  });

  const statCards = stats ? [
    { label: "Team Members", value: stats.totalUsers, sub: `${stats.onlineUsers} online`, icon: Users, color: "text-violet-500" },
    { label: "Active Projects", value: stats.activeProjects, sub: `${stats.totalProjects} total`, icon: FolderKanban, color: "text-blue-500" },
    { label: "Open Tasks", value: stats.totalTasks - stats.completedTasks, sub: `${stats.completedTasks} completed`, icon: CheckSquare, color: "text-emerald-500" },
    { label: "Goals On Track", value: stats.goalsOnTrack, sub: `${stats.totalGoals} total`, icon: Target, color: "text-amber-500" },
    { label: "Overdue Tasks", value: stats.overdueTasks, sub: "need attention", icon: Hash, color: "text-red-500" },
    { label: "Messages Today", value: stats.messagesToday, sub: `${stats.unreadNotifications} unread notifs`, icon: MessageSquare, color: "text-indigo-500" },
  ] : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Welcome back{user ? `, ${user.displayName}` : ""}. Here's your workspace overview.</p>
      </div>

      {statsLoading ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-7 w-10" />
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {statCards.map(card => (
            <Card key={card.label} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">Latest actions across your workspace</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3.5 w-4/5" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={item.actorAvatar || undefined} />
                        <AvatarFallback className="text-xs">{item.actorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{item.actorName}</span>
                          <span className="text-muted-foreground ml-1">{item.description}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          {item.type === "message" && item.targetId && (
                            <span className="ml-1">
                              in <Link href={`/channels/${item.targetId}`} className="font-medium hover:underline text-primary">a channel</Link>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
                  No recent activity yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                My Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myTasks ? (
                <div className="space-y-2">
                  {[
                    { label: "To Do", value: myTasks.todo, color: "bg-slate-100 text-slate-700" },
                    { label: "In Progress", value: myTasks.inProgress, color: "bg-blue-100 text-blue-700" },
                    { label: "In Review", value: myTasks.inReview, color: "bg-purple-100 text-purple-700" },
                    { label: "Done", value: myTasks.done, color: "bg-emerald-100 text-emerald-700" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <Badge variant="secondary" className={`text-xs font-semibold ${item.color}`}>{item.value}</Badge>
                    </div>
                  ))}
                  {myTasks.overdue > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span className="text-xs text-red-600 font-medium">{myTasks.overdue} overdue task{myTasks.overdue !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                  {myTasks.dueToday > 0 && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                      <TrendingUp className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs text-amber-600 font-medium">{myTasks.dueToday} due today</span>
                    </div>
                  )}
                  <Link href="/tasks">
                    <div className="text-xs text-primary hover:underline cursor-pointer mt-1 text-center">View all tasks →</div>
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">Loading tasks...</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {[
                { href: "/spaces", label: "Browse Spaces", icon: "🗂️" },
                { href: "/projects", label: "All Projects", icon: "📋" },
                { href: "/goals", label: "Team Goals", icon: "🎯" },
                { href: "/channels", label: "Channels", icon: "💬" },
              ].map(link => (
                <Link key={link.href} href={link.href}>
                  <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer">
                    <span className="text-base">{link.icon}</span>
                    <span className="text-sm">{link.label}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
