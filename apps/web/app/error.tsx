"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="page-section">
      <h1>Connection needs attention.</h1>
      <p>
        The local data service is unavailable. Start PostgreSQL and the API,
        then retry.
      </p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
