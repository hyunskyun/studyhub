import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/** 성적 추이. 등급은 낮을수록 좋으므로 축을 뒤집는다. 미입력 값은 점을 비운다(0으로 대체하지 않음). */
export function ScoreChart({ points, reversed, domain }: { points: { label: string; value?: number }[]; reversed?: boolean; domain?: [number, number] }) {
  return (
    <div className="h-56 md:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--faint)" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--faint)" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} reversed={reversed} domain={domain ?? ['auto', 'auto']} allowDecimals={false} />
          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--fg)' }} />
          <Line type="monotone" dataKey="value" name="점수" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
