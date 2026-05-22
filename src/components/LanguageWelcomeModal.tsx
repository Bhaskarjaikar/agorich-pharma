"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { setLocale } from "@/lib/i18n";

export default function LanguageWelcomeModal() {
  const { i18n } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Only show on home page (/) on first visit
    const checkAndShow = () => {
      if (pathname === "/") {
    const shown = localStorage.getItem("langWelcomeShown");
        console.log("🔍 Language modal check:", { pathname, shown, willShow: !shown });
    if (!shown) {
          // Add a small delay to ensure page is fully loaded
          setTimeout(() => {
            console.log("✅ Opening language modal");
      setOpen(true);
          }, 500);
        }
      } else {
        // Close modal if user navigates away from home page
        setOpen(false);
    }
    };

    checkAndShow();
  }, [pathname]);

  async function choose(lang: "en" | "hi") {
    try {
      // Set locale in storage
    setLocale(lang);
      
      // Force i18n instance to change language
      if (i18n && i18n.language !== lang) {
        await i18n.changeLanguage(lang);
      }
      
      // Update html lang attribute
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang;
      }
      
    localStorage.setItem("langWelcomeShown", "1");
      console.log("✅ Language changed to:", lang);
    setOpen(false);
    } catch (error) {
      console.error("❌ Error changing language:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm z-[9998]" />
      <DialogContent 
        className="sm:max-w-[520px] bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 border-0 shadow-2xl p-10 z-[9999]"
        showCloseButton={false}
      >
        {/* DialogTitle for accessibility - visually hidden */}
        <DialogTitle className="sr-only">
          Welcome to Agorich Pharma - Select Your Language
        </DialogTitle>
        
        {/* Welcome Messages */}
        <div className="text-center space-y-5 mb-8">
          {/* Hindi Welcome - Large & Bold */}
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Agorich Pharma में आपका स्वागत है
          </h2>
          {/* English Welcome - Slightly Smaller */}
          <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Welcome to Agorich Pharma
          </h3>
          {/* Instruction Text - Hindi */}
          <p className="text-white/90 text-base md:text-lg mt-6">
            वेबसाइट में प्रवेश करने के लिए अपनी पसंदीदा भाषा का चयन करें
          </p>
          {/* Instruction Text - English */}
          <p className="text-white/90 text-base md:text-lg">
            Select your Preferred Language to Enter the Website
          </p>
        </div>

        {/* Language Selection Buttons */}
        <div className="flex gap-4 justify-center mt-8">
          <Button
            onClick={() => choose("hi")}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xl px-10 py-7 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex-1 max-w-[220px] border-0"
          >
            हिन्दी
          </Button>
          <Button
            onClick={() => choose("en")}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xl px-10 py-7 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex-1 max-w-[220px] border-0"
          >
            English
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

