import { WarningRow, SuspensionRow, HistoryEntry } from "../_types";

export function buildHistoryEntries(warnings: WarningRow[], suspensions: SuspensionRow[]): HistoryEntry[] {
  const warningEntries: HistoryEntry[] = warnings.map((w) => ({
    id: `warning-${w.id}`,
    type: "warning",
    date: w.created_at || "",
    issued_by_admin: w.issued_by_admin,
    status: w.status,
    severity: w.severity,
    original: w,
  }));

  const suspensionEntries: HistoryEntry[] = suspensions.map((s) => ({
    id: `suspension-${s.id}`,
    type: "suspension",
    date: s.suspended_at,
    issued_by_admin: s.suspended_by_admin,
    status: s.status,
    severity: undefined,
    original: s,
  }));

  return [...warningEntries, ...suspensionEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}