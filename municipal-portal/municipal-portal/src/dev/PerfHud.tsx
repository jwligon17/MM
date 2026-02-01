import { useEffect, useState } from 'react'

const isDev = import.meta.env.DEV

type PerfSnapshot = {
  fps: number
  dashboardRenderMs: number
  segmentRows: number
  filterMs: number
  mapSortMs: number
  tableSortMs: number
}

const perfSnapshot: PerfSnapshot = {
  fps: 0,
  dashboardRenderMs: 0,
  segmentRows: 0,
  filterMs: 0,
  mapSortMs: 0,
  tableSortMs: 0,
}

const readPerfSnapshot = () => ({
  ...perfSnapshot,
  filterSortMs: perfSnapshot.filterMs + perfSnapshot.mapSortMs + perfSnapshot.tableSortMs,
})

export const reportDashboardRender = (durationMs: number) => {
  if (!isDev) return
  perfSnapshot.dashboardRenderMs = durationMs
}

export const reportSegmentRowCount = (count: number) => {
  if (!isDev) return
  perfSnapshot.segmentRows = count
}

export const reportFilterMs = (durationMs: number) => {
  if (!isDev) return
  perfSnapshot.filterMs = durationMs
}

export const reportMapSortMs = (durationMs: number) => {
  if (!isDev) return
  perfSnapshot.mapSortMs = durationMs
}

export const reportTableSortMs = (durationMs: number) => {
  if (!isDev) return
  perfSnapshot.tableSortMs = durationMs
}

const formatMs = (value: number) => {
  if (!Number.isFinite(value)) return '0.0'
  return value.toFixed(1)
}

const PerfHud = () => {
  const [snapshot, setSnapshot] = useState(() => readPerfSnapshot())

  useEffect(() => {
    if (!isDev) return undefined

    let rafId = 0
    let lastFpsTime = performance.now()
    let frameCount = 0
    let lastSnapshotTime = 0

    const loop = (time: number) => {
      frameCount += 1
      if (time - lastFpsTime >= 1000) {
        perfSnapshot.fps = Math.round((frameCount * 1000) / (time - lastFpsTime))
        frameCount = 0
        lastFpsTime = time
      }

      if (time - lastSnapshotTime >= 250) {
        setSnapshot(readPerfSnapshot())
        lastSnapshotTime = time
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(rafId)
  }, [])

  if (!isDev) return null

  return (
    <div className="perf-hud" role="status" aria-live="polite">
      <div className="perf-hud__row">
        <span className="perf-hud__label">FPS</span>
        <span className="perf-hud__value">{snapshot.fps}</span>
      </div>
      <div className="perf-hud__row">
        <span className="perf-hud__label">Dashboard commit</span>
        <span className="perf-hud__value">{formatMs(snapshot.dashboardRenderMs)} ms</span>
      </div>
      <div className="perf-hud__row">
        <span className="perf-hud__label">Segment rows</span>
        <span className="perf-hud__value">{snapshot.segmentRows}</span>
      </div>
      <div className="perf-hud__row">
        <span className="perf-hud__label">Filter + sort</span>
        <span className="perf-hud__value">{formatMs(snapshot.filterSortMs)} ms</span>
      </div>
    </div>
  )
}

export default PerfHud
