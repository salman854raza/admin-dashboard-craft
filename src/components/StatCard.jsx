export default function StatCard({ label, value, sublabel }) {
  return (
    <div className="bg-white border border-line rounded-lg p-5">
      <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
      <div className="text-3xl font-serif mt-2">{value ?? '—'}</div>
      {sublabel && <div className="text-xs text-ink/40 mt-1">{sublabel}</div>}
    </div>
  )
}
