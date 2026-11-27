import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import PortfolioSection from "@/components/PortfolioSection";
import ProcessSection from "@/components/ProcessSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import LeadCaptureSection from "@/components/LeadCaptureSection";
import FooterSection from "@/components/FooterSection";
import ChatBot from "@/components/ChatBot";

const Index = () => (
  <>
    <Navbar />
    <main>
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <PortfolioSection />
      <ProcessSection />
      <TestimonialsSection />
      <LeadCaptureSection />
    </main>
    <FooterSection />
    <ChatBot />
  </>
);

export default Index;
