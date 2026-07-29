import type { Metadata } from 'next';
import { aprovupConfig } from '@/lib/aprovup-config';

export const metadata: Metadata = {
  metadataBase: new URL(aprovupConfig.siteUrl),
  title: {
    default: 'AprovUp — Aprovação e produção de conteúdo para agências',
    template: '%s | AprovUp',
  },
  description: aprovupConfig.description,
  keywords: aprovupConfig.keywords,
  applicationName: 'AprovUp',
  authors: [{ name: 'AprovUp' }],
  creator: 'AprovUp',
  publisher: 'AprovUp',
  alternates: {
    canonical: '/site',
  },
  openGraph: {
    title: 'AprovUp — Pare de aprovar conteúdo pelo WhatsApp',
    description:
      'Organize calendário, aprovação, IA, design, filmmaker e produção de conteúdo em uma plataforma visual para agências.',
    url: '/site',
    siteName: 'AprovUp',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/brand/aprovup-logo-oficial.png',
        width: 1200,
        height: 630,
        alt: 'AprovUp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AprovUp — Aprovação e produção de conteúdo para agências',
    description: aprovupConfig.description,
    images: ['/brand/aprovup-logo-oficial.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
