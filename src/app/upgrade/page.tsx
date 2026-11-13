import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import PricingSection from "@/components/home/PricingSection";

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-[#08080a]">
      <div className="px-4 pt-4 sm:px-6 xl:px-20">
        <HomeNavbar />
      </div>
      <main>
        <PricingSection />
      </main>
      <HomeFooter />
    </div>
  );
}
