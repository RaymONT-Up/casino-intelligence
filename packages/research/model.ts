export type Operator = {
  slug: string;
  name: string;
  operator: string;
  website: string;
  categories: string[];
  jurisdiction: "CA-ON";
  sourceAsOf: string;
  excerpt: string;
  locator: string;
};
export type Document = {
  title: string;
  textLength: number;
  textHash: string;
  excerpt: string;
  claims: { field: string; value: string; excerpt: string; location: string }[];
  links: { label: string; url: string }[];
  status: "observed" | "unavailable";
  reason?: string;
};
export type ResearchPayload =
  | {
      parserVersion: string;
      kind: "directory";
      operators: Operator[];
      sourceAsOf: string;
      totalListed: number;
    }
  | { parserVersion: string; kind: "document"; document: Document };
export type Observation = {
  raw: string;
  finalUrl: string;
  httpStatus: number;
  method: string;
  redirects: string[];
  error?: string;
};
export const sourceDefinitions = [
  {
    id: "igo-directory",
    label: "iGaming Ontario · operator directory",
    kind: "directory",
    url: "https://www.igamingontario.ca/en/operator/operators",
    hosts: ["www.igamingontario.ca", "igamingontario.ca"],
    rights:
      "Local factual research sample. Crown copyright, iGaming Ontario. Commercial reuse requires source-rights review.",
    operatorSlug: null,
  },
  {
    id: "northstar-home",
    label: "NorthStar Bets · operator website",
    kind: "document",
    url: "https://www.northstarbets.ca/",
    hosts: ["www.northstarbets.ca", "northstarbets.ca"],
    rights: "Operator-owned page. Short attributed evidence only.",
    operatorSlug: "northstar-bets",
  },
  {
    id: "northstar-terms",
    label: "NorthStar Bets · terms and conditions",
    kind: "document",
    url: "https://www.northstarbets.ca/terms-conditions",
    hosts: ["www.northstarbets.ca", "northstarbets.ca"],
    rights:
      "Operator-owned terms. Local capture; no republication of full terms.",
    operatorSlug: "northstar-bets",
  },
] as const;
export type SourceId = (typeof sourceDefinitions)[number]["id"];
// A deliberately bounded factual sample; not a mirror of the official directory.
export const trackedBrands = [
  "Bet99",
  "BetMGM Casino",
  "Betty",
  "NorthStar Bets",
  "888 Casino",
];
