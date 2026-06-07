import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import I18nProvider from "@/components/I18nProvider";
import LanguageWelcomeModal from "@/components/LanguageWelcomeModal";
import FCMInitializer from "@/components/FCMInitializer";
import { AuthProvider } from "@/components/auth/AuthContext";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { DeepLinkHandler } from "@/components/mobile/DeepLinkHandler";
import { NativeAppChrome } from "@/components/mobile/NativeAppChrome";

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
  metadataBase: new URL("https://agorich-pharma.vercel.app"),
  title: "Agorich Pharma - Rich In Health",
  description: "Leading the future of healthcare. Driven by a vision to create medical marvels, Agorich Pharma provides top-tier therapeutic solutions with a rapidly growing global footprint.",
  keywords: "pharmaceutical, B2B, distribution, pharmacy, medicine, India, Bihar, UP, Jharkhand, Odisha",
  authors: [{ name: "Agorich Pharma" }],
  icons: {
    icon: "/agorich-logo.png",
    shortcut: "/agorich-logo.png",
    apple: "/agorich-logo.png",
  },
  openGraph: {
    title: "Agorich Pharma - Rich In Health",
    description: "Leading the future of healthcare. Driven by a vision to create medical marvels, Agorich Pharma provides top-tier therapeutic solutions with a rapidly growing global footprint.",
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
    description: "Leading the future of healthcare. Driven by a vision to create medical marvels, Agorich Pharma provides top-tier therapeutic solutions with a rapidly growing global footprint.",
    images: ["/agorich-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <AuthErrorBoundary>
                <LanguageWelcomeModal />
                <FCMInitializer />
                <NativeAppChrome />
                <DeepLinkHandler />
                {children}
                <Toaster />
              </AuthErrorBoundary>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
