import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Romance Book Recommender",
  description: "Get personalized romance book recommendations",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
} 