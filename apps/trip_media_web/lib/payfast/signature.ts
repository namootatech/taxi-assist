import { createHash } from "crypto"

export type PayfastFields = Record<string, string | number | boolean | null | undefined>

const encodePayfastValue = (value: string) => encodeURIComponent(value.trim()).replace(/%20/g, "+")

export function buildPayfastSignature(fields: PayfastFields, passphrase?: string) {
  const pairs = Object.entries(fields)
    .filter(([key, value]) => key !== "signature" && value !== undefined && value !== null && String(value) !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${encodePayfastValue(String(value))}`)

  if (passphrase) {
    pairs.push(`passphrase=${encodePayfastValue(passphrase)}`)
  }

  return createHash("md5").update(pairs.join("&")).digest("hex")
}

export function verifyPayfastSignature(fields: PayfastFields, passphrase?: string) {
  const expected = buildPayfastSignature(fields, passphrase)
  return String(fields.signature || "").toLowerCase() === expected
}
