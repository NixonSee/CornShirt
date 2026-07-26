export type VerifyResult =
  | "valid"
  | "invalid"
  | "used"
  | "refunded"
  | "cancelled"
  | "owner_mismatch";

export function canCheckInTicket(
  result: VerifyResult | null,
  alreadyCheckedIn: boolean,
): boolean {
  return result === "valid" && !alreadyCheckedIn;
}
