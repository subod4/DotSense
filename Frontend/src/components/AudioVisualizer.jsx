import { useEffect, useRef, useState } from 'react'

/**
 * AudioVisualizer - A real-time audio waveform visualizer
 * Uses Web Audio API to analyze microphone input and render a dynamic visualization
 */
export default function AudioVisualizer({ isActive = false, className = '' }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isActive) {
      // Cleanup when not active
      cleanup()
      return
    }

    // Start audio visualization
    startVisualization()

    return () => {
      cleanup()
    }
  }, [isActive])

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    
    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const startVisualization = async () => {
    try {
      setError(null)
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create audio context and analyzer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      // Connect microphone to analyzer
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Start visualization loop
      draw()
    } catch (err) {
      console.error('AudioVisualizer error:', err)
      setError('Could not access microphone')
    }
  }

  const draw = () => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const render = () => {
      if (!analyserRef.current) return
      
      animationRef.current = requestAnimationFrame(render)
      analyser.getByteFrequencyData(dataArray)

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate bar dimensions
      const barCount = 32
      const barWidth = (canvas.width / barCount) - 2
      const barSpacing = 2
      
      // Draw frequency bars with gradient
      for (let i = 0; i < barCount; i++) {
        // Sample from frequency data
        const dataIndex = Math.floor((i / barCount) * bufferLength)
        const value = dataArray[dataIndex]
        const barHeight = (value / 255) * canvas.height * 0.9
        
        const x = i * (barWidth + barSpacing)
        const y = canvas.height - barHeight

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, canvas.height)
        gradient.addColorStop(0, 'rgba(99, 102, 241, 1)')    // Indigo
        gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.8)') // Purple
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.6)')   // Pink

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 3)
        ctx.fill()
      }
    }

    render()
  }

  if (error) {
    return (
      <div className={`text-xs text-accent-danger ${className}`}>
        {error}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="w-full h-full opacity-90"
        aria-hidden="true"
      />
      {/* Glow effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none rounded-lg" />
    </div>
  )
}
