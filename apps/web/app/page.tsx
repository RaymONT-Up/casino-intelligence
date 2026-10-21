import Link from "next/link";
import { api, type PublishedResearch } from "../lib/server";
import { Directory, SourceStamp } from "./shared";
export const dynamic = "force-dynamic";
export default async function Home() {
  const records = await api<PublishedResearch>("/research");
  const directory = records.find((r) => r.payload.kind === "directory");
  const count =
    directory?.payload.kind === "directory"
      ? directory.payload.operators.length
      : 0;
  return (
    <section className="page-section">
      <p className="eyebrow">CANADA / ONTARIO</p>
      <h1>Online casino operators in Ontario</h1>
      <p className="lede">
        Browse operator websites listed by iGaming Ontario. Each record links to
        its source and shows when we captured it.
      </p>
      {directory && (
        <p className="catalogue-update">
          Directory captured{" "}
          {new Date(directory.capturedAt).toLocaleDateString("en-CA", {
            timeZone: "UTC",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          . Source listing dated{" "}
          {directory.payload.kind === "directory"
            ? directory.payload.sourceAsOf
            : ""}
          .
        </p>
      )}
      <div className="section-heading">
        <h2>Casino directory{count ? ` · ${count}` : ""}</h2>
        <Link className="text-link" href="/workflow">
          Sources & collection method ↗
        </Link>
      </div>
      <Directory records={records} />
      {directory && <SourceStamp record={directory} />}
      <p className="directory-note">
        Listing information comes from iGaming Ontario. The source date and our
        capture date are shown separately. A listing does not confirm current
        registration or access from every province.
      </p>
    </section>
  );
}
