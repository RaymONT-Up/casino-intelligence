"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { ResearchState } from "../../lib/server";
export async function action(
  action: string,
  payload?: unknown,
  password?: string,
) {
  const response = await fetch("/api/editor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload, password }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
export function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="login-panel">
      <span className="icon-box">
        <ShieldCheck />
      </span>
      <p className="eyebrow">EDITOR ACCESS</p>
      <h1>Source workspace</h1>
      <p>Enter the editor password to review source changes.</p>
      <form
        action={(data) =>
          start(async () => {
            try {
              await action("login", undefined, String(data.get("password")));
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        <label htmlFor="password">Editor password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <button className="button dark" disabled={pending}>
          {pending ? "Signing in…" : "Enter workspace"} <ArrowRight size={16} />
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
export function SourceWorkspace({ state }: { state: ResearchState }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>();
  const [tab, setTab] = useState("pending");
  const [rationale, setRationale] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const queue = state.proposals.filter(
    (p) => tab === "all" || p.status === tab,
  );
  const proposal = queue.find((p) => p.id === selected) ?? queue[0];
  const capture = state.captures.find((c) => c.id === proposal?.captureId);
  const run = <T,>(
    work: () => Promise<T>,
    success: string | ((result: T) => string),
  ) =>
    start(async () => {
      setMessage("");
      try {
        const result = await work();
        setMessage(typeof success === "function" ? success(result) : success);
        setRationale("");
      } catch (e) {
        setMessage((e as Error).message);
      } finally {
        router.refresh();
      }
    });
  return (
    <section className="workspace research-workspace">
      <div className="workspace-title">
        <div>
          <p className="eyebrow">SOURCE OPERATIONS</p>
          <h1>Collection & review</h1>
          <p className="muted">
            Fetch the original source, inspect the observation, publish a
            reviewed change.
          </p>
        </div>
        <button
          className="text-link"
          onClick={() => run(() => action("logout"), "Signed out")}
        >
          Sign out ↗
        </button>
      </div>
      <div className="directory">
        {state.sources.map((source) => {
          const latest = state.captures.find((c) => c.sourceId === source.id);
          return (
            <section
              className="source-card"
              key={source.id}
              data-testid={`source-${source.id}`}
            >
              <p className="eyebrow">
                {source.kind === "directory"
                  ? "OFFICIAL DIRECTORY"
                  : "OPERATOR SOURCE"}
              </p>
              <h3>{source.label}</h3>
              <a href={source.url} target="_blank" rel="noreferrer">
                <code>{source.url}</code>
              </a>
              <small>
                {latest
                  ? `Last attempt: ${new Date(latest.capturedAt).toISOString()}`
                  : "Not collected yet"}
              </small>
              <small>
                {latest?.errors.length
                  ? "Last attempt needs attention"
                  : latest
                    ? "Last capture parsed successfully"
                    : ""}
              </small>
              <button
                disabled={pending}
                className="button dark"
                onClick={() =>
                  run(
                    async () => {
                      const result = await action("research-collect", {
                        sourceId: source.id,
                      });
                      if (result.errors?.length)
                        throw new Error(
                          `Capture saved with errors: ${result.errors.join("; ")}`,
                        );
                      if (result.proposal) {
                        setTab(result.proposal.status);
                        setSelected(result.proposal.id);
                      }
                      return result;
                    },
                    (result) =>
                      !result.proposal
                        ? "Source captured. No changes to review."
                        : result.proposal.status === "pending"
                          ? "Source captured. Proposal ready for review."
                          : `Source captured. Matching proposal was already ${result.proposal.status}.`,
                  )
                }
              >
                {pending ? "Working…" : "Collect source"}
              </button>
            </section>
          );
        })}
      </div>
      {message && (
        <div role="status" className="feedback">
          {message}
        </div>
      )}
      <div className="section-heading">
        <h2>Review queue</h2>
        <div className="tabs">
          {["pending", "approved", "rejected", "all"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => {
                setTab(t);
                setSelected(undefined);
                setRationale("");
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="review-layout">
        <aside className="queue">
          {queue.length === 0 && (
            <div className="empty">No proposals in this view.</div>
          )}
          {queue.map((p) => (
            <button
              className={`queue-item ${proposal?.id === p.id ? "selected" : ""}`}
              key={p.id}
              onClick={() => {
                setSelected(p.id);
                setRationale("");
              }}
            >
              <span className={`pill ${p.status}`}>{p.status}</span>
              <strong>{p.sourceId}</strong>
              <small>{p.changes.length} changed field(s)</small>
            </button>
          ))}
        </aside>
        <div className="review-detail">
          {proposal ? (
            <>
              <p className="eyebrow">PROPOSAL / {proposal.id.slice(0, 8)}</p>
              <h2>{proposal.sourceId}</h2>
              <p className="muted">
                Baseline:{" "}
                {proposal.baselineId?.slice(0, 8) ?? "First publication"}
              </p>
              {proposal.changes.map((change, i) => (
                <div className="evidence" key={i}>
                  <strong>{change.field}</strong>
                  <div className="diff-table">
                    <div className="diff-header">
                      <span>Published</span>
                      <span>Observed</span>
                    </div>
                    <div className="diff-row">
                      <pre>{JSON.stringify(change.before, null, 2)}</pre>
                      <pre>{JSON.stringify(change.after, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              ))}
              {capture && (
                <details open>
                  <summary>Capture evidence</summary>
                  <p>
                    <a
                      href={capture.observation.finalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {capture.observation.finalUrl}
                    </a>
                  </p>
                  <small>
                    Captured {new Date(capture.capturedAt).toISOString()} · HTTP{" "}
                    {capture.observation.httpStatus} ·{" "}
                    {capture.observation.method}
                  </small>
                  <small>Snapshot {capture.id}</small>
                  <small>SHA-256 {capture.contentHash}</small>
                  <small>
                    Collector region not verified. Review source scope before
                    publication.
                  </small>
                </details>
              )}
              <SavedEvidence
                key={proposal.id}
                candidate={proposal.captureId}
                baseline={proposal.baselineId}
              />
              {proposal.status === "pending" ? (
                <form onSubmit={(e) => e.preventDefault()}>
                  <label htmlFor="rationale">Decision rationale</label>
                  <textarea
                    id="rationale"
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    rows={3}
                    placeholder="Which source facts did you check?"
                  />
                  <div className="actions">
                    <button
                      className="button dark"
                      disabled={pending || rationale.trim().length < 10}
                      onClick={() =>
                        run(
                          () =>
                            action("research-review", {
                              id: proposal.id,
                              decision: "approved",
                              rationale,
                            }),
                          "Approved. Public records updated.",
                        )
                      }
                    >
                      Approve & publish
                    </button>
                    <button
                      className="button"
                      disabled={pending || rationale.trim().length < 10}
                      onClick={() =>
                        run(
                          () =>
                            action("research-review", {
                              id: proposal.id,
                              decision: "rejected",
                              rationale,
                            }),
                          "Rejected. Published records unchanged.",
                        )
                      }
                    >
                      Reject change
                    </button>
                  </div>
                </form>
              ) : (
                <p className="notice compact">
                  Decision recorded: {proposal.status}.
                </p>
              )}
            </>
          ) : (
            <div className="empty large">
              <h2>No pending change selected.</h2>
              <p>Collect a source to compare it with the published record.</p>
            </div>
          )}
        </div>
      </div>
      <div className="bottom-grid">
        <section>
          <h2>Collection history</h2>
          {state.captures.map((c) => (
            <div className="log-row" key={c.id}>
              <div>
                <strong>{c.sourceId}</strong>
                <small>{new Date(c.capturedAt).toISOString()}</small>
                <small>
                  {c.observation.method} · {c.contentHash.slice(0, 12)}
                </small>
                {c.errors.map((e) => (
                  <p className="error" key={e}>
                    {e}
                  </p>
                ))}
              </div>
              <span
                className={`pill ${c.errors.length ? "rejected" : "approved"}`}
              >
                {c.errors.length ? "failed" : "parsed"}
              </span>
            </div>
          ))}
        </section>
        <section>
          <h2>Decision history</h2>
          {state.decisions.map((d) => (
            <div className="log-row" key={d.id}>
              <div>
                <strong>
                  {d.decision} · {d.actor}
                </strong>
                <small>{d.rationale}</small>
                <small>{new Date(d.createdAt).toISOString()}</small>
              </div>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}

function SavedEvidence({
  candidate,
  baseline,
}: {
  candidate: string;
  baseline: string | null;
}) {
  const [copies, setCopies] = useState<{ id: string; text: string }[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="evidence">
      <h3>Saved source text</h3>
      <button
        className="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              setError("");
              setCopies(
                await Promise.all(
                  [...(baseline ? [baseline] : []), candidate].map((id) =>
                    action("research-evidence", { id }),
                  ),
                ),
              );
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        {pending ? "Loading copies…" : "Read saved copies"}
      </button>
      {error && <p role="alert">{error}</p>}
      {copies.map((copy) => (
        <details key={copy.id} open>
          <summary>
            {copy.id === candidate ? "Observed copy" : "Published baseline"} ·{" "}
            {copy.id.slice(0, 8)}
          </summary>
          <pre className="saved-source">{copy.text}</pre>
        </details>
      ))}
    </section>
  );
}
