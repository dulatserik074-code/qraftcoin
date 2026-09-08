import type { Metadata } from "next";
import "./globals.css";
import "./v02.css";


export const metadata: Metadata = {
  title: "Qraft Coin — QFC",
  description: "Testnet wallet for the fixed-supply Qraft Coin token.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
