import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { CampaignProvider } from '@/lib/campaign-context'
import { ConfigCheck } from '@/components/config-check'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Email Campaign Console',
  description: 'Email campaign dashboard and templates',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <ConfigCheck />
        <CampaignProvider>
          {children}
        </CampaignProvider>
      </body>
    </html>
  )
}
