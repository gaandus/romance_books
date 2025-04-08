import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Romance Book Recommender",
  description: "Get personalized romance book recommendations based on your preferences",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 