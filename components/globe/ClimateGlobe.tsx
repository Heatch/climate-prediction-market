"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import type { Feature, Geometry } from "geojson"
import { feature } from "topojson-client"
import type { GeometryObject, Objects, Topology } from "topojson-specification"
import landTopology from "world-atlas/land-110m.json"

import {
  CONTINENTS,
  REGION_CENTERS,
  closestContinent,
  isContinentName,
} from "@/lib/geo/regions"
import type { ClimateMarket } from "@/lib/markets/types"

type Projection = d3.GeoProjection

type RenderedCluster = {
  x: number
  y: number
  markets: ClimateMarket[]
}

type PointerState = {
  x: number
  y: number
  startX: number
  startY: number
}

interface ClimateGlobeProps {
  markets: ClimateMarket[]
  selectedRegion: string | null
  selectedMarketId?: string | null
  onRegionSelect: (region: string) => void
  onMarketSelect: (market: ClimateMarket) => void
  className?: string
}

const DEFAULT_ROTATION: [number, number, number] = [20, -12, 0]
const MIN_ZOOM = 0.68
const MAX_ZOOM = 2.35
const IDLE_DELAY_MS = 3200

function makeLandFeature(): Feature<Geometry> {
  const topology = landTopology as unknown as Topology<
    Objects<Record<string, never>>
  >
  const geometry = topology.objects.land as GeometryObject<
    Record<string, never>
  >
  const converted = feature(topology, geometry)
  if (converted.type === "FeatureCollection") {
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "GeometryCollection",
        geometries: converted.features.map((item) => item.geometry),
      },
    }
  }
  return converted as Feature<Geometry>
}

const LAND = makeLandFeature()

function createLandDots(): Array<[number, number]> {
  const dots: Array<[number, number]> = []
  // This preserves the supplied globe's halftone-land technique while keeping
  // Natural Earth data local, so the core interface does not depend on GitHub.
  for (let latitude = -84; latitude <= 84; latitude += 3) {
    const longitudeOffset = Math.abs(latitude % 6) === 3 ? 1.5 : 0
    for (
      let longitude = -180 + longitudeOffset;
      longitude < 180;
      longitude += 3
    ) {
      if (d3.geoContains(LAND, [longitude, latitude]))
        dots.push([longitude, latitude])
    }
  }
  return dots
}

const LAND_DOTS = createLandDots()

function isVisible(projection: Projection, coordinates: [number, number]) {
  const [rotateLongitude, rotateLatitude] = projection.rotate()
  return (
    d3.geoDistance([-rotateLongitude, -rotateLatitude], coordinates) <
    Math.PI / 2
  )
}

function easeInOut(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

export default function ClimateGlobe({
  markets,
  selectedRegion,
  selectedMarketId,
  onRegionSelect,
  onMarketSelect,
  className = "",
}: ClimateGlobeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const projectionRef = useRef<Projection | null>(null)
  const rotationRef = useRef<[number, number, number]>([...DEFAULT_ROTATION])
  const baseRadiusRef = useRef(200)
  const zoomRef = useRef(1)
  const clustersRef = useRef<RenderedCluster[]>([])
  const marketsRef = useRef(markets)
  const selectedRegionRef = useRef(selectedRegion)
  const selectedMarketIdRef = useRef(selectedMarketId)
  const idleUntilRef = useRef(0)
  const focusAnimationRef = useRef<{
    startedAt: number
    from: [number, number, number]
    to: [number, number, number]
  } | null>(null)
  const pointersRef = useRef(new Map<number, PointerState>())
  const pinchDistanceRef = useRef<number | null>(null)
  const draggedRef = useRef(false)
  const callbacksRef = useRef({ onRegionSelect, onMarketSelect })
  const [isReady, setIsReady] = useState(false)
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)

  useEffect(() => {
    marketsRef.current = markets
    selectedRegionRef.current = selectedRegion
    selectedMarketIdRef.current = selectedMarketId
    callbacksRef.current = { onRegionSelect, onMarketSelect }
  }, [
    markets,
    onMarketSelect,
    onRegionSelect,
    selectedMarketId,
    selectedRegion,
  ])

  const marketCounts = useMemo(
    () =>
      new Map(
        CONTINENTS.map((continent) => [
          continent,
          markets.filter(
            (market) =>
              market.continent === continent && market.status === "open",
          ).length,
        ]),
      ),
    [markets],
  )

  const pauseRotation = useCallback(() => {
    idleUntilRef.current = performance.now() + IDLE_DELAY_MS
  }, [])

  const focusRegion = useCallback((region: string) => {
    if (!isContinentName(region)) return
    const [longitude, latitude] = REGION_CENTERS[region]
    focusAnimationRef.current = {
      startedAt: performance.now(),
      from: [...rotationRef.current],
      to: [-longitude, -latitude, 0],
    }
    idleUntilRef.current = performance.now() + IDLE_DELAY_MS + 900
  }, [])

  useEffect(() => {
    if (selectedRegion) focusRegion(selectedRegion)
  }, [focusRegion, selectedRegion])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const context = canvas.getContext("2d")
    if (!context) return

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    )
    const projection = d3.geoOrthographic().clipAngle(90).precision(0.3)
    projectionRef.current = projection
    let width = 0
    let height = 0
    let animationFrame = 0
    let lastFrame = performance.now()

    const resize = () => {
      const rectangle = wrapper.getBoundingClientRect()
      width = Math.max(280, rectangle.width)
      height = Math.max(
        360,
        Math.min(rectangle.width * 0.82, rectangle.height || 680),
      )
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      baseRadiusRef.current = Math.max(125, Math.min(width, height) * 0.39)
      projection
        .translate([width / 2, height / 2])
        .scale(baseRadiusRef.current * zoomRef.current)
        .rotate(rotationRef.current)
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      const radius = projection.scale()
      const center = projection.translate()
      const scaleFactor = radius / Math.max(1, baseRadiusRef.current)
      const path = d3.geoPath(projection, context)

      context.save()
      context.beginPath()
      context.arc(center[0], center[1], radius, 0, Math.PI * 2)
      context.fillStyle = "#101010"
      context.shadowColor = "rgba(0, 0, 0, 0.22)"
      context.shadowBlur = 34
      context.shadowOffsetY = 16
      context.fill()
      context.shadowColor = "transparent"
      context.strokeStyle = "#4a4a47"
      context.lineWidth = Math.max(0.75, 1.1 * scaleFactor)
      context.stroke()
      context.clip()

      context.beginPath()
      path(d3.geoGraticule10())
      context.strokeStyle = "rgba(255, 255, 255, 0.09)"
      context.lineWidth = Math.max(0.5, 0.65 * scaleFactor)
      context.stroke()

      if (
        selectedRegionRef.current &&
        isContinentName(selectedRegionRef.current)
      ) {
        const centerPoint = REGION_CENTERS[selectedRegionRef.current]
        const highlight = d3
          .geoCircle()
          .center([centerPoint[0], centerPoint[1]])
          .radius(17)()
        context.beginPath()
        path(highlight)
        context.fillStyle = "rgba(255, 255, 255, 0.08)"
        context.fill()
        context.strokeStyle = "rgba(255, 255, 255, 0.5)"
        context.lineWidth = 1
        context.stroke()
      }

      context.beginPath()
      path(LAND)
      context.strokeStyle = "rgba(255, 255, 255, 0.4)"
      context.lineWidth = Math.max(0.45, 0.72 * scaleFactor)
      context.stroke()

      context.fillStyle = "rgba(255, 255, 255, 0.56)"
      const dotRadius = Math.max(0.62, Math.min(1.45, 0.82 * scaleFactor))
      for (const coordinates of LAND_DOTS) {
        if (!isVisible(projection, coordinates)) continue
        const point = projection(coordinates)
        if (!point) continue
        context.beginPath()
        context.arc(point[0], point[1], dotRadius, 0, Math.PI * 2)
        context.fill()
      }

      const projectedMarkets = marketsRef.current
        .filter((market) => market.status === "open")
        .flatMap((market) => {
          const coordinates: [number, number] = [
            market.longitude,
            market.latitude,
          ]
          if (!isVisible(projection, coordinates)) return []
          const point = projection(coordinates)
          return point ? [{ market, x: point[0], y: point[1] }] : []
        })

      const clusters: RenderedCluster[] = []
      for (const projectedMarket of projectedMarkets) {
        const nearby = clusters.find(
          (cluster) =>
            Math.hypot(
              cluster.x - projectedMarket.x,
              cluster.y - projectedMarket.y,
            ) < 24,
        )
        if (nearby) {
          const count = nearby.markets.length
          nearby.x = (nearby.x * count + projectedMarket.x) / (count + 1)
          nearby.y = (nearby.y * count + projectedMarket.y) / (count + 1)
          nearby.markets.push(projectedMarket.market)
        } else {
          clusters.push({
            x: projectedMarket.x,
            y: projectedMarket.y,
            markets: [projectedMarket.market],
          })
        }
      }
      clustersRef.current = clusters

      for (const cluster of clusters) {
        const selected = cluster.markets.some(
          (market) => market.id === selectedMarketIdRef.current,
        )
        const circleRadius = cluster.markets.length > 1 ? 10 : 7
        context.beginPath()
        context.arc(
          cluster.x,
          cluster.y,
          circleRadius + (selected ? 4 : 2),
          0,
          Math.PI * 2,
        )
        context.fillStyle = selected
          ? "rgba(255, 255, 255, 0.25)"
          : "rgba(255, 255, 255, 0.12)"
        context.fill()
        context.beginPath()
        context.arc(cluster.x, cluster.y, circleRadius, 0, Math.PI * 2)
        context.fillStyle = selected ? "#ffffff" : "#d8d8d2"
        context.fill()
        context.strokeStyle = "#111111"
        context.lineWidth = 2
        context.stroke()
        if (cluster.markets.length > 1) {
          context.fillStyle = "#111111"
          context.font = "700 9px Inter, system-ui, sans-serif"
          context.textAlign = "center"
          context.textBaseline = "middle"
          context.fillText(
            String(cluster.markets.length),
            cluster.x,
            cluster.y + 0.5,
          )
        }
      }
      context.restore()
    }

    const tick = (now: number) => {
      const elapsed = Math.min(50, now - lastFrame)
      lastFrame = now
      const focusAnimation = focusAnimationRef.current
      if (focusAnimation) {
        const progress = Math.min(1, (now - focusAnimation.startedAt) / 800)
        const eased = easeInOut(progress)
        rotationRef.current = [
          focusAnimation.from[0] +
            (focusAnimation.to[0] - focusAnimation.from[0]) * eased,
          focusAnimation.from[1] +
            (focusAnimation.to[1] - focusAnimation.from[1]) * eased,
          0,
        ]
        if (progress >= 1) focusAnimationRef.current = null
      } else if (
        !prefersReducedMotion.matches &&
        pointersRef.current.size === 0 &&
        now > idleUntilRef.current
      ) {
        rotationRef.current[0] =
          (rotationRef.current[0] + elapsed * 0.0032) % 360
      }
      projection
        .rotate(rotationRef.current)
        .scale(baseRadiusRef.current * zoomRef.current)
      draw()
      animationFrame = window.requestAnimationFrame(tick)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrapper)
    resize()
    setIsReady(true)
    animationFrame = window.requestAnimationFrame(tick)

    return () => {
      resizeObserver.disconnect()
      window.cancelAnimationFrame(animationFrame)
      projectionRef.current = null
    }
  }, [])

  const findTarget = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const projection = projectionRef.current
    if (!canvas || !projection) return null
    const rectangle = canvas.getBoundingClientRect()
    const x = clientX - rectangle.left
    const y = clientY - rectangle.top
    const cluster = clustersRef.current.find(
      (item) => Math.hypot(item.x - x, item.y - y) <= 17,
    )
    if (cluster) return { type: "cluster" as const, cluster }
    const coordinates = projection.invert?.([x, y])
    if (!coordinates) return null
    const region = closestContinent(coordinates[0], coordinates[1])
    return region ? { type: "region" as const, region } : null
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    })
    draggedRef.current = false
    pauseRotation()
    if (pointersRef.current.size === 2) {
      const pointers = [...pointersRef.current.values()]
      const first = pointers[0]
      const second = pointers[1]
      if (first && second)
        pinchDistanceRef.current = Math.hypot(
          first.x - second.x,
          first.y - second.y,
        )
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointersRef.current.get(event.pointerId)
    if (!pointer) {
      const target = findTarget(event.clientX, event.clientY)
      if (target?.type === "cluster") {
        setHoverLabel(
          target.cluster.markets.length > 1
            ? `${target.cluster.markets.length} demo markets`
            : (target.cluster.markets[0]?.question ?? null),
        )
      } else if (target?.type === "region") {
        setHoverLabel(`${target.region} · select region`)
      } else {
        setHoverLabel(null)
      }
      return
    }

    const previousX = pointer.x
    const previousY = pointer.y
    pointer.x = event.clientX
    pointer.y = event.clientY
    if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 5)
      draggedRef.current = true

    const pointers = [...pointersRef.current.values()]
    if (pointers.length >= 2) {
      const first = pointers[0]
      const second = pointers[1]
      if (!first || !second) return
      const nextDistance = Math.hypot(first.x - second.x, first.y - second.y)
      if (pinchDistanceRef.current) {
        zoomRef.current = Math.max(
          MIN_ZOOM,
          Math.min(
            MAX_ZOOM,
            zoomRef.current * (nextDistance / pinchDistanceRef.current),
          ),
        )
      }
      pinchDistanceRef.current = nextDistance
      return
    }

    const sensitivity = 0.28 / Math.max(0.75, zoomRef.current)
    rotationRef.current = [
      rotationRef.current[0] + (event.clientX - previousX) * sensitivity,
      Math.max(
        -82,
        Math.min(
          82,
          rotationRef.current[1] - (event.clientY - previousY) * sensitivity,
        ),
      ),
      0,
    ]
    focusAnimationRef.current = null
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const wasDragging = draggedRef.current
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchDistanceRef.current = null
    pauseRotation()
    if (wasDragging) return

    const target = findTarget(event.clientX, event.clientY)
    if (target?.type === "cluster") {
      const market = target.cluster.markets[0]
      if (!market) return
      if (target.cluster.markets.length === 1)
        callbacksRef.current.onMarketSelect(market)
      else callbacksRef.current.onRegionSelect(market.continent)
      return
    }
    if (target?.type === "region")
      callbacksRef.current.onRegionSelect(target.region)
  }

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const zoomMultiplier = Math.exp(-event.deltaY * 0.001)
    zoomRef.current = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, zoomRef.current * zoomMultiplier),
    )
    pauseRotation()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const rotationStep = event.shiftKey ? 15 : 6
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
        "0",
      ].includes(event.key)
    ) {
      event.preventDefault()
    }
    if (event.key === "ArrowLeft") rotationRef.current[0] -= rotationStep
    if (event.key === "ArrowRight") rotationRef.current[0] += rotationStep
    if (event.key === "ArrowUp")
      rotationRef.current[1] = Math.min(
        82,
        rotationRef.current[1] + rotationStep,
      )
    if (event.key === "ArrowDown")
      rotationRef.current[1] = Math.max(
        -82,
        rotationRef.current[1] - rotationStep,
      )
    if (event.key === "+" || event.key === "=")
      zoomRef.current = Math.min(MAX_ZOOM, zoomRef.current * 1.12)
    if (event.key === "-")
      zoomRef.current = Math.max(MIN_ZOOM, zoomRef.current / 1.12)
    if (event.key === "0") {
      rotationRef.current = [...DEFAULT_ROTATION]
      zoomRef.current = 1
    }
    focusAnimationRef.current = null
    pauseRotation()
  }

  const resetView = () => {
    focusAnimationRef.current = {
      startedAt: performance.now(),
      from: [...rotationRef.current],
      to: [...DEFAULT_ROTATION],
    }
    zoomRef.current = 1
    pauseRotation()
  }

  return (
    <section
      className={`relative flex min-h-[430px] flex-col overflow-hidden rounded-[1.75rem] border border-neutral-800 bg-[#101010] text-white shadow-panel ${className}`}
      aria-labelledby="globe-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
            Live atlas
          </p>
          <h2
            id="globe-heading"
            className="mt-1 text-lg font-semibold tracking-tight text-white"
          >
            Climate risk, mapped
          </h2>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-300 backdrop-blur">
          Sample markets
        </span>
      </div>

      <div
        ref={wrapperRef}
        className="relative min-h-[360px] flex-1 touch-none"
      >
        {!isReady && (
          <div
            className="absolute inset-0 z-10 grid place-items-center"
            role="status"
          >
            <span className="soft-pulse text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Plotting markets
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
          aria-label="Interactive globe with demo climate market markers. Drag or use arrow keys to rotate, scroll or use plus and minus keys to zoom."
          role="img"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverLabel(null)}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        />
        {hoverLabel && (
          <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 max-w-[80%] -translate-x-1/2 rounded-full border border-white/15 bg-black/80 px-3 py-1.5 text-center text-[11px] font-medium text-white backdrop-blur">
            {hoverLabel}
          </div>
        )}
      </div>

      <div className="relative z-10 border-t border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-2">
          <label htmlFor="globe-region" className="sr-only">
            Explore markets by region
          </label>
          <select
            id="globe-region"
            aria-label="Explore markets by region"
            value={selectedRegion ?? ""}
            onChange={(event) => {
              if (!event.target.value) return
              callbacksRef.current.onRegionSelect(event.target.value)
              focusRegion(event.target.value)
            }}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"
          >
            <option value="" className="text-black">
              Explore by region
            </option>
            {CONTINENTS.map((continent) => (
              <option key={continent} value={continent} className="text-black">
                {continent} · {marketCounts.get(continent) ?? 0} active
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetView}
            className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-white/10"
            aria-label="Reset globe view and zoom"
          >
            Reset view
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-neutral-500">
          Drag to rotate · Pinch or scroll to zoom · Select a marker to inspect
        </p>
      </div>
    </section>
  )
}
