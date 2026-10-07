import type { Metadata } from "next";

import {
  DeploymentVersionGuard,
} from "@/components/system/DeploymentVersionGuard";

import { getLocale } from "@/lib/i18n-server";

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


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale =
    await getLocale();

  return (
    <html
      lang={locale}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <DeploymentVersionGuard />
        {children}
      </body>
    </html>
  );
}