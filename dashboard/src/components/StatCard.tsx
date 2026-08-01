interface StatCardProps {
  label: string;
  value: string;
  accent?: "default" | "warn" | "fail";
}

export function StatCard({
  label,
  value,
  accent = "default",
}: StatCardProps) {
  return (
    <div className={`stat-card stat-${accent}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
