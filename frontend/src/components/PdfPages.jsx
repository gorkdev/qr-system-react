import { useEffect, useState, useRef } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
if (workerUrl) GlobalWorkerOptions.workerSrc = workerUrl

const PdfPages = ({ pdfUrl }) => {
  const [canvases, setCanvases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!pdfUrl) return

    let cancelled = false

    const loadPdf = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(pdfUrl)
        if (!res.ok) throw new Error('PDF yüklenemedi')
        const arrayBuffer = await res.arrayBuffer()

        const pdf = await getDocument({ data: arrayBuffer }).promise
        const numPages = pdf.numPages

        const dpr = window.devicePixelRatio || 1
        const maxWidth = 576

        const canvasesData = []
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1 })
          const baseScale = maxWidth / viewport.width
          const totalScale = baseScale * dpr
          const scaledViewport = page.getViewport({ scale: totalScale })

          canvasesData.push({
            width: scaledViewport.width / dpr,
            height: scaledViewport.height / dpr,
            canvasWidth: Math.floor(scaledViewport.width),
            canvasHeight: Math.floor(scaledViewport.height),
            page,
            scaledViewport,
          })
        }

        if (cancelled) return
        setCanvases(canvasesData)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'PDF yüklenirken hata oluştu')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPdf()
    return () => { cancelled = true }
  }, [pdfUrl])

  useEffect(() => {
    if (canvases.length === 0) return

    const renderTasks = []
    canvases.forEach((item, idx) => {
      const canvas = containerRef.current?.querySelector(`[data-page="${idx + 1}"]`)
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      const task = item.page.render({
        canvasContext: ctx,
        viewport: item.scaledViewport,
      })
      renderTasks.push(task)
    })

    return () => {
      renderTasks.forEach((t) => t?.cancel?.())
    }
  }, [canvases])

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12 text-sm text-muted-foreground'>
        PDF yükleniyor...
      </div>
    )
  }

  if (error) {
    return (
      <div className='py-4 text-center text-sm text-destructive'>{error}</div>
    )
  }

  return (
    <div ref={containerRef} className='flex flex-col gap-2'>
      {canvases.map((item, idx) => (
        <canvas
          key={idx}
          data-page={idx + 1}
          width={item.canvasWidth}
          height={item.canvasHeight}
          style={{
            width: item.width,
            height: item.height,
            display: 'block',
          }}
        />
      ))}
    </div>
  )
}

export default PdfPages
