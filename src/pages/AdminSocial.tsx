import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, LayoutDashboard, Image, Share2, MessageCircle, Send, Bot, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  features: string[];
  connected: boolean;
  setupUrl: string;
}

const platforms: PlatformConfig[] = [
  {
    id: "facebook",
    name: "Facebook + Marketplace",
    icon: "📘",
    color: "hsl(var(--primary))",
    description: "Auto-capture messages, marketplace inquiries, and sync leads to your dashboard.",
    features: ["Auto-capture messages & inquiries", "Sync to lead dashboard", "Trigger chatbot replies", "Marketplace lead capture"],
    connected: false,
    setupUrl: "https://developers.facebook.com/apps/",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    color: "hsl(var(--accent))",
    description: "Automate DMs, capture leads from conversations, and trigger comment-to-DM flows.",
    features: ["DM automation", "Comment-to-DM triggers", "Lead capture from conversations", "Story reply automation"],
    connected: false,
    setupUrl: "https://developers.facebook.com/apps/",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    color: "hsl(var(--primary))",
    description: "Capture leads from messages and comments with auto-reply capabilities.",
    features: ["Capture leads from messages/comments", "Auto-reply system", "Comment monitoring", "Lead scoring from engagement"],
    connected: false,
    setupUrl: "https://developers.tiktok.com/",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    color: "hsl(var(--primary))",
    description: "Automate outreach, capture inbound leads, and manage professional messaging.",
    features: ["Message automation", "Lead capture from inbound messages", "Connection request automation", "InMail management"],
    connected: false,
    setupUrl: "https://www.linkedin.com/developers/",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: "💬",
    color: "hsl(var(--accent))",
    description: "Real-time chat sync with lead creation and AI-powered auto-replies.",
    features: ["Real-time chat sync", "Lead creation from conversations", "AI chatbot auto-replies", "Broadcast messaging"],
    connected: false,
    setupUrl: "https://business.whatsapp.com/",
  },
];

const AdminSocial = () => {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-portal");
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!authed) return null;

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
          <p className="text-muted-foreground text-sm mt-1">Connect your social accounts to auto-capture leads, sync messages, and deploy AI chatbots across all channels.</p>
        </div>

        <Tabs defaultValue="platforms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="inbox">Unified Inbox</TabsTrigger>
            <TabsTrigger value="chatbot">AI Chatbot</TabsTrigger>
          </TabsList>

          <TabsContent value="platforms" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms.map((p) => (
                <Card key={p.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-2xl">{p.icon}</span> {p.name}
                      </CardTitle>
                      <Badge variant={p.connected ? "default" : "secondary"} className="text-xs">
                        {p.connected ? (
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1 text-xs"
                      onClick={() => window.open(p.setupUrl, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {p.connected ? "Manage Connection" : "Connect Platform"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" /> Setup Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>To fully integrate each platform, you'll need to:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs">
                  <li><strong>Create a developer app</strong> on each platform (links above)</li>
                  <li><strong>Configure webhooks</strong> to point to your GLYNOVA endpoint</li>
                  <li><strong>Add API credentials</strong> — contact Marvin at <span className="text-primary">glynova.os@gmail.com</span></li>
                  <li><strong>Test the connection</strong> by sending a test message</li>
                </ol>
                <div className="flex gap-2 mt-4">
                  <Badge variant="outline" className="text-xs">📧 pugoymarvin14@gmail.com</Badge>
                  <Badge variant="outline" className="text-xs">📱 +639630167938</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inbox" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" /> Unified Inbox
                </CardTitle>
                <CardDescription className="text-xs">All messages from connected platforms appear here. Connect a platform to get started.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-heading text-lg font-semibold text-muted-foreground">No messages yet</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Once you connect your social platforms, all incoming messages, DMs, and inquiries will appear here in a single unified view.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 gap-1" onClick={() => {
                    const tabsTrigger = document.querySelector('[data-state="inactive"][value="platforms"]') as HTMLElement;
                    tabsTrigger?.click();
                  }}>
                    <Share2 className="h-3 w-3" /> Connect a Platform
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chatbot" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" /> AI Chatbot Configuration
                </CardTitle>
                <CardDescription className="text-xs">Configure your AI chatbot to auto-reply across all connected social channels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Chatbot Persona</label>
                  <Textarea
                    placeholder="You are GLYNOVA's AI assistant. You help potential clients learn about our digital marketing services and capture lead information…"
                    rows={4}
                    className="bg-secondary border-border text-sm"
                    defaultValue="You are GLYNOVA's friendly AI assistant. Help potential clients learn about digital marketing services, answer FAQs, and collect their contact details for a follow-up call with Marvin."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Auto-Reply Trigger Words</label>
                  <Input
                    placeholder="price, services, quote, help, marketing…"
                    defaultValue="price, services, quote, help, marketing, website, social media, ads"
                    className="bg-secondary border-border text-sm"
                  />
                  <p className="text-xs text-muted-foreground">The AI chatbot will auto-reply when messages contain these keywords.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Active Channels</label>
                    <div className="space-y-1.5">
                      {platforms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" disabled={!p.connected} className="rounded border-border" />
                          <span>{p.icon} {p.name}</span>
                          {!p.connected && <Badge variant="secondary" className="text-[10px] px-1">Not connected</Badge>}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Response Settings</label>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded border-border" />
                        Auto-capture as lead
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded border-border" />
                        Send follow-up booking link
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded border-border" />
                        Notify admin on new conversation
                      </label>
                    </div>
                  </div>
                </div>

                <Button className="gap-1" disabled>
                  <Send className="h-4 w-4" /> Save Configuration
                  <Badge variant="secondary" className="ml-2 text-[10px]">Connect a platform first</Badge>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminSocial;
