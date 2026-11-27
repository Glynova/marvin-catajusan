import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import GoogleCalendarWorkspace from "@/components/GoogleCalendarWorkspace";

const CalendarWorkspace = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="section-container space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Portfolio
              </Link>
              <h1 className="font-heading text-3xl lg:text-4xl font-bold text-foreground">
                Google Calendar <span className="gradient-text">Workspace</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                Connect your Google Calendar to inspect availability, manage sessions, and schedule Technical &amp; Growth Audits with Google Meet links.
              </p>
            </div>
          </div>

          <GoogleCalendarWorkspace variant="full" enforceOneDayBuffer />
        </div>
      </main>
      <FooterSection />
    </div>
  );
};

export default CalendarWorkspace;
