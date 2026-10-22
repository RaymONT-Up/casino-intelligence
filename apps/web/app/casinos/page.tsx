import { api, type PublishedResearch } from "../../lib/server";
import { Directory } from "../shared";
import { JsonLd } from "../json-ld";
import { directoryJsonLd, indexingMode } from "../../lib/seo";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ontario operator directory",
  alternates: { canonical: "/casinos" },
};
export default async function Casinos() {
  const records = await api<PublishedResearch>("/research");
  const mode = indexingMode();
  const data = mode.on ? directoryJsonLd(mode.origin, records) : null;
  return (
    <section className="page-section">
      <p className="eyebrow">CANADA / ONTARIO</p>
      <h1>Operator directory</h1>
      <p className="lede">
        Casino websites listed by iGaming Ontario, with links to the original
        source and available operator terms.
      </p>
      {data && <JsonLd data={data} />}
      <Directory records={records} />
    </section>
  );
}
