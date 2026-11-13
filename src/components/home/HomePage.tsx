import CallToActionSection from "@/components/home/CallToActionSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HomeDynamicSections from "@/components/home/HomeDynamicSections";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import PricingSection from "@/components/home/PricingSection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#08080a]">
      <div className="px-4 pt-4 sm:px-6 xl:px-20">
        <HomeNavbar />
      </div>
      <main>
        <HomeDynamicSections />
        <FeaturesSection />
        <PricingSection planCtaHref="/upgrade" />
        <CallToActionSection />
      </main>
      <HomeFooter />
    </div>
  );
}
