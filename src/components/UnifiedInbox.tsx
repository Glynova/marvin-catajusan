import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageCircle, Send, Search, User, Tag, Clock,
  Facebook, Instagram, Linkedin, MessageSquare
} from "lucide-react";

interface Conversation {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  platform: string;
  last_message: string;
  unread: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: string;
  message_text: string;
  platform: string;
  created_at: string;
}

const platformIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  facebook: { icon: <Facebook className="h-3 w-3" />, color: "text-blue-500" },
  instagram: { icon: <Instagram className="h-3 w-3" />, color: "text-pink-500" },
  whatsapp: { icon: <MessageCircle className="h-3 w-3" />, color: "text-green-500" },
  tiktok: { icon: <MessageSquare className="h-3 w-3" />, color: "text-foreground" },
  linkedin: { icon: <Linkedin className="h-3 w-3" />, color: "text-blue-700" },
};

const tagOptions = ["Lead", "Interested", "Follow-up", "Purchased", "VIP"];

const UnifiedInbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        fetchConversations();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (selectedConvo && newMsg.conversation_id === selectedConvo.id) {
          setMessages((prev) => [...prev, newMsg]);
        }
        // Show notification toast for incoming client messages
        if (newMsg.sender === "client") {
          toast({
            title: `💬 New message on ${newMsg.platform || "chat"}`,
            description: newMsg.message_text.slice(0, 80) + (newMsg.message_text.length > 80 ? "…" : ""),
          });
        }
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data.map(c => ({ ...c, tags: (c.tags as string[]) || [] })));
  };

  const selectConversation = async (convo: Conversation) => {
    setSelectedConvo(convo);
    // Mark as read
    if (convo.unread) {
      await supabase.from("conversations").update({ unread: false }).eq("id", convo.id);
    }
    // Fetch messages
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConvo) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConvo.id,
      sender: "admin",
      message_text: replyText.trim(),
      platform: selectedConvo.platform,
    });
    if (!error) {
      await supabase.from("conversations").update({
        last_message: replyText.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", selectedConvo.id);
      setReplyText("");
    } else {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
    setSending(false);
  };

  const toggleTag = async (convo: Conversation, tag: string) => {
    const currentTags = convo.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    await supabase.from("conversations").update({ tags: newTags }).eq("id", convo.id);
    if (selectedConvo?.id === convo.id) {
      setSelectedConvo({ ...convo, tags: newTags });
    }
    fetchConversations();
  };

  const filteredConvos = conversations.filter(c =>
    c.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  const getPlatformInfo = (platform: string) =>
    platformIcons[platform] || { icon: <MessageCircle className="h-3 w-3" />, color: "text-muted-foreground" };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
      <div className="grid grid-cols-12 h-full">
        {/* LEFT PANEL: Conversations List */}
        <div className="col-span-4 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-secondary border-border"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-xs text-muted-foreground">No conversations yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Messages from connected platforms will appear here</p>
              </div>
            ) : (
              filteredConvos.map((convo) => {
                const pi = getPlatformInfo(convo.platform);
                return (
                  <button
                    key={convo.id}
                    onClick={() => selectConversation(convo)}
                    className={`w-full text-left p-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${
                      selectedConvo?.id === convo.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {convo.sender_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium truncate ${convo.unread ? "text-foreground" : "text-muted-foreground"}`}>
                            {convo.sender_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{formatTime(convo.updated_at)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={pi.color}>{pi.icon}</span>
                          <p className={`text-[11px] truncate ${convo.unread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {convo.last_message || "No messages"}
                          </p>
                        </div>
                        {convo.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {convo.tags.map(t => (
                              <Badge key={t} variant="secondary" className="text-[9px] px-1 py-0 h-4">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {convo.unread && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* CENTER PANEL: Message Thread */}
        <div className={`${selectedConvo ? "col-span-5" : "col-span-8"} flex flex-col`}>
          {selectedConvo ? (
            <>
              {/* Chat header */}
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {selectedConvo.sender_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium">{selectedConvo.sender_name}</p>
                  <div className="flex items-center gap-1">
                    <span className={getPlatformInfo(selectedConvo.platform).color}>
                      {getPlatformInfo(selectedConvo.platform).icon}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{selectedConvo.platform}</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                          msg.sender === "admin"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        <p>{msg.message_text}</p>
                        <p className={`text-[9px] mt-1 ${msg.sender === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply input */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                    className="text-xs h-8 bg-secondary border-border"
                  />
                  <Button size="sm" className="h-8 px-3 gap-1" onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <h3 className="text-sm font-medium text-muted-foreground">Select a conversation</h3>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Click on a sender to view their messages</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Lead Info */}
        {selectedConvo && (
          <div className="col-span-3 border-l border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-medium flex items-center gap-1"><User className="h-3 w-3" /> Contact Info</p>
            </div>
            <div className="p-3 space-y-4">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-12 w-12 mb-2">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {selectedConvo.sender_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium">{selectedConvo.sender_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={getPlatformInfo(selectedConvo.platform).color}>
                    {getPlatformInfo(selectedConvo.platform).icon}
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize">{selectedConvo.platform}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">ID: {selectedConvo.sender_id}</p>
              </div>

              <div>
                <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {tagOptions.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(selectedConvo, tag)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        selectedConvo.tags.includes(tag)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" /> Timeline
                </p>
                <p className="text-[10px] text-muted-foreground">
                  First contact: {new Date(selectedConvo.created_at || "").toLocaleDateString()}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Last message: {formatTime(selectedConvo.updated_at)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Messages: {messages.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedInbox;
