import { api, type PublishedResearch } from "../../lib/server";
import { Directory } from "../shared";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ontario operator directory",
  alternates: { canonical: "/casinos" },
};
export default async function Casinos() {
  return (
    <section className="page-section">
      <p className="eyebrow">CANADA / ONTARIO</p>
      <h1>Operator directory</h1>
      <p className="lede">
        Casino websites listed by iGaming Ontario, with links to the original
        source and available operator terms.
      </p>
      <Directory records={await api<PublishedResearch>("/research")} />
    </section>
  );
}
