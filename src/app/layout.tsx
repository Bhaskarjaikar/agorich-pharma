import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import I18nProvider from "@/components/I18nProvider";
import LanguageWelcomeModal from "@/components/LanguageWelcomeModal";
// ClockSkewHandler removed - Supabase handles this automatically

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agorich Pharma - Rich In Health",
  description: "India's leading B2B pharmaceutical distribution platform offering 40% direct margin to retailers with doorstep delivery and 100% invoice guarantee.",
  keywords: "pharmaceutical, B2B, distribution, pharmacy, medicine, India, Bihar, UP, Jharkhand, Odisha",
  authors: [{ name: "Agorich Pharma" }],
  icons: {
    icon: "/agorich-logo.png",
    shortcut: "/agorich-logo.png",
    apple: "/agorich-logo.png",
  },
  openGraph: {
    title: "Agorich Pharma - Rich In Health",
    description: "India's leading B2B pharmaceutical distribution platform",
    type: "website",
    locale: "en_IN",
    images: [{
      url: "/agorich-logo.png",
      width: 400,
      height: 400,
      alt: "Agorich Pharma Logo",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agorich Pharma - Rich In Health",
    description: "India's leading B2B pharmaceutical distribution platform",
    images: ["/agorich-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <LanguageWelcomeModal />
            {children}
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
