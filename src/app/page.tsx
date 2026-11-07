import HeroSection from "@/components/HeroSection";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#08080a]">
      <div className="px-4 pt-4 sm:px-6 xl:px-20">
        <Navbar />
      </div>
      <HeroSection />
    </div>
  );
}
