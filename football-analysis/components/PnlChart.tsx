type Point = { label: string; cumulativeUnits: number };

const WIDTH = 320;
const HEIGHT = 120;
const PADDING = 12;

export default function PnlChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return <p className="py-6 text-center text-xs text-text-muted">ต้องมีข้อมูลอย่างน้อย 2 วันจึงจะแสดงกราฟได้</p>;
  }

  const values = points.map((p) => p.cumulativeUnits);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;

  const xStep = (WIDTH - PADDING * 2) / (points.length - 1);
  const yFor = (v: number) => HEIGHT - PADDING - ((v - min) / range) * (HEIGHT - PADDING * 2);
  const xFor = (i: number) => PADDING + i * xStep;
  const zeroY = yFor(0);

  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.cumulativeUnits)}`).join(" ");
  const areaPoints = `${xFor(0)},${zeroY} ${linePoints} ${xFor(points.length - 1)},${zeroY}`;

  const latest = values[values.length - 1];
  const isPositive = latest >= 0;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs text-text-secondary">กำไร/ขาดทุนสะสม (ลงเท่ากันทุกบิล 1 หน่วย)</p>
        <p className={`font-mono text-sm font-semibold ${isPositive ? "text-accent" : "text-danger"}`}>
          {isPositive ? "+" : ""}
          {latest.toFixed(2)}u
        </p>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
        <line x1={PADDING} y1={zeroY} x2={WIDTH - PADDING} y2={zeroY} stroke="var(--border-subtle)" strokeWidth={1} strokeDasharray="3 3" />
        <polygon points={areaPoints} fill={isPositive ? "var(--accent)" : "var(--danger)"} opacity={0.12} />
        <polyline
          points={linePoints}
          fill="none"
          stroke={isPositive ? "var(--accent)" : "var(--danger)"}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={p.label} cx={xFor(i)} cy={yFor(p.cumulativeUnits)} r={i === points.length - 1 ? 3 : 2} fill={isPositive ? "var(--accent)" : "var(--danger)"} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-text-muted">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
