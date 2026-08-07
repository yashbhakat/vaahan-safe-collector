import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://yashbhakat.github.io/vaahan-safe-collector/"),
  title: "Vaahan Safe Data Collector",
  description: "A futuristic free planner for responsible public aggregate Vaahan registration data collection. Built by Yash Jitendra Bhakat.",
  authors: [{ name: "Yash Jitendra Bhakat" }],
  creator: "Yash Jitendra Bhakat",
  openGraph: { title:"Vaahan Safe Data Collector", description:"Plan the scope, know the load, and collect carefully.", images:["/vaahan-safe-collector/og.png"] },
  twitter: { card:"summary_large_image", title:"Vaahan Safe Data Collector", description:"Free responsible Vaahan collection planner.", images:["/vaahan-safe-collector/og.png"] },
};

export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><head><meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:4173; object-src 'none'; base-uri 'none'; form-action 'none'"/><meta name="referrer" content="no-referrer"/></head><body>{children}</body></html>; }
