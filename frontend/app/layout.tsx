import type { Metadata } from "next";
import {Roboto} from 'next/font/google';
const inter = Roboto({ subsets: ["latin", 'cyrillic'], weight: '400' });
import '@/shared/ui/styles/index.scss';
import {Layout} from '@/pagesFSD/layout';

export const metadata: Metadata = {
  title: "Interests",
  description: "Interests",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Layout>
            {children}
        </Layout>
      </body>
    </html>
  );
}
