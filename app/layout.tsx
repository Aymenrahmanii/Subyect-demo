import type { Metadata } from "next";
import { Archivo, Archivo_Narrow, Permanent_Marker } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin", "latin-ext"] });
const archivoNarrow = Archivo_Narrow({ variable: "--font-archivo-narrow", subsets: ["latin"], weight: ["500", "600"] });
// Grease-pencil numerals only.
const marker = Permanent_Marker({ variable: "--font-marker-face", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Reference search",
  description: "Find reference ads for a static ad concept",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoNarrow.variable} ${marker.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
