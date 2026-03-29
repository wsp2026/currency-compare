'use client'
import { useEffect, useRef } from 'react'
import { Currency, Mode } from '@/types'

interface Props {
  currency: Currency
  amount: string
  mode: Mode
}

// All currency nodes arranged on two orbit rings
const NODES = [
  // Inner ring — 5 currencies, faster orbit (deg/s = 9)
  { code: 'USD', symbol: '$',  baseAngle: 0,   ring: 0 },
  { code: 'EUR', symbol: '€',  baseAngle: 72,  ring: 0 },
  { code: 'GBP', symbol: '£',  baseAngle: 144, ring: 0 },
  { code: 'JPY', symbol: '¥',  baseAngle: 216, ring: 0 },
  { code: 'HKD', symbol: 'HK', baseAngle: 288, ring: 0 },
  // Outer ring — 4 currencies, slower orbit (deg/s = 5.5)
  { code: 'AUD', symbol: 'A$', baseAngle: 36,  ring: 1 },
  { code: 'CAD', symbol: 'C$', baseAngle: 108, ring: 1 },
  { code: 'SGD', symbol: 'S$', baseAngle: 180, ring: 1 },
  { code: 'KRW', symbol: '₩',  baseAngle: 252, ring: 1 },
]

export default function InteractiveVisual({ currency, amount, mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Use a ref for props so the animation loop always sees current values
  // without needing to restart the RAF loop on every prop change
  const liveRef = useRef({ currency, amount, mode, mx: 0.5, my: 0.5 })

  useEffect(() => {
    liveRef.current.currency = currency
    liveRef.current.amount   = amount
    liveRef.current.mode     = mode
  }, [currency, amount, mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    let rafId: number
    const t0 = Date.now()

    // --- colour cache ---
    // Re-read CSS vars at most once per second to handle dark-mode toggle
    let colorCache: Record<string, string> = {}
    let colorTs = 0
    function c(key: string): string {
      const now = Date.now()
      if (now - colorTs > 1000) {
        const cs = getComputedStyle(document.documentElement)
        colorCache = {
          borderMuted:   cs.getPropertyValue('--border-muted').trim()   || '#30363d',
          borderDefault: cs.getPropertyValue('--border-default').trim() || '#30363d',
          bgSubtle:      cs.getPropertyValue('--bg-subtle').trim()      || '#161b22',
          textPrimary:   cs.getPropertyValue('--text-primary').trim()   || '#e6edf3',
          textSecondary: cs.getPropertyValue('--text-secondary').trim() || '#8b949e',
          textTertiary:  cs.getPropertyValue('--text-tertiary').trim()  || '#656d76',
        }
        colorTs = now
      }
      return colorCache[key] ?? '#888'
    }

    // --- resize helper ---
    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width  = Math.floor(rect.width  * dpr)
      canvas!.height = Math.floor(rect.height * dpr)
    }
    resize()

    function onResize() { resize() }
    function onMouseMove(e: MouseEvent) {
      liveRef.current.mx = e.clientX / window.innerWidth
      liveRef.current.my = e.clientY / window.innerHeight
    }
    window.addEventListener('resize',    onResize)
    window.addEventListener('mousemove', onMouseMove)

    // --- main draw loop ---
    function draw() {
      const rect = canvas!.getBoundingClientRect()
      const W = rect.width
      const H = rect.height

      if (canvas!.width !== Math.floor(W * dpr) || canvas!.height !== Math.floor(H * dpr)) resize()

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      const t   = (Date.now() - t0) / 1000
      const { currency: sel, amount: amt, mx, my } = liveRef.current
      const hasAmt = parseFloat(amt) > 0

      // Center of the visual (shift up slightly so CNY label has room below)
      const cx = W / 2
      const cy = H / 2 - 8

      // Mouse-driven parallax offsets — each ring layer moves at a different rate
      const px = (mx - 0.5) * 28
      const py = (my - 0.5) * 14

      // Ring radii — scale with canvas width, capped for desktop
      const outerR = Math.min(W * 0.41, 182)
      const innerR = outerR * 0.67
      const flat   = 0.38   // vertical squish → 3-D ellipse illusion

      // ── Orbit rings ──────────────────────────────────────────────────────────
      ctx.save()
      ctx.setLineDash([2, 6])
      ctx.lineWidth = 1

      ctx.strokeStyle = c('borderMuted')
      ctx.globalAlpha = 0.22
      ctx.beginPath()
      ctx.ellipse(cx + px * 0.42, cy + py * 0.42, innerR, innerR * flat, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.globalAlpha = 0.15
      ctx.beginPath()
      ctx.ellipse(cx + px * 0.26, cy + py * 0.26, outerR, outerR * flat, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.setLineDash([])
      ctx.restore()

      // ── Central glow when amount is filled ───────────────────────────────────
      if (hasAmt) {
        const pulse  = 0.65 + Math.sin(t * 2.2) * 0.35
        const glowR  = 46 * pulse
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
        gr.addColorStop(0,   'rgba(56,139,253,0.22)')
        gr.addColorStop(0.5, 'rgba(139,92,246,0.10)')
        gr.addColorStop(1,   'transparent')
        ctx.fillStyle = gr
        ctx.beginPath()
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Currency nodes ────────────────────────────────────────────────────────
      NODES.forEach(({ code, symbol, baseAngle, ring }) => {
        const r     = ring === 0 ? innerR : outerR
        const speed = ring === 0 ? 9 : 5.5          // deg / sec
        const pf    = ring === 0 ? 0.52 : 0.32      // parallax factor
        const a     = (baseAngle + t * speed) * (Math.PI / 180)

        // Ellipse position on current ring
        const nx = cx + px * pf + Math.cos(a) * r
        const ny = cy + py * pf + Math.sin(a) * r * flat

        const isSel  = code === sel
        const radius = isSel ? 19 : 13

        // Selected node: pulsing dashed line from CNY centre
        if (isSel) {
          const lineAlpha = 0.28 + Math.sin(t * 3.2) * 0.16
          ctx.save()
          ctx.strokeStyle   = '#c9a227'
          ctx.lineWidth     = 1
          ctx.globalAlpha   = lineAlpha
          ctx.setLineDash([3, 5])
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(nx, ny)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()

          // Golden halo
          const haloAlpha = 0.10 + Math.sin(t * 2) * 0.06
          const haloGrad  = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius + 14)
          haloGrad.addColorStop(0, `rgba(212,165,23,${haloAlpha * 3})`)
          haloGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = haloGrad
          ctx.beginPath()
          ctx.arc(nx, ny, radius + 14, 0, Math.PI * 2)
          ctx.fill()
        }

        // Node fill + border
        ctx.beginPath()
        ctx.arc(nx, ny, radius, 0, Math.PI * 2)
        ctx.fillStyle   = isSel ? 'rgba(255,248,195,0.92)' : c('bgSubtle')
        ctx.fill()
        ctx.strokeStyle = isSel ? '#c9a227' : c('borderMuted')
        ctx.lineWidth   = isSel ? 1.5 : 1
        ctx.stroke()

        // Symbol label
        ctx.fillStyle    = isSel ? '#6d4300' : c('textSecondary')
        ctx.font         = `${isSel ? 600 : 400} ${isSel ? 11 : 9}px ui-monospace,monospace`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(symbol, nx, ny)
      })

      // ── Central CNY node ──────────────────────────────────────────────────────
      const cRadius = 21
      ctx.beginPath()
      ctx.arc(cx, cy, cRadius, 0, Math.PI * 2)
      ctx.fillStyle   = c('bgSubtle')
      ctx.fill()
      ctx.strokeStyle = c('borderDefault')
      ctx.lineWidth   = 1.5
      ctx.stroke()

      ctx.fillStyle    = c('textPrimary')
      ctx.font         = '700 14px sans-serif'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('◈', cx, cy)

      ctx.fillStyle    = c('textTertiary')
      ctx.font         = '400 9px ui-monospace,monospace'
      ctx.textBaseline = 'top'
      ctx.fillText('CNY', cx, cy + cRadius + 6)

      // ── Subtle footer caption ─────────────────────────────────────────────────
      ctx.fillStyle    = c('textTertiary')
      ctx.font         = '400 10px ui-monospace,monospace'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('移动鼠标 · 选择币种 · 输入金额', cx, H - 10)

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize',    onResize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, []) // intentionally empty — all live data flows through liveRef

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: '100%', height: '280px', display: 'block' }}
    />
  )
}
