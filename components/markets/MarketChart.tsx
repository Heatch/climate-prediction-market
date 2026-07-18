"use client"

import { useId } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { MarketHistoryPoint } from "@/lib/markets/types"

interface MarketChartProps {
  history: MarketHistoryPoint[]
  compact?: boolean
}

function normalizeProbability(value: number) {
  return Math.round((value <= 1 ? value * 100 : value) * 10) / 10
}

export function MiniMarketChart({
  history,
}: {
  history: MarketHistoryPoint[]
}) {
  if (history.length < 2)
    return (
      <div className="h-8 w-24 rounded bg-neutral-100" aria-hidden="true" />
    )
  const values = history.map((point) =>
    normalizeProbability(point.yesProbability),
  )
  const width = 96
  const height = 30
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = Math.max(1, maximum - minimum)
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - 2 - ((value - minimum) / range) * (height - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-24 overflow-visible"
      role="img"
      aria-label={`YES probability trend from ${values[0]?.toFixed(0)} to ${values.at(-1)?.toFixed(0)} percent`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export default function MarketChart({
  history,
  compact = false,
}: MarketChartProps) {
  const gradientId = useId().replaceAll(":", "")
  const data = history.map((point) => ({
    timestamp: point.timestamp,
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(point.timestamp)),
    yes: normalizeProbability(point.yesProbability),
    no: normalizeProbability(point.noProbability),
  }))

  return (
    <div className={compact ? "h-36 w-full" : "h-64 w-full sm:h-72"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, bottom: 0, left: compact ? -30 : -18 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111111" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#111111" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#deded8"
            strokeDasharray="2 5"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tick={{ fill: "#73736c", fontSize: compact ? 9 : 10 }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={compact ? [25, 50, 75] : [0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fill: "#73736c", fontSize: compact ? 9 : 10 }}
          />
          {!compact && (
            <Tooltip
              labelFormatter={(_, payload) => {
                const timestamp = payload[0]?.payload?.timestamp as
                  string | undefined
                return timestamp
                  ? new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(timestamp))
                  : "Sample history"
              }}
              formatter={(value, name) => [
                `${Number(value).toFixed(0)}%`,
                String(name).toUpperCase(),
              ]}
              contentStyle={{
                border: "1px solid #d4d4cf",
                borderRadius: 12,
                background: "rgba(255,255,255,0.96)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="yes"
            name="YES"
            stroke="#111111"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={!compact}
          />
          <Area
            type="monotone"
            dataKey="no"
            name="NO"
            stroke="#8b8b84"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            fill="transparent"
            isAnimationActive={!compact}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
