import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorHandler } from './components/ErrorBoundary';
import { Inter } from 'next/font/google'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SupaCaptions - AI-Powered Video Captions',
  description: 'Transform your videos with beautiful, precisely timed captions that highlight each word as it is spoken. Perfect for social media, accessibility, and more.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorHandler />
        {children}
      </body>
    </html>
  );
}
