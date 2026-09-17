import { useEffect, useState, useRef } from 'react'

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight'
]

export default function EasterEgg() {
  const [active, setActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null)

  // Listen for Konami Code
  useEffect(() => {
    let inputSequence: string[] = []
    
    const handler = (e: KeyboardEvent) => {
      inputSequence.push(e.key)
      if (inputSequence.length > KONAMI_CODE.length) {
        inputSequence = inputSequence.slice(-KONAMI_CODE.length)
      }
      
      const isMatch = inputSequence.every((key, index) => key === KONAMI_CODE[index])
      if (isMatch && !active) {
        setActive(true)
        inputSequence = [] // Reset
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active])

  // Handle Video, Audio, and Canvas when active
  useEffect(() => {
    if (!active) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Set up Web Audio API for massive bass boost and jump scare volume
    let ctxAudio = audioCtx
    if (!ctxAudio) {
      // @ts-ignore
      ctxAudio = new (window.AudioContext || window.webkitAudioContext)()
      setAudioCtx(ctxAudio)
    }

    // Attempt to resume audio context if it's suspended (browser policy)
    if (ctxAudio.state === 'suspended') {
      ctxAudio.resume()
    }

    let source: MediaElementAudioSourceNode | null = null
    try {
      // Create source only once per video element to avoid InvalidStateError
      source = ctxAudio.createMediaElementSource(video)
      
      // Massive gain
      const gainNode = ctxAudio.createGain()
      gainNode.gain.value = 100 // 100x volume

      // Bass boost filter
      const biquadFilter = ctxAudio.createBiquadFilter()
      biquadFilter.type = 'lowshelf'
      biquadFilter.frequency.value = 150
      biquadFilter.gain.value = 40 // +40dB bass

      // Distortion
      const waveShaper = ctxAudio.createWaveShaper()
      const curve = new Float32Array(400)
      for (let i = 0; i < 400; i++) {
        const x = (i * 2) / 400 - 1
        curve[i] = (Math.PI + 50) * x / (Math.PI + 50 * Math.abs(x))
      }
      waveShaper.curve = curve

      source.connect(biquadFilter)
      biquadFilter.connect(waveShaper)
      waveShaper.connect(gainNode)
      gainNode.connect(ctxAudio.destination)
    } catch {
      // Ignored if source is already connected
    }

    const w = 800
    const h = 600
    canvas.width = w
    canvas.height = h

    let animationId: number

    // Play video
    video.currentTime = 0
    video.play().catch(() => {
       // Browsers might block autoplay, but since this was triggered by a keydown event,
       // it should generally be allowed. Let's try to handle failures gracefully.
    })

    const drawLoop = () => {
      if (video.paused || video.ended) {
        animationId = requestAnimationFrame(drawLoop)
        return
      }

      ctx.drawImage(video, 0, 0, w, h)
      
      // Chroma Key (Green Screen Removal)
      try {
        const frame = ctx.getImageData(0, 0, w, h)
        const l = frame.data.length / 4
        
        for (let i = 0; i < l; i++) {
          const r = frame.data[i * 4 + 0]
          const g = frame.data[i * 4 + 1]
          const b = frame.data[i * 4 + 2]

          // Simple green detection algorithm
          // If green is dominant over red and blue
          if (g > 100 && g > r * 1.4 && g > b * 1.4) {
            frame.data[i * 4 + 3] = 0 // set alpha to 0 completely transparent
          }
        }
        ctx.putImageData(frame, 0, 0)
      } catch {
        // Handle cross-origin taint issues if any
      }

      animationId = requestAnimationFrame(drawLoop)
    }

    drawLoop()

    // Stop after 10 seconds and hide
    const timeout = setTimeout(() => {
      video.pause()
      setActive(false)
      if (animationId) cancelAnimationFrame(animationId)
    }, 10000)

    return () => {
      clearTimeout(timeout)
      if (animationId) cancelAnimationFrame(animationId)
      video.pause()
    }
  }, [active, audioCtx])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden mix-blend-screen">
      {/* Hidden original video */}
      <video 
        ref={videoRef}
        src="/assets/roach.mp4" 
        className="hidden" 
        crossOrigin="anonymous" 
        playsInline
      />

      {/* Ramped up crazy CSS animations */}
      <style>{`
        @keyframes crazy-spin {
          0% { transform: scale(1) rotate(0deg) skew(0deg); }
          25% { transform: scale(5) rotate(1080deg) skew(20deg); filter: hue-rotate(90deg) contrast(200%); }
          50% { transform: scale(10) rotate(-1080deg) skew(-20deg); filter: hue-rotate(180deg) contrast(300%) invert(1); }
          75% { transform: scale(3) rotate(2048deg) skew(40deg); filter: hue-rotate(270deg) contrast(500%); }
          100% { transform: scale(15) rotate(0deg) skew(0deg); filter: hue-rotate(360deg) contrast(1000%) invert(1); }
        }
        @keyframes flash-bg {
          0%, 100% { background-color: rgba(255, 0, 0, 0.4); }
          50% { background-color: rgba(0, 0, 255, 0.4); }
        }
        .animate-crazy {
          animation: crazy-spin 2s linear infinite;
        }
        .flash-overlay {
          animation: flash-bg 0.1s linear infinite;
        }
      `}</style>
      
      <div className="absolute inset-0 flash-overlay pointer-events-none" />

      <canvas 
        ref={canvasRef} 
        className="w-[80vw] h-auto object-contain animate-crazy pointer-events-none drop-shadow-[0_0_100px_red]"
      />
    </div>
  )
}
