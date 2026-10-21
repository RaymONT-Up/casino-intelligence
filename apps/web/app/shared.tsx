"use client";
import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import type { PublishedResearch } from "../lib/server";
export function Directory({ records }: { records: PublishedResearch }) {
  const [query, setQuery] = useState("");
  const directory = records.find((r) => r.payload.kind === "directory");
  if (!directory || directory.payload.kind !== "directory")
    return (
      <div className="notice">
        No published directory observations yet. Collect and review a source in
        the workspace.
      </div>
    );
  const operators = directory.payload.operators.filter((operator) => {
    const searchable = [
      operator.name,
      operator.operator,
      operator.website,
      ...operator.categories,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return searchable.includes(query.trim().toLocaleLowerCase());
  });
  return (
    <div className="directory-browser">
      <div className="directory-controls">
        <label className="directory-search" htmlFor="operator-search">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search operators</span>
          <input
            id="operator-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search casino, operator or domain"
          />
        </label>
        <span className="directory-count" role="status" aria-live="polite">
          {operators.length} of {directory.payload.operators.length} records
        </span>
      </div>
      <div className="table-wrap research-table">
        <table>
          <thead>
            <tr>
              <th id="casino-column" scope="col">
                Casino / website
              </th>
              <th id="operator-column" scope="col">
                Legal operator
              </th>
              <th id="market-column" scope="col">
                Market record
              </th>
              <th id="terms-column" scope="col">
                Operator terms
              </th>
              <th id="record-column" scope="col">
                <span className="sr-only">Record</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {operators.map((operator) => {
              const terms = records.find(
                (r) =>
                  r.sourceId === `${operator.slug.replace("-bets", "")}-terms`,
              );
              return (
                <tr key={operator.slug}>
                  <td headers="casino-column">
                    <span className="mobile-cell-label" aria-hidden="true">
                      Casino / website
                    </span>
                    <Link href={`/casinos/${operator.slug}`}>
                      <strong>{operator.name}</strong>
                    </Link>
                    <small>{new URL(operator.website).hostname}</small>
                  </td>
                  <td headers="operator-column">
                    <span className="mobile-cell-label" aria-hidden="true">
                      Legal operator
                    </span>
                    {operator.operator}
                  </td>
                  <td headers="market-column">
                    <span className="mobile-cell-label" aria-hidden="true">
                      Market record
                    </span>
                    <span className="pill approved">Listed by iGO</span>
                    <small>Ontario · source dated {operator.sourceAsOf}</small>
                  </td>
                  <td headers="terms-column">
                    <span className="mobile-cell-label" aria-hidden="true">
                      Operator terms
                    </span>
                    {terms ? "Captured" : "Not checked"}
                    <small>
                      {terms ? "Terms available" : "Terms not collected"}
                    </small>
                  </td>
                  <td headers="record-column">
                    <span className="mobile-cell-label" aria-hidden="true">
                      Record
                    </span>
                    <Link
                      className="text-link"
                      href={`/casinos/${operator.slug}`}
                    >
                      Open record →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {operators.length === 0 && (
        <p className="directory-empty">No operators match “{query.trim()}”.</p>
      )}
    </div>
  );
}
export function SourceStamp({ record }: { record: PublishedResearch[number] }) {
  return (
    <div className="source-stamp">
      <a href={record.sourceUrl} target="_blank" rel="noreferrer">
        Original source ↗
      </a>
      <span>
        Captured{" "}
        {new Date(record.capturedAt)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19)}{" "}
        UTC
      </span>
      <span>
        {record.method.startsWith("playwright")
          ? "Browser capture"
          : "HTML capture"}
      </span>
    </div>
  );
}
