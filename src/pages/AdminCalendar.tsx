import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminNavbar from "@/components/AdminNavbar";
import GoogleCalendarWorkspace from "@/components/GoogleCalendarWorkspace";
import { Loader2 } from "lucide-react";

const AdminCalendar = () => {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin-portal");
        return;
      }

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

      setChecking(false);
    };
    verify();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Google Calendar Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sync your Google Calendars, verify free/busy windows, and schedule or update client audits.
          </p>
        </div>

        {checking ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Verifying workspace access…
          </div>
        ) : (
          <GoogleCalendarWorkspace variant="full" />
        )}
      </main>
    </div>
  );
};

export default AdminCalendar;
