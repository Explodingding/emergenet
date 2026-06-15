import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Plant Electrical Troubleshoot — Industrial Dashboard',
  description: 'Top-down electrical network troubleshooting & fault impact analysis for industrial plants.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#07090d] text-zinc-100`}>
        {children}
      </body>
    </html>
  );
}
