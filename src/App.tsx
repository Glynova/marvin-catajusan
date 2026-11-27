import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminLeads from "./pages/AdminLeads.tsx";
import AdminPortfolio from "./pages/AdminPortfolio.tsx";
import AdminResume from "./pages/AdminResume.tsx";
import AdminSocial from "./pages/AdminSocial.tsx";
import AdminCalendar from "./pages/AdminCalendar.tsx";
import CalendarWorkspace from "./pages/CalendarWorkspace.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/calendar" element={<CalendarWorkspace />} />
          <Route path="/admin-portal" element={<AdminLogin />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/calendar" element={<AdminCalendar />} />
          <Route path="/admin/portfolio" element={<AdminPortfolio />} />
          <Route path="/admin/resume" element={<AdminResume />} />
          <Route path="/admin/social" element={<AdminSocial />} />
          <Route path="/admin/ads-intelligence" element={<Navigate to="/admin/portfolio" replace />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
