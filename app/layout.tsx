import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Sealed — Secure Ephemeral Message Sharing',
  description: 'Send and receive secure, self-destructing messages and attachments using unique 6-digit access codes.',
  openGraph: {
    title: 'Sealed — Secure Ephemeral Message Sharing',
    description: 'Send and receive secure, self-destructing messages and attachments using unique 6-digit access codes.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sealed — Secure Ephemeral Message Sharing',
    description: 'Send and receive secure, self-destructing messages and attachments using unique 6-digit access codes.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
