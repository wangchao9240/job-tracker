import "./globals.css";
import { QueryClientProvider } from "@/components/providers/QueryClientProvider";

export const metadata = {
  title: "Job Tracker",
  description: "Track your job applications with ease.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <QueryClientProvider>{children}</QueryClientProvider>
      </body>
    </html>
  );
}
