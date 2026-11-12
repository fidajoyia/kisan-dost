import "./globals.css";

export const metadata = {
  title: "Kisan Dost",
  description: "پتے کی تصویر سے فصل کی پہچان، بیماری کی ابتدائی تشخیص، لائیو موسم اور آبپاشی کا مشورہ",
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#2f6b3a" };

export default function RootLayout({ children }) {
  return (
    <html lang="ur" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@500;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
