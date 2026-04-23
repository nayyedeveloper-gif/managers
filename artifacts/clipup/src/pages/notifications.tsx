import React from "react";
import { 
  useListNotifications, getListNotificationsQueryKey,
  useMarkNotificationRead, useMarkAllNotificationsRead
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, MessageSquare, AtSign, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Notifications() {
  const { data: notifications, isLoading } = useListNotifications({});

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMarkRead = async (id: number) => {
    try {
      await markRead.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch (err) {
      // Handle error silently
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      toast({ title: "All caught up", description: "Marked all as read" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to mark all as read" });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "message": return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "mention": return <AtSign className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-amber-500" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Bell className="mr-3 h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">You have {unreadCount} unread notifications.</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" disabled={markAllRead.isPending}>
            <Check className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
          ) : notifications?.length ? (
            <div className="divide-y">
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`p-4 flex gap-4 transition-colors hover:bg-muted/30 ${!notif.isRead ? 'bg-primary/5' : ''}`}
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className={`p-2 rounded-full ${!notif.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                      {getIcon(notif.type)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className={`text-sm font-medium ${!notif.isRead ? 'text-foreground' : 'text-foreground/80'}`}>
                          {notif.title}
                        </h4>
                        <p className={`text-sm mt-0.5 ${!notif.isRead ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                          {notif.body}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {notif.channelId && (
                        <Link href={`/channels/${notif.channelId}`}>
                          <Button variant="secondary" size="sm" className="h-7 text-xs">View Channel</Button>
                        </Link>
                      )}
                      {!notif.isRead && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleMarkRead(notif.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-3 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-3" />
              <h3 className="text-lg font-medium">All caught up</h3>
              <p className="text-muted-foreground mt-1">You don't have any notifications.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
