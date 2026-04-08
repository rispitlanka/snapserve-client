import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AppToaster from '@/components/common/AppToaster';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="dark:bg-gray-900 antialiased"
        style={{ fontFamily: "Inter, Outfit, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
      >
        <ThemeProvider>
          <SidebarProvider>
            {children}
            <AppToaster />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
