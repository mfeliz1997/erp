import type { Metadata } from 'next';
import './globals.css';
import { TenantProvider } from '../providers/tenant-provider';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from 'sonner';
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from '@/components/theme-provider';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Invenza ERP',
  description: 'Sistema de Gestión Multi-tenant y Facturación', // Facturación DGII (Oculto en MVP Lite)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}