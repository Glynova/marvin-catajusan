import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminNavbar from "@/components/AdminNavbar";
import { DEFAULT_RESUME_PROFILE, type ResumeProfile } from "@/lib/resumeConfig";
import { FileText, Save, Upload, Plus, Trash2, CheckCircle2, Loader2, ExternalLink, Mail, MapPin, Phone } from "lucide-react";

const RESUME_RECORD_TITLE = "__GLYNOVA_RESUME_SETTINGS__";

const AdminResume = () => {
  const [profile, setProfile] = useState<ResumeProfile>(DEFAULT_RESUME_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [file, setFile] = useState<File | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin-portal");
      return false;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      navigate("/admin-portal");
      return false;
    }
    return true;
  }, [navigate]);

  const saveToSupabase = useCallback(async (currentProfile: ResumeProfile, fileUrlOverride?: string) => {
    setSaving(true);
    setSaveStatus("saving");
    let fileUrl = fileUrlOverride || currentProfile.fileUrl;

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `resume-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("portfolio-media")
        .upload(path, file);

      if (uploadError) {
        toast({
          title: "File upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        setSaving(false);
        setSaveStatus("unsaved");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("portfolio-media")
        .getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    }

    const updatedProfile: ResumeProfile = {
      ...currentProfile,
      fileUrl,
    };

    const descriptionJson = JSON.stringify(updatedProfile);

    if (recordId) {
      const { error } = await supabase
        .from("portfolio_items")
        .update({ description: descriptionJson })
        .eq("id", recordId);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        setSaving(false);
        setSaveStatus("unsaved");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("portfolio_items")
        .insert({
          title: RESUME_RECORD_TITLE,
          description: descriptionJson,
          type: "file",
          media_url: fileUrl,
          order_index: -999,
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        setSaving(false);
        setSaveStatus("unsaved");
        return;
      }
      if (data) setRecordId(data.id);
    }

    setProfile(updatedProfile);
    setFile(null);
    setSaving(false);
    setSaveStatus("saved");
  }, [file, recordId, toast]);

  useEffect(() => {
    const init = async () => {
      const isAdmin = await checkAuth();
      if (!isAdmin) return;

      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("title", RESUME_RECORD_TITLE)
        .maybeSingle();

      if (!error && data) {
        setRecordId(data.id);
        if (data.description) {
          try {
            const parsed = JSON.parse(data.description) as ResumeProfile;
            setProfile({ ...DEFAULT_RESUME_PROFILE, ...parsed });
          } catch {
            // ignore
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [checkAuth]);

  const handleFieldChange = (updater: (prev: ResumeProfile) => ResumeProfile) => {
    setProfile((prev) => {
      const next = updater(prev);
      setSaveStatus("unsaved");
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveToSupabase(next);
      }, 1200);
      return next;
    });
  };

  const handleManualSave = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await saveToSupabase(profile);
    toast({
      title: "Resume saved",
      description: "Changes are live across the public resume modal.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-muted-foreground">
          Loading Resume CMS…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Resume &amp; Profile CMS
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Edit your resume details on the left and inspect the live preview on the right in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium tabular-nums flex items-center gap-1.5 text-muted-foreground">
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Saving…
                </>
              ) : saveStatus === "unsaved" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Unsaved changes
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> All changes saved
                </>
              )}
            </span>

            <Button variant="hero" size="sm" onClick={handleManualSave} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" /> Save Now
            </Button>
          </div>
        </div>

        {/* Split-Screen Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Comprehensive Form Editor */}
          <div className="lg:col-span-6 space-y-6">
            {/* Personal & Summary */}
            <div className="card-glass p-5 sm:p-6 space-y-4">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                1. Personal Details &amp; Summary
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                  <Input
                    value={profile.name}
                    onChange={(e) => handleFieldChange((p) => ({ ...p, name: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Professional Title</label>
                  <Input
                    value={profile.title}
                    onChange={(e) => handleFieldChange((p) => ({ ...p, title: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <Input
                    value={profile.email}
                    onChange={(e) => handleFieldChange((p) => ({ ...p, email: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Phone / WhatsApp</label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => handleFieldChange((p) => ({ ...p, phone: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                  <Input
                    value={profile.location}
                    onChange={(e) => handleFieldChange((p) => ({ ...p, location: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Download Button Label</label>
                  <Input
                    value={profile.buttonLabel}
                    onChange={(e) => handleFieldChange((p) => ({ ...p, buttonLabel: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Website URL</label>
                  <Input
                    value={profile.website}
                    onChange={(e) => handleFieldChange((p) => ({ ...p, website: e.target.value }))}
                    className="bg-secondary border-border"
                    placeholder="https://glynova.dev"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Executive Summary</label>
                <Textarea
                  rows={3}
                  value={profile.summary}
                  onChange={(e) => handleFieldChange((p) => ({ ...p, summary: e.target.value }))}
                  className="bg-secondary border-border"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Upload PDF Resume Document</label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    if (e.target.files?.[0]) {
                      setTimeout(() => saveToSupabase(profile), 300);
                    }
                  }}
                  className="bg-secondary border-border"
                />
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  Current file: {profile.fileUrl ? profile.fileUrl.split("/").pop() : "None"}
                </p>
              </div>
            </div>

            {/* Experience Editor */}
            <div className="card-glass p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  2. Professional Experience
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFieldChange((p) => ({
                      ...p,
                      experiences: [
                        ...p.experiences,
                        { role: "New Role", company: "Company", period: "2026", location: "Remote", highlights: ["Highlight 1"] },
                      ],
                    }))
                  }
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Experience
                </Button>
              </div>

              <div className="space-y-4">
                {profile.experiences.map((exp, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-secondary/40 border border-border space-y-3">
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Role"
                        value={exp.role}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange((p) => {
                            const exps = [...p.experiences];
                            exps[idx].role = val;
                            return { ...p, experiences: exps };
                          });
                        }}
                        className="bg-secondary border-border text-xs"
                      />
                      <Input
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange((p) => {
                            const exps = [...p.experiences];
                            exps[idx].company = val;
                            return { ...p, experiences: exps };
                          });
                        }}
                        className="bg-secondary border-border text-xs"
                      />
                      <Input
                        placeholder="Period"
                        value={exp.period}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange((p) => {
                            const exps = [...p.experiences];
                            exps[idx].period = val;
                            return { ...p, experiences: exps };
                          });
                        }}
                        className="bg-secondary border-border text-xs tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Highlights (one per line)</label>
                      <Textarea
                        rows={3}
                        value={exp.highlights.join("\n")}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange((p) => {
                            const exps = [...p.experiences];
                            exps[idx].highlights = val.split("\n").filter(Boolean);
                            return { ...p, experiences: exps };
                          });
                        }}
                        className="bg-secondary border-border text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleFieldChange((p) => ({
                          ...p,
                          experiences: p.experiences.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-destructive hover:text-destructive h-7 text-xs gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove Experience
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Editor */}
            <div className="card-glass p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  3. Skills Matrix
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFieldChange((p) => ({
                      ...p,
                      skills: [...p.skills, { category: "New Skill Group", items: ["Skill 1", "Skill 2"] }],
                    }))
                  }
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Skill Group
                </Button>
              </div>

              <div className="space-y-3">
                {profile.skills.map((sg, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-secondary/30 border border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={sg.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange((p) => {
                            const skills = [...p.skills];
                            skills[idx].category = val;
                            return { ...p, skills };
                          });
                        }}
                        className="bg-secondary border-border text-xs font-semibold"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleFieldChange((p) => ({
                            ...p,
                            skills: p.skills.filter((_, i) => i !== idx),
                          }))
                        }
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Comma-separated items (React, TypeScript, Node.js)"
                      value={sg.items.join(", ")}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleFieldChange((p) => {
                          const skills = [...p.skills];
                          skills[idx].items = val.split(",").map((s) => s.trim()).filter(Boolean);
                          return { ...p, skills };
                        });
                      }}
                      className="bg-secondary border-border text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Education Editor */}
            <div className="card-glass p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  4. Education
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleFieldChange((p) => ({
                      ...p,
                      education: [...p.education, { degree: "Degree / Program", institution: "Institution", year: "2020" }],
                    }))
                  }
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Education
                </Button>
              </div>

              <div className="space-y-3">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-secondary/30 border border-border space-y-2">
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Degree / Program"
                        value={edu.degree}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange((p) => {
                            const edus = [...p.education];
                            edus[idx].degree = val;
                            return { ...p, education: edus };
                          });
                        }}
                        className="bg-secondary border-border text-xs"
                      />
                      <Input
                        placeholder="Institution"
                        value={edu.institution}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange((p) => {
                            const edus = [...p.education];
                            edus[idx].institution = val;
                            return { ...p, education: edus };
                          });
                        }}
                        className="bg-secondary border-border text-xs"
                      />
                      <Input
                        placeholder="Year"
                        value={edu.year}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange((p) => {
                            const edus = [...p.education];
                            edus[idx].year = val;
                            return { ...p, education: edus };
                          });
                        }}
                        className="bg-secondary border-border text-xs tabular-nums"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleFieldChange((p) => ({
                          ...p,
                          education: p.education.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-destructive hover:text-destructive h-7 text-xs gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove Education
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Sticky Resume Preview Card */}
          <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live Visitor Preview
              </span>
              <span className="text-xs text-primary font-medium">
                Auto-syncing active
              </span>
            </div>

            <div className="card-glass p-6 sm:p-8 space-y-6 bg-card border border-border shadow-xl">
              <div className="border-b border-border pb-5">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  {profile.name || "Your Name"}
                </h2>
                <p className="text-xs text-primary font-medium mt-1">
                  {profile.title || "Professional Title"}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-3">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-primary" /> {profile.email}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary" /> {profile.phone}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {profile.location}
                  </span>
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>

              {/* Summary Preview */}
              <div className="space-y-1.5">
                <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
                  Executive Summary
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {profile.summary || "Summary goes here…"}
                </p>
              </div>

              {/* Experience Preview */}
              <div className="space-y-3">
                <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
                  Professional Experience
                </h4>
                <div className="space-y-3">
                  {profile.experiences.map((exp, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span>{exp.role} · {exp.company}</span>
                        <span className="text-muted-foreground tabular-nums text-[11px]">{exp.period}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
                        {exp.highlights.map((h, hi) => (
                          <li key={hi}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills Preview */}
              <div className="space-y-2">
                <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
                  Skills Matrix
                </h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {profile.skills.map((sg, si) => (
                    <div key={si} className="p-2.5 rounded bg-secondary/30 border border-border text-[11px]">
                      <p className="font-semibold text-foreground">{sg.category}</p>
                      <p className="text-muted-foreground truncate">{sg.items.join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education Preview */}
              {profile.education && profile.education.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
                    Education
                  </h4>
                  <div className="space-y-1.5">
                    {profile.education.map((edu, ei) => (
                      <div key={ei} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          <strong className="text-foreground">{edu.degree}</strong> — {edu.institution}
                        </span>
                        <span className="tabular-nums">{edu.year}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminResume;
