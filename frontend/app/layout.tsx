import type { Metadata } from "next";
import '@/shared/ui/styles/index.scss';
import {Layout} from '@/pagesFSD/layout';
import AntWrapper from './antWrapper';

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
      <body>
          <AntWrapper>
            <Layout>
              {children}
            </Layout>
          </AntWrapper>
      </body>
    </html>
  );
}
