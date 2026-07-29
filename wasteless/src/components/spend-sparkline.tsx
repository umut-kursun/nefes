"use client";

export function SpendSparkline({
  data,
  color = "#0F766E",
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  if (data.length < 2) return null;

  const w = 100;
  const h = 32;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);

  const points = data.map((value, i) => {
    const x = i * stepX;
    const y = h - ((value - min) / range) * (h - 4) - 2;
    return { x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");

  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className ?? "h-14 w-full"}
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r={2.4} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
