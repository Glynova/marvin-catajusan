import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, LayoutDashboard, Image, Share2, MessageCircle, Send, Bot, CheckCircle2, AlertCircle, Settings, Eye, EyeOff, Save, Loader2, Wifi, Copy, Check } from "lucide-react";
import UnifiedInbox from "@/components/UnifiedInbox";

interface SocialConnection {
  id: string;
  platform: string;
  api_key: string;
  api_secret: string;
  access_token: string;
  webhook_url: string;
  page_id: string;
  connected: boolean;
}

interface PlatformMeta {
  icon: string;
  name: string;
  description: string;
  features: string[];
  fields: { key: keyof SocialConnection; label: string; placeholder: string }[];
}

const platformMeta: Record<string, PlatformMeta> = {
  facebook: {
    icon: "📘",
    name: "Facebook + Marketplace",
    description: "Auto-capture messages, marketplace inquiries, and sync leads to your dashboard.",
    features: ["Auto-capture messages & inquiries", "Sync to lead dashboard", "Trigger chatbot replies", "Marketplace lead capture"],
    fields: [
      { key: "api_key", label: "App ID", placeholder: "Your Facebook App ID" },
      { key: "api_secret", label: "App Secret", placeholder: "Your Facebook App Secret" },
      { key: "access_token", label: "Page Access Token", placeholder: "Long-lived page access token" },
      { key: "page_id", label: "Page ID", placeholder: "Your Facebook Page ID" },
    ],
  },
  instagram: {
    icon: "📸",
    name: "Instagram",
    description: "Automate DMs, capture leads from conversations, and trigger comment-to-DM flows.",
    features: ["DM automation", "Comment-to-DM triggers", "Lead capture from conversations", "Story reply automation"],
    fields: [
      { key: "api_key", label: "App ID", placeholder: "Instagram/Meta App ID" },
      { key: "api_secret", label: "App Secret", placeholder: "Instagram/Meta App Secret" },
      { key: "access_token", label: "Access Token", placeholder: "Instagram Graph API token" },
      { key: "page_id", label: "Instagram Business Account ID", placeholder: "Your IG business account ID" },
    ],
  },
  tiktok: {
    icon: "🎵",
    name: "TikTok",
    description: "Capture leads from messages and comments with auto-reply capabilities.",
    features: ["Capture leads from messages/comments", "Auto-reply system", "Comment monitoring", "Lead scoring from engagement"],
    fields: [
      { key: "api_key", label: "Client Key", placeholder: "TikTok app client key" },
      { key: "api_secret", label: "Client Secret", placeholder: "TikTok app client secret" },
      { key: "access_token", label: "Access Token", placeholder: "TikTok access token" },
    ],
  },
  linkedin: {
    icon: "💼",
    name: "LinkedIn",
    description: "Automate outreach, capture inbound leads, and manage professional messaging.",
    features: ["Message automation", "Lead capture from inbound messages", "Connection request automation", "InMail management"],
    fields: [
      { key: "api_key", label: "Client ID", placeholder: "LinkedIn app Client ID" },
      { key: "api_secret", label: "Client Secret", placeholder: "LinkedIn app Client Secret" },
      { key: "access_token", label: "Access Token", placeholder: "LinkedIn OAuth access token" },
    ],
  },
  whatsapp: {
    icon: "💬",
    name: "WhatsApp",
    description: "Real-time chat sync with lead creation and AI-powered auto-replies.",
    features: ["Real-time chat sync", "Lead creation from conversations", "AI chatbot auto-replies", "Broadcast messaging"],
    fields: [
      { key: "api_key", label: "Phone Number ID", placeholder: "WhatsApp phone number ID" },
      { key: "api_secret", label: "Business Account ID", placeholder: "WhatsApp Business Account ID" },
      { key: "access_token", label: "Permanent Access Token", placeholder: "WhatsApp Cloud API token" },
      { key: "webhook_url", label: "Webhook Verify Token", placeholder: "Your custom verify token" },
    ],
  },
};

const AdminSocial = () => {
  const [authed, setAuthed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [editPlatform, setEditPlatform] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SocialConnection>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [chatbotPersona, setChatbotPersona] = useState("You are GLYNOVA's friendly AI assistant. Help potential clients learn about digital marketing services, answer FAQs, and collect their contact details for a follow-up call with Marvin.");
  const [triggerWords, setTriggerWords] = useState("price, services, quote, help, marketing, website, social media, ads");
  const [activeChannels, setActiveChannels] = useState<Record<string, boolean>>({});
  const [chatbotSettings, setChatbotSettings] = useState({ autoCaptureLead: true, sendBookingLink: true, notifyAdmin: true });
  const [savingChatbot, setSavingChatbot] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const WEBHOOK_BASE = `https://euwolzjbeczplmskxnpr.supabase.co/functions/v1`;
  const WEBHOOK_URL = `${WEBHOOK_BASE}/facebook-webhook`;
  const WA_WEBHOOK_URL = `${WEBHOOK_BASE}/whatsapp-webhook`;
  const IG_WEBHOOK_URL = `${WEBHOOK_BASE}/instagram-webhook`;
  const VERIFY_TOKEN = "glynova_fb_verify_2024";
  const IG_VERIFY_TOKEN = "glynova_ig_verify_2024";

  const handleTestConnection = async (platform: string) => {
    if (platform !== "facebook") {
      toast({ title: "Coming soon", description: `${platformMeta[platform]?.name} test not yet available.` });
      return;
    }
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Error", description: "Not authenticated", variant: "destructive" }); return; }

      const res = await supabase.functions.invoke("facebook-test", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) {
        toast({ title: "Connection Failed", description: res.error.message || "Could not connect", variant: "destructive" });
      } else if (res.data?.success) {
        toast({ title: "✅ Connected!", description: `Page: ${res.data.page_name} (${res.data.page_id})` });
      } else {
        toast({ title: "Connection Failed", description: res.data?.error || "Invalid credentials", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Test failed unexpectedly", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin-portal"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        navigate("/admin-portal");
        return;
      }
      setAuthed(true);
      await fetchConnections();
      await fetchChatbotConfig();
      await fetchUnreadCount();
      setLoading(false);
    };
    init();
  }, []);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("unread", true);
    setUnreadCount(count || 0);
  };

  const fetchConnections = async () => {
    const { data } = await supabase.from("social_connections").select("*");
    if (data) setConnections(data as SocialConnection[]);
  };

  const fetchChatbotConfig = async () => {
    const { data } = await supabase.from("chatbot_config").select("*").limit(1).maybeSingle();
    if (data) {
      setChatbotPersona(data.persona || "");
      const tw = data.trigger_words as string[] | null;
      setTriggerWords(tw ? tw.join(", ") : "");
      setActiveChannels((data.active_channels as Record<string, boolean>) || {});
      setChatbotSettings({ autoCaptureLead: true, sendBookingLink: true, notifyAdmin: true, ...((data.settings as Record<string, boolean>) || {}) });
    }
  };

  const handleSaveChatbot = async () => {
    setSavingChatbot(true);
    const triggerWordsArray = triggerWords.split(",").map(w => w.trim()).filter(Boolean);
    const payload = {
      persona: chatbotPersona,
      trigger_words: triggerWordsArray,
      active_channels: activeChannels,
      settings: chatbotSettings,
      updated_at: new Date().toISOString(),
    };

    // Check if config exists
    const { data: existing } = await supabase.from("chatbot_config").select("id").limit(1).maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase.from("chatbot_config").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("chatbot_config").insert(payload));
    }

    setSavingChatbot(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save chatbot config.", variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "AI Chatbot configuration saved successfully." });
    }
  };

  const openEdit = (platform: string) => {
    const conn = connections.find((c) => c.platform === platform);
    setFormData(conn || {});
    setEditPlatform(platform);
  };

  const handleSave = async () => {
    if (!editPlatform) return;
    setSaving(true);

    const hasCredentials = !!(formData.access_token && formData.access_token.trim());

    const payload = {
      platform: editPlatform,
      api_key: formData.api_key || "",
      api_secret: formData.api_secret || "",
      access_token: formData.access_token || "",
      webhook_url: formData.webhook_url || "",
      page_id: formData.page_id || "",
      connected: hasCredentials,
      updated_at: new Date().toISOString(),
    };

    // Check if row exists for this platform
    const existing = connections.find(c => c.platform === editPlatform);
    let error;
    if (existing?.id) {
      ({ error } = await supabase.from("social_connections").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("social_connections").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save credentials.", variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: `${platformMeta[editPlatform]?.name} credentials updated.` });
      setEditPlatform(null);
      await fetchConnections();
    }
  };

  const handleDisconnect = async (platform: string) => {
    await supabase
      .from("social_connections")
      .update({ api_key: "", api_secret: "", access_token: "", webhook_url: "", page_id: "", connected: false, updated_at: new Date().toISOString() })
      .eq("platform", platform);
    toast({ title: "Disconnected", description: `${platformMeta[platform]?.name} credentials removed.` });
    await fetchConnections();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-portal");
  };

  const maskValue = (val: string) => val ? "•".repeat(Math.min(val.length, 20)) + val.slice(-4) : "";

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!authed) return null;

  const getConn = (platform: string) => connections.find((c) => c.platform === platform);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="font-heading text-lg font-bold gradient-text">GLYNOVA</a>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/leads")} className="gap-1">
              <LayoutDashboard className="h-4 w-4" /> Leads
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/portfolio")} className="gap-1">
              <Image className="h-4 w-4" /> Portfolio
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/social")} className="gap-1 text-primary">
              <Share2 className="h-4 w-4" /> Social
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" /> Social Platform Integrations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Connect your social accounts by entering API credentials below.</p>
        </div>

        <Tabs defaultValue="platforms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="inbox" className="relative">
              Unified Inbox
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="chatbot">AI Chatbot</TabsTrigger>
          </TabsList>

          <TabsContent value="platforms" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(platformMeta).map(([key, p]) => {
                const conn = getConn(key);
                const isConnected = conn?.connected || false;
                return (
                  <Card key={key} className={`border-border bg-card transition-colors ${isConnected ? "border-primary/30" : "hover:border-primary/20"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="text-2xl">{p.icon}</span> {p.name}
                        </CardTitle>
                        <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                          {isConnected ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
                          ) : (
                            <><AlertCircle className="h-3 w-3 mr-1" /> Not Connected</>
                          )}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">{p.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ul className="space-y-1.5">
                        {p.features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <Button
                          variant={isConnected ? "outline" : "default"}
                          size="sm"
                          className="flex-1 gap-1 text-xs"
                          onClick={() => openEdit(key)}
                        >
                          <Settings className="h-3 w-3" />
                          {isConnected ? "Edit Credentials" : "Add Credentials"}
                        </Button>
                        {isConnected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDisconnect(key)}
                          >
                            Disconnect
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="inbox" className="space-y-4">
            <UnifiedInbox />
          </TabsContent>

          <TabsContent value="chatbot" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" /> AI Chatbot Configuration
                </CardTitle>
                <CardDescription className="text-xs">Configure your AI chatbot to auto-reply across connected channels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Chatbot Persona</label>
                  <Textarea
                    rows={4}
                    className="bg-secondary border-border text-sm"
                    value={chatbotPersona}
                    onChange={(e) => setChatbotPersona(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Auto-Reply Trigger Words</label>
                  <Input
                    value={triggerWords}
                    onChange={(e) => setTriggerWords(e.target.value)}
                    className="bg-secondary border-border text-sm"
                  />
                  <p className="text-xs text-muted-foreground">AI chatbot auto-replies when messages contain these keywords.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Active Channels</label>
                    <div className="space-y-1.5">
                      {Object.entries(platformMeta).map(([key, p]) => {
                        const isConnected = getConn(key)?.connected || false;
                        return (
                          <label key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              disabled={!isConnected}
                              checked={activeChannels[key] ?? isConnected}
                              onChange={(e) => setActiveChannels(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="rounded border-border"
                            />
                            <span>{p.icon} {p.name}</span>
                            {!isConnected && <Badge variant="secondary" className="text-[10px] px-1">Not connected</Badge>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Response Settings</label>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={chatbotSettings.autoCaptureLead} onChange={(e) => setChatbotSettings(s => ({ ...s, autoCaptureLead: e.target.checked }))} className="rounded border-border" /> Auto-capture as lead
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={chatbotSettings.sendBookingLink} onChange={(e) => setChatbotSettings(s => ({ ...s, sendBookingLink: e.target.checked }))} className="rounded border-border" /> Send follow-up booking link
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={chatbotSettings.notifyAdmin} onChange={(e) => setChatbotSettings(s => ({ ...s, notifyAdmin: e.target.checked }))} className="rounded border-border" /> Notify admin on new conversation
                      </label>
                    </div>
                  </div>
                </div>
                <Button className="gap-1" onClick={handleSaveChatbot} disabled={savingChatbot}>
                  {savingChatbot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {savingChatbot ? "Saving…" : "Save Configuration"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Credentials Dialog */}
      <Dialog open={!!editPlatform} onOpenChange={(open) => !open && setEditPlatform(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{editPlatform && platformMeta[editPlatform]?.icon}</span>
              {editPlatform && platformMeta[editPlatform]?.name} Credentials
            </DialogTitle>
          </DialogHeader>
          {editPlatform && platformMeta[editPlatform] && (
            <div className="space-y-3 mt-2">
              {platformMeta[editPlatform].fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-foreground">{field.label}</label>
                  <div className="relative">
                    <Input
                      type={showSecrets[field.key] ? "text" : "password"}
                      placeholder={field.placeholder}
                      value={(formData as any)[field.key] || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="bg-secondary border-border text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <Button onClick={handleSave} disabled={saving} className="w-full gap-1 mt-4">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save Credentials"}
              </Button>

              {/* Test Connection — Facebook only for now */}
              {editPlatform === "facebook" && getConn("facebook")?.connected && (
                <Button
                  variant="outline"
                  onClick={() => handleTestConnection("facebook")}
                  disabled={testing}
                  className="w-full gap-1"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  {testing ? "Testing…" : "Test Connection"}
                </Button>
              )}

              {/* Webhook info */}
              {(editPlatform === "facebook" || editPlatform === "whatsapp" || editPlatform === "instagram") && (
                <div className="mt-4 p-3 rounded-md bg-secondary/50 border border-border space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    {editPlatform === "facebook" ? "Facebook" : editPlatform === "whatsapp" ? "WhatsApp" : "Instagram"} Developer Settings
                  </p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Callback URL:</p>
                    <div className="flex items-center gap-1">
                      <code className="text-[11px] bg-background px-2 py-1 rounded border border-border flex-1 truncate">
                        {editPlatform === "facebook" ? WEBHOOK_URL : editPlatform === "whatsapp" ? WA_WEBHOOK_URL : IG_WEBHOOK_URL}
                      </code>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(editPlatform === "facebook" ? WEBHOOK_URL : editPlatform === "whatsapp" ? WA_WEBHOOK_URL : IG_WEBHOOK_URL)}>
                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Verify Token:</p>
                    <div className="flex items-center gap-1">
                      <code className="text-[11px] bg-background px-2 py-1 rounded border border-border flex-1">
                        {editPlatform === "facebook" ? VERIFY_TOKEN : editPlatform === "instagram" ? IG_VERIFY_TOKEN : "Your custom verify token"}
                      </code>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(editPlatform === "facebook" ? VERIFY_TOKEN : editPlatform === "instagram" ? IG_VERIFY_TOKEN : "")}>
                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Subscribe to: <strong>messages</strong>{editPlatform === "facebook" && <>, <strong>messaging_postbacks</strong></>}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSocial;
