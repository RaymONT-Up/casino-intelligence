import type { Metadata } from "next";
import Link from "next/link";
import { ScanLine, ArrowUpRight } from "lucide-react";
import "./globals.css";
import { indexingMode, robotsMeta } from "../lib/seo";
// Read per request so the indexing switch is not frozen at build time.
export const dynamic = "force-dynamic";
export const generateMetadata = (): Metadata => ({
  metadataBase: new URL(process.env.APP_ORIGIN ?? "http://127.0.0.1:3000"),
  title: {
    default: "Casino Intelligence — Ontario source records",
    template: "%s · Casino Intelligence",
  },
  description:
    "Ontario operator records with original sources, capture dates and document evidence.",
  robots: robotsMeta(indexingMode()),
});
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <Link className="brand" href="/">
            <ScanLine size={27} />
            <span>
              casino<span className="muted">intelligence</span>
            </span>
          </Link>
          <nav>
            <Link href="/casinos">Ontario directory</Link>
            <Link href="/workflow">Sources & method</Link>
            <Link className="nav-admin" href="/admin">
              Source workspace <ArrowUpRight size={16} />
            </Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <span>Casino Intelligence · Ontario</span>
          <Link href="/workflow">Sources & method</Link>
        </footer>
      </body>
    </html>
  );
}
