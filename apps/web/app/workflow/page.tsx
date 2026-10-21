export const metadata = { title: "Sources and collection method" };
export default function Method() {
  return (
    <section className="page-section narrow">
      <p className="eyebrow">SOURCES & METHOD</p>
      <h1>Sources and verification</h1>
      <h2>1. Operator identities</h2>
      <p>
        The iGaming Ontario directory supplies a legal operator, brand, website
        and product categories. We track five selected casino websites. The
        directory's own date is preserved separately from our capture date.
      </p>
      <p>
        <a
          className="text-link"
          href="https://www.igamingontario.ca/en/operator/operators"
        >
          iGaming Ontario directory ↗
        </a>
      </p>
      <h2>2. Operator documents</h2>
      <p>
        NorthStar's public website links to its terms. The terms page needs
        JavaScript, so a dedicated Playwright adapter loads it in Chromium. It
        waits for the eligibility section, saves the rendered document and
        extracts only explicitly matched statements. No login, account creation
        or deposits are involved.
      </p>
      <h2>3. Evidence and publication</h2>
      <p>
        PostgreSQL stores the response, final URL, capture time, hash, parser
        output and any error. A new observation is compared with the approved
        baseline. An authenticated reviewer accepts or rejects the proposal.
        Publication and the decision are committed together.
      </p>
      <h2>4. What is not established</h2>
      <p>
        Directory membership is not a live registration check. A fetched page is
        not proof that a player in Ontario can access games. The collector's
        physical region is unverified. Missing information stays unknown; we do
        not infer bonuses, payout limits, traffic or performance scores.
      </p>
      <h2>5. Source use</h2>
      <p>
        Directory facts are attributed to iGaming Ontario / Crown copyright.
        Operator documents are retained for review; public records show short
        excerpts. Commercial reuse of source material requires a rights review.
      </p>
      <p>
        <a
          href="https://www.igamingontario.ca/en/operator-player/terms-use"
          className="text-link"
        >
          iGO source terms ↗
        </a>
      </p>
      <h2>6. Updates</h2>
      <p>
        Collection currently runs on demand. New observations go to an editor
        before publication; the public record keeps the last approved version.
      </p>
    </section>
  );
}
