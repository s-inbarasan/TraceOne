import type { Metadata } from 'next';
import { WorkspaceProvider } from '@/lib/context/WorkspaceContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trace One',
  description: 'AI-powered API observability & resolution platform',
  icons: {
    icon: 'https://od.lk/s/OTNfMzY2MDI0MzFfU05MNEI/TRACE-ONE-logo-300kb.png',
    shortcut: 'https://od.lk/s/OTNfMzY2MDI0MzFfU05MNEI/TRACE-ONE-logo-300kb.png',
    apple: 'https://od.lk/s/OTNfMzY2MDI0MzFfU05MNEI/TRACE-ONE-logo-300kb.png',
  },
  openGraph: {
    images: ['https://od.lk/s/OTNfMzY2MDI0MzFfU05MNEI/TRACE-ONE-logo-300kb.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-primary/30" suppressHydrationWarning>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}
