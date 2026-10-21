import { trackedBrands, type Observation } from "../packages/research/model";
export function directoryHtml(operatorSuffix = "A") {
  return `<html><body><p>The listing is accurate as of September 1, 2026.</p>${trackedBrands.map((name, i) => `<div><h3>Test Operator ${i} ${operatorSuffix}</h3><ul class="operator-list-operators"><li class="operator-item"><div class="views-field-field-offerings"><ul><li>Casino</li></ul></div><div class="views-field-title-1"><a href="https://operator-${i}.example/">Play ${name}</a></div></li></ul></div>`).join("")}</body></html>`;
}
export function termsHtml(age = 19) {
  return `<html><head><title>Terms and conditions</title></head><body><h1>TERMS AND CONDITIONS</h1><h2>1.02 Eligibility and Location</h2><p>You are at least ${age} years of age.</p><p>You agree that you will only play Games while physically in Ontario using a device that is physically in Ontario.</p><p>These are test fixture terms in an isolated database. No operator terms or live data are replaced by these test values.</p></body></html>`;
}
export function observation(
  raw: string,
  url = "https://www.igamingontario.ca/en/operator/operators",
): Observation {
  return {
    raw,
    finalUrl: url,
    httpStatus: 200,
    method: "test-fixture",
    redirects: [],
  };
}
