export const catalog = [
  {
    id: "aurora-play",
    name: "Aurora Play",
    description:
      "Our primary fictional operator for demonstrating monitored offer changes.",
    color: "#d4f57a",
  },
  {
    id: "maple-club",
    name: "Maple Club",
    description:
      "A fictional Canadian operator. Use this record to demonstrate rejection.",
    color: "#f9c5aa",
  },
  {
    id: "northstar",
    name: "Northstar",
    description: "A fictional operator with incomplete licensing evidence.",
    color: "#c8c4f7",
  },
];
export const fixtureNames = ["v1", "v2", "v3", "invalid"] as const;
export type FixtureName = (typeof fixtureNames)[number];
export function fixture(name: FixtureName) {
  return {
    currency: name === "invalid" ? "USD" : "CAD",
    jurisdiction: "CA-ON",
    bonus: "500.00",
    wagering: name === "v1" ? "35" : name === "v2" ? "40" : "45",
    minimumDeposit: "20.00",
    licenseStatus: "not_checked",
  };
}
