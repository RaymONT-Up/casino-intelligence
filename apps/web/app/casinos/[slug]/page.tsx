import Link from "next/link";
import { notFound } from "next/navigation";
import { api, type PublishedResearch } from "../../../lib/server";
import { SourceStamp } from "../../shared";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: slug, alternates: { canonical: `/casinos/${slug}` } };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const records = await api<PublishedResearch>("/research");
  const directory = records.find((r) => r.payload.kind === "directory");
  if (!directory || directory.payload.kind !== "directory") notFound();
  const operator = directory.payload.operators.find((o) => o.slug === slug);
  if (!operator) notFound();
  const documents =
    slug === "northstar-bets"
      ? records.filter((r) => r.sourceId.startsWith("northstar-"))
      : [];
  return (
    <section className="page-section">
      <Link className="text-link" href="/casinos">
        ← Operator directory
      </Link>
      <p className="eyebrow">ONTARIO / SOURCE RECORD</p>
      <h1>{operator.name}</h1>
      <p className="lede">{operator.operator}</p>
      <div className="research-summary">
        <div>
          <strong>Listed by iGO</strong>
          <span>Source dated {operator.sourceAsOf}</span>
        </div>
        <div>
          <strong>Not checked</strong>
          <span>Current AGCO registration status</span>
        </div>
        <div>
          <strong>{documents.length ? "Captured" : "Not checked"}</strong>
          <span>Operator-owned sources</span>
        </div>
      </div>
      <h2>Identity & domain</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <th>Legal operator</th>
              <td>{operator.operator}</td>
            </tr>
            <tr>
              <th>Website listed by iGO</th>
              <td>
                <a href={operator.website} target="_blank" rel="noreferrer">
                  {operator.website} ↗
                </a>
              </td>
            </tr>
            <tr>
              <th>Products listed</th>
              <td>{operator.categories.join(" · ")}</td>
            </tr>
            <tr>
              <th>Jurisdiction of this record</th>
              <td>Ontario (CA-ON)</td>
            </tr>
            <tr>
              <th>Evidence location</th>
              <td>{operator.locator}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <SourceStamp record={directory} />
      <div className="section-heading">
        <h2>Operator documents</h2>
      </div>
      {documents.length ? (
        documents.map(
          (record) =>
            record.payload.kind === "document" && (
              <section className="document-card" key={record.captureId}>
                <p className="eyebrow">
                  OPERATOR SOURCE ·{" "}
                  {record.sourceId.endsWith("terms") ? "TERMS" : "WEBSITE"}
                </p>
                <h3>{record.payload.document.title}</h3>
                <SourceStamp record={record} />
                {record.payload.document.claims.map((claim) => (
                  <div className="claim" key={claim.field}>
                    <div>
                      <strong>{claim.field}</strong>
                      <span data-testid={`claim-${claim.field}`}>
                        {claim.value}
                      </span>
                    </div>
                    <blockquote>“{claim.excerpt}”</blockquote>
                    <small>
                      {claim.location} · Operator statement, not an independent
                      eligibility determination
                    </small>
                  </div>
                ))}
                <p className="muted">
                  {record.payload.document.textLength.toLocaleString()}{" "}
                  characters captured. Collector location has not been verified
                  as Ontario.
                </p>
                <details>
                  <summary>Capture evidence</summary>
                  <p>
                    Snapshot: <code>{record.captureId}</code>
                  </p>
                  <p>
                    SHA-256: <code>{record.hash}</code>
                  </p>
                  <p>
                    Publication decision recorded{" "}
                    {new Date(record.reviewedAt)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 19)}{" "}
                    UTC
                  </p>
                  <p>{record.payload.document.excerpt}</p>
                </details>
              </section>
            ),
        )
      ) : (
        <p className="notice">
          Operator terms have not been collected for this record. Wagering,
          withdrawal limits and fees are not asserted.
        </p>
      )}
    </section>
  );
}
