import React, { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetChannel, getGetChannelQueryKey,
  useGetChannelMessages, getGetChannelMessagesQueryKey,
  useSendMessage, useUploadFile, useAddReaction, useDeleteMessage, useUpdateMessage,
  useGetChannelMembers, getGetChannelMembersQueryKey,
  useListUsers, getListUsersQueryKey,
  useAddChannelMember,
  useGetChannelFiles, getGetChannelFilesQueryKey,
  useUpdateChannel, useDeleteChannel
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePolling } from "@/hooks/use-polling";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, Send, Paperclip, Loader2, Download, FileText, SmilePlus, MoreVertical, Trash2, Edit2, Users, File, UserPlus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const REACTIONS = [
  { id: "thumbs_up", label: "+1" },
  { id: "heart", label: "<3" },
  { id: "laugh", label: "haha" },
  { id: "tada", label: "yay" },
  { id: "fire", label: "fire" }
];

export default function ChannelChat() {
  const { id } = useParams();
  const channelId = parseInt(id || "0", 10);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: channel } = useGetChannel(channelId, {
    query: { enabled: !!channelId, queryKey: getGetChannelQueryKey(channelId) }
  });

  const { data: messages, isLoading: isMessagesLoading } = useGetChannelMessages(channelId, {}, {
    query: { enabled: !!channelId, queryKey: getGetChannelMessagesQueryKey(channelId) }
  });

  const { data: members } = useGetChannelMembers(channelId, {
    query: { enabled: !!channelId, queryKey: getGetChannelMembersQueryKey(channelId) }
  });

  const { data: files } = useGetChannelFiles(channelId, {
    query: { enabled: !!channelId, queryKey: getGetChannelFilesQueryKey(channelId) }
  });

  const { data: allUsers } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const sendMessage = useSendMessage();
  const uploadFile = useUploadFile();
  const addReaction = useAddReaction();
  const deleteMessage = useDeleteMessage();
  const updateMessage = useUpdateMessage();
  const addMember = useAddChannelMember();
  const deleteChannel = useDeleteChannel();

  // Polling for real-time updates
  usePolling(() => {
    queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(channelId) });
  }, 3000, !!channelId);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !editingMessageId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, editingMessageId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    try {
      await sendMessage.mutateAsync({
        data: {
          content,
          senderId: user.id
        }
      });
      setContent("");
      queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(channelId) });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to send message" });
    }
  };

  const handleEdit = async (messageId: number) => {
    if (!editContent.trim()) return;
    try {
      await updateMessage.mutateAsync({
        id: messageId,
        data: { content: editContent }
      });
      setEditingMessageId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(channelId) });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update message" });
    }
  };

  const handleDelete = async (messageId: number) => {
    try {
      await deleteMessage.mutateAsync({ id: messageId });
      queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(channelId) });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to delete message" });
    }
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    if (!user) return;
    try {
      await addReaction.mutateAsync({
        id: messageId,
        data: { emoji, userId: user.id }
      });
      queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(channelId) });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to add reaction" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const uploadedFile = await uploadFile.mutateAsync({
        data: { file, channelId }
      });

      await sendMessage.mutateAsync({
        data: {
          content: `Uploaded ${file.name}`,
          fileUrl: uploadedFile.url,
          fileName: uploadedFile.filename,
          fileType: uploadedFile.mimeType,
          senderId: user.id
        }
      });

      queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(channelId) });
      queryClient.invalidateQueries({ queryKey: getGetChannelFilesQueryKey(channelId) });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to upload file" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddMember = async (userId: number) => {
    try {
      await addMember.mutateAsync({
        id: channelId,
        data: { userId }
      });
      queryClient.invalidateQueries({ queryKey: getGetChannelMembersQueryKey(channelId) });
      toast({ title: "Member added" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to add member" });
    }
  };

  const handleDeleteChannel = async () => {
    try {
      await deleteChannel.mutateAsync({ id: channelId });
      toast({ title: "Channel deleted" });
      setLocation("/channels");
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to delete channel" });
    }
  };

  const isImage = (mimeType?: string | null) => mimeType?.startsWith("image/");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-6 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">{channel?.name || "Loading..."}</h2>
            <p className="text-xs text-muted-foreground">{channel?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                {members?.length || 0}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Channel Members</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[300px] mt-4">
                <div className="space-y-4">
                  {members?.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.avatarUrl || undefined} />
                        <AvatarFallback>{m.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{m.displayName}</p>
                        <p className="text-xs text-muted-foreground">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium mb-3">Add Member</h4>
                <div className="space-y-2">
                  {allUsers?.filter(u => !members?.find(m => m.id === u.id)).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{u.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{u.displayName}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleAddMember(u.id)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <File className="h-4 w-4 mr-2" />
                Files
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Channel Files</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[400px] mt-4">
                <div className="space-y-4">
                  {files?.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-primary/10 rounded">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{file.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(file.createdAt))} ago by {file.uploaderName}
                          </p>
                        </div>
                      </div>
                      <a href={file.url} target="_blank" rel="noreferrer" className="shrink-0 ml-2">
                        <Button size="sm" variant="secondary"><Download className="h-4 w-4" /></Button>
                      </a>
                    </div>
                  ))}
                  {!files?.length && (
                    <p className="text-center text-sm text-muted-foreground py-8">No files shared yet.</p>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={handleDeleteChannel}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {isMessagesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hash className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>This is the beginning of the #{channel?.name} channel.</p>
            </div>
          ) : (
            messages?.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const isSameSender = prevMsg && prevMsg.senderId === msg.senderId && 
                new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 300000;
              const isMyMessage = user?.id === msg.senderId;

              return (
                <div key={msg.id} className={`flex gap-4 ${isSameSender ? 'mt-1' : 'mt-6'} group relative`}>
                  {!isSameSender ? (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={msg.senderAvatar || undefined} />
                      <AvatarFallback>{msg.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 shrink-0 text-right pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0 pr-12">
                    {!isSameSender && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm">{msg.senderName}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), "MMM d, HH:mm")}
                        </span>
                      </div>
                    )}
                    
                    {editingMessageId === msg.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleEdit(msg.id);
                            } else if (e.key === 'Escape') {
                              setEditingMessageId(null);
                            }
                          }}
                        />
                        <Button size="sm" onClick={() => handleEdit(msg.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        {msg.content && msg.content !== `Uploaded ${msg.fileName}` && (
                          <div className="text-sm text-foreground bg-muted/30 w-fit py-1.5 px-3 rounded-lg border border-transparent group-hover:border-border transition-colors flex items-center gap-2">
                            {msg.content}
                            {msg.isEdited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                          </div>
                        )}

                        {msg.fileUrl && (
                          <div className="mt-2 mb-1">
                            {isImage(msg.fileType) ? (
                              <div className="relative group/image max-w-sm rounded-md overflow-hidden border">
                                <img src={msg.fileUrl} alt={msg.fileName || "attachment"} className="object-cover max-h-64" />
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="absolute top-2 right-2 bg-black/50 p-1.5 rounded text-white opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-black/70">
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 p-3 bg-card border rounded-md w-fit hover:bg-muted/50 transition-colors">
                                <div className="p-2 bg-primary/10 rounded">
                                  <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium line-clamp-1 max-w-[200px]">{msg.fileName}</p>
                                  <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center mt-1">
                                    <Download className="mr-1 h-3 w-3" /> Download
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {msg.reactions.map(r => {
                              const hasReacted = user && r.userIds.includes(user.id);
                              const reactionDef = REACTIONS.find(def => def.id === r.emoji);
                              const label = reactionDef ? reactionDef.label : r.emoji;
                              return (
                                <button 
                                  key={r.emoji}
                                  onClick={() => handleReaction(msg.id, r.emoji)}
                                  className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${hasReacted ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'} transition-colors font-mono`}
                                >
                                  <span>{label}</span>
                                  <span className="font-medium">{r.count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message Actions - absolute positioned so they hover over content slightly */}
                  <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-card border rounded-md shadow-sm -mt-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <SmilePlus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit p-2" side="top" align="end">
                        <div className="flex gap-1">
                          {REACTIONS.map(reaction => (
                            <button 
                              key={reaction.id} 
                              onClick={() => handleReaction(msg.id, reaction.id)}
                              className="px-2 py-1 flex items-center justify-center hover:bg-muted rounded text-xs font-mono font-medium"
                            >
                              {reaction.label}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    {isMyMessage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditContent(msg.content);
                          }}>
                            <Edit2 className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(msg.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t shrink-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSend} className="flex gap-2">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Input 
              placeholder={`Message #${channel?.name || "channel"}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 bg-muted/50 focus-visible:bg-background"
            />
            <Button type="submit" disabled={!content.trim() && !isUploading} className="shrink-0 px-8">
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
