"use client";

import { useState } from "react";

export default function PayoutCalculator({ combinedOdds }: { combinedOdds: number }) {
  const [stake, setStake] = useState(100);
  const payout = stake * combinedOdds;

  return (
    <div className="mt-4 rounded-xl bg-black/20 p-3">
      <p className="mb-2 text-[11px] text-text-muted">ตัวอย่างผลตอบแทน (เพื่อการวิเคราะห์เท่านั้น — ไม่ใช่การวางเดิมพันจริง)</p>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-lg bg-surface px-3 py-2 ring-1 ring-border-subtle">
          <span className="text-xs text-text-muted">฿</span>
          <input
            type="number"
            min={0}
            value={stake}
            onChange={(e) => setStake(Math.max(0, Number(e.target.value) || 0))}
            className="w-full bg-transparent text-sm text-text-primary outline-none"
          />
        </div>
        <span className="text-text-muted">→</span>
        <div className="flex-1 rounded-lg bg-surface px-3 py-2 text-right ring-1 ring-border-subtle">
          <span className="font-mono text-sm font-semibold text-accent">
            ฿{payout.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-text-muted">ถ้าถูกครบทั้ง 5 คู่ ที่ราคารวม {combinedOdds.toFixed(2)} เท่า</p>
    </div>
  );
}
