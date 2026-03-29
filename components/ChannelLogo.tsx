'use client'
import { useState } from 'react'

interface Props {
  domain: string   // e.g. 'wise.com', 'boc.cn'
  name: string     // channel display name, used for fallback initial
  size?: number    // outer box size in px, default 32
}

// Google's favicon service — high-quality, supports retina
function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

export default function ChannelLogo({ domain, name, size = 32 }: Props) {
  const [failed, setFailed] = useState(false)
  const imgSize = Math.round(size * 0.72)   // image slightly inset from the box

  const boxStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '7px',
    backgroundColor: 'var(--bg-subtle)',
    border: '1px solid var(--border-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    userSelect: 'none',
  }

  if (failed) {
    // Letter-avatar fallback
    return (
      <div style={boxStyle}>
        <span style={{
          fontSize: Math.round(size * 0.44),
          fontWeight: 700,
          color: 'var(--text-secondary)',
          lineHeight: 1,
        }}>
          {name.charAt(0)}
        </span>
      </div>
    )
  }

  return (
    <div style={boxStyle}>
      <img
        src={faviconUrl(domain)}
        alt={name}
        width={imgSize}
        height={imgSize}
        onError={() => setFailed(true)}
        style={{ objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}
