import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "9ja Data Saver - Save Up To 70% Data",
  description: "Cheap data for all networks - MTN, Glo, Airtel, 9mobile. Subscribe once, save everyday.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "9ja Data Saver - Save Up To 70% Data",
    description: "Cheap data for all networks - MTN, Glo, Airtel, 9mobile.",
    url: "https://9jadatasaver-9jadatasaver.vercel.app/",
    siteName: "9ja Data Saver",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{margin:0}}>{children}</body>
    </html>
  )
}
