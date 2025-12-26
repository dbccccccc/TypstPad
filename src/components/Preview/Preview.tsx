import { useEffect, useRef, useState } from 'react'
import { compileTypst, DiagnosticInfo } from '../../services/typst'
import ErrorDisplay from '../ErrorDisplay'

interface PreviewProps {
  code: string
  onCompiled?: (svg: string | null, diagnostics: DiagnosticInfo[] | null) => void
}

function Preview({ code, onCompiled }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo[] | null>(null)
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    const compile = async () => {
      const result = await compileTypst(code)

      if (result.success && result.svg) {
        setSvg(result.svg)
        setDiagnostics(null)
        onCompiled?.(result.svg, null)
      } else {
        setDiagnostics(result.diagnostics || null)
        onCompiled?.(null, result.diagnostics || null)
      }
    }

    compile()
  }, [code, onCompiled])

  return (
    <div className="flex-1 flex items-center justify-center w-full min-w-0" ref={containerRef}>
      {diagnostics && diagnostics.length > 0 && (
        <ErrorDisplay diagnostics={diagnostics} />
      )}
      {!diagnostics && svg && (
        <div
          className="flex items-center justify-center [&_svg]:block [&_svg]:w-auto [&_svg]:h-auto [&_svg]:text-[32px]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      {!diagnostics && !svg && (
        <div className="text-muted-foreground text-sm text-center">
          No preview content
        </div>
      )}
    </div>
  )
}

export default Preview
