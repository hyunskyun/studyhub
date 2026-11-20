import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface SparkPoint {
  label: string
  cur: number
  prev?: number
}

/** 작은 추이 그래프: 이번 기간(강조색) + 이전 기간(회색) */
export function Sparkline({ data, format }: { data: SparkPoint[]; format?: (v: number) => string }) {
  return (
    <div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 4, bottom: 2, left: 4 }}>
            <Tooltip
              cursor={{ stroke: 'var(--line)' }}
              formatter={(v, name) => [format ? format(Number(v)) : String(v), name === 'cur' ? '이번' : '이전']}
              labelFormatter={(_, p) => (p?.[0]?.payload as SparkPoint | undefined)?.label ?? ''}
              contentStyle={{ background: 'var(--surface)', border: 'none', boxShadow: 'var(--panel-shadow)', borderRadius: 6, fontSize: 12, color: 'var(--fg)' }}
            />
            {data.some((d) => d.prev !== undefined) && (
              <Line type="linear" dataKey="prev" stroke="var(--faint)" strokeWidth={1.25} dot={false} isAnimationActive={false} />
            )}
            <Line
              type="linear"
              dataKey="cur"
              stroke="var(--accent)"
              strokeWidth={1.75}
              isAnimationActive={false}
              dot={(p: { cx?: number; cy?: number; index?: number }) =>
                p.index === data.length - 1 && p.cx !== undefined && p.cy !== undefined ? (
                  <circle key="last" cx={p.cx} cy={p.cy} r={3} fill="var(--accent)" />
                ) : (
                  <g key={p.index} />
                )
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex justify-between border-t border-line pt-1.5 text-xs text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}
