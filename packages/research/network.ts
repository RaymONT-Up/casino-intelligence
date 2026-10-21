import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
export function isPublicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export async function assertPublicTarget(
  url: string,
  hosts: readonly string[],
  resolve = async (host: string) =>
    (await lookup(host, { all: true })).map((a) => a.address),
) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !hosts.includes(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.port
  )
    throw new Error("Destination outside source allowlist");
  const addresses = await resolve(parsed.hostname);
  if (
    !addresses.length ||
    addresses.some((address) => !isPublicAddress(address))
  )
    throw new Error("Source resolves to a non-public address");
  return parsed;
}
