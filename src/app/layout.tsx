import type { Metadata } from "next";

import "./globals.css";


export const metadata: Metadata = {
  title: {
    default: "AprovUp",
    template: "%s | AprovUp",
  },

  description:
    "Aprovação, produção e gestão para agências.",

  applicationName:
    "AprovUp",

  appleWebApp: {
    capable: true,
    title: "AprovUp",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}


