export type MissingPlayer = { name: string; position: string; reason: string };

export default function LineupFormation({
  teamName,
  formation,
  startingXi,
  missingPlayers,
  isConfirmed,
}: {
  teamName: string;
  formation: string | null;
  startingXi: string[];
  missingPlayers: MissingPlayer[];
  isConfirmed: boolean;
}) {
  const rows = formation && startingXi.length === 11 ? buildRows(formation, startingXi) : null;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">{teamName}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isConfirmed ? "bg-accent-soft text-accent" : "bg-warning-soft text-warning"
          }`}
        >
          {isConfirmed ? `ยืนยันแล้ว${formation ? ` · ${formation}` : ""}` : "ยังไม่ยืนยันไลน์อัพ"}
        </span>
      </div>

      {rows ? (
        <div className="flex flex-col gap-2.5 rounded-lg bg-gradient-to-b from-accent-strong/15 to-accent-strong/5 p-3">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-center gap-2">
              {row.map((player) => (
                <div
                  key={player}
                  className="rounded-md bg-surface/90 px-2 py-1 text-center text-[10px] leading-tight text-text-primary ring-1 ring-border-subtle"
                >
                  {player}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-muted">ไลน์อัพยังไม่ประกาศ — คาดว่าจะยืนยันประมาณ 60 นาทีก่อนเตะ</p>
      )}

      {missingPlayers.length > 0 && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <p className="mb-1 text-[11px] font-medium text-danger">ผู้เล่นที่ขาด</p>
          <ul className="flex flex-col gap-0.5">
            {missingPlayers.map((p) => (
              <li key={p.name} className="text-[11px] text-text-secondary">
                {p.name} <span className="text-text-muted">({p.position})</span> — {p.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Splits an 11-man lineup into position rows (GK, DEF, MID..., FWD) from a "4-3-3"-style formation string. */
function buildRows(formation: string, startingXi: string[]): string[][] {
  const groupSizes = [1, ...formation.split("-").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n))];
  const rows: string[][] = [];
  let cursor = 0;
  for (const size of groupSizes) {
    rows.push(startingXi.slice(cursor, cursor + size));
    cursor += size;
  }
  return rows.reverse(); // attackers on top, goalkeeper on bottom
}
