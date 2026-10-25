import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Siaran — Digital Signage CMS",
  description: "Kelola konten TV dan video wall dari mana saja.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${jetbrains.variable} antialiased`}
      suppressHydrationWarning
    >
      {/* Anti-flash: terapkan tema sebelum render */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="ambient-bg min-h-screen font-sans" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
