import React, { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, ArrowLeft, Send, MoreVertical, UserPlus, Mail, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";

type DMConversation = {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  username: string;
  lastMessage: {
    id: number;
    content: string | null;
    senderId: number;
    createdAt: string;
  } | null;
  unreadCount: number;
};

type DMMessages = {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  senderName: string;
  senderAvatar: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  isEdited: boolean;
  reactions: { emoji: string; count: number; userIds: number[] }[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

type Member = {
  id: number;
  username: string;
  displayName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
};

export default function DMs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isNewMessageDialogOpen, setIsNewMessageDialogOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const { data: conversations, isLoading: conversationsLoading } = useQuery<DMConversation[]>({
    queryKey: ["dms-conversations", user?.id],
    queryFn: () => fetch("/api/dms/conversations").then((r) => r.json()),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: members } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  }) as { data: Member[] | undefined };

  const { data: messages, isLoading: messagesLoading } = useQuery<DMMessages[]>({
    queryKey: ["dms-messages", user?.id, selectedUserId],
    queryFn: () => fetch(`/api/dms/${selectedUserId}/messages`).then((r) => r.json()),
    enabled: !!user && !!selectedUserId,
    refetchInterval: 5000,
  });

  const filteredConversations = conversations?.filter((conv) =>
    conv.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredMembers = members?.filter((member) =>
    member.id !== user?.id &&
    (member.displayName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
     member.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
     member.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
     (member.phone && member.phone.includes(memberSearchQuery)))
  ) || [];

  const handleStartConversation = (memberId: number) => {
    setSelectedUserId(memberId);
    setIsNewMessageDialogOpen(false);
    setMemberSearchQuery("");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUserId) return;

    try {
      const response = await fetch(`/api/dms/${selectedUserId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageInput.trim(),
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["dms-messages", user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["dms-conversations", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dms-unread", user?.id] });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to send message" });
    }
  };

  const handleMarkAsRead = async (userId: number) => {
    try {
      await fetch(`/api/dms/conversations/${userId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      queryClient.invalidateQueries({ queryKey: ["dms-conversations", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dms-unread", user?.id] });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  if (selectedUserId) {
    const selectedConversation = conversations?.find((c) => c.userId === selectedUserId);
    
    return (
      <div className="h-[calc(100vh-3rem)] flex">
        {/* Conversations List - Collapsible on Desktop */}
        <div className="w-80 border-r bg-card hidden md:flex flex-col">
          <div className="p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3"
              onClick={() => setSelectedUserId(null)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to DMs
            </Button>
            <h2 className="text-xl font-bold">Direct Messages</h2>
          </div>
          <ScrollArea className="flex-1 p-2">
            {filteredConversations.map((conv) => (
              <Card
                key={conv.userId}
                className={`mb-2 cursor-pointer transition-colors hover:bg-accent ${
                  conv.userId === selectedUserId ? "bg-accent" : ""
                }`}
                onClick={() => {
                  setSelectedUserId(conv.userId);
                  if (conv.unreadCount > 0) handleMarkAsRead(conv.userId);
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.avatarUrl || undefined} alt={conv.displayName} />
                      <AvatarFallback className="text-base">{conv.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold truncate">{conv.displayName}</p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b bg-card flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSelectedUserId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-12 w-12">
              <AvatarImage src={selectedConversation?.avatarUrl || undefined} alt={selectedConversation?.displayName} />
              <AvatarFallback className="text-lg">{selectedConversation?.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{selectedConversation?.displayName}</p>
              <p className="text-xs text-muted-foreground">@{selectedConversation?.username}</p>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.senderId === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.senderId !== user?.id && (
                        <p className="text-xs font-semibold mb-1">{msg.senderName}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t bg-card">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!messageInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Direct Messages</h1>
          {conversations && conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0) > 0 && (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              {conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0)} unread
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isNewMessageDialogOpen} onOpenChange={setIsNewMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Start a new conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members by name, email, or phone..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-96 border rounded-md p-2">
                  {filteredMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {memberSearchQuery ? "No members match your search." : "No members available."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredMembers.map((member) => (
                        <Card
                          key={member.id}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleStartConversation(member.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-14 w-14">
                                <AvatarImage src={member.avatarUrl || undefined} alt={member.displayName} />
                                <AvatarFallback className="text-lg">{member.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-semibold">{member.displayName}</p>
                                  <Badge variant={member.status === "online" ? "default" : "secondary"} className="text-xs">
                                    {member.status}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{member.email}</span>
                                  </div>
                                  {member.phone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      <span>{member.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewMessageDialogOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {conversationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No direct messages yet</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "No conversations match your search." : "Start a conversation with someone!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredConversations.map((conv) => (
            <Card
              key={conv.userId}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => {
                setSelectedUserId(conv.userId);
                if (conv.unreadCount > 0) handleMarkAsRead(conv.userId);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={conv.avatarUrl || undefined} alt={conv.displayName} />
                    <AvatarFallback className="text-xl">{conv.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold">{conv.displayName}</p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage?.content || "No messages yet"}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
