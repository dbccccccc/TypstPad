import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  Loader2,
  RotateCcw,
  ScanText,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import {
  preloadImageRecognizer,
  recognizeFormulaImage,
  subscribeToRecognizerProgress,
  validateFormulaImage,
  type RecognitionResult,
  type RecognizerInfo,
  type RecognizerProgress,
} from '@/services/im2typst'

interface ImageToTypstDialogProps {
  onOpenChange: (open: boolean) => void
  onUseFormula: (formula: string) => void
  open: boolean
}

type ModelState = 'idle' | 'loading' | 'ready' | 'error'

function ImageToTypstDialog({
  onOpenChange,
  onUseFormula,
  open,
}: ImageToTypstDialogProps) {
  const { formatNumber, t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const runIdRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<RecognizerInfo | null>(null)
  const [modelState, setModelState] = useState<ModelState>('idle')
  const [progress, setProgress] = useState<RecognizerProgress | null>(null)
  const [recognizing, setRecognizing] = useState(false)
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [resultText, setResultText] = useState('')

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!open) return
    let active = true
    setModelState(info ? 'ready' : 'loading')
    setError(null)

    const unsubscribe = subscribeToRecognizerProgress((nextProgress) => {
      if (!active) return
      setProgress(nextProgress)
      if (nextProgress.stage === 'ready') setModelState('ready')
    })

    preloadImageRecognizer()
      .then((nextInfo) => {
        if (!active) return
        setInfo(nextInfo)
        setModelState('ready')
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setModelState('error')
        setError(loadError instanceof Error ? loadError.message : String(loadError))
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [info, open])

  const chooseFile = useCallback((nextFile: File) => {
    try {
      validateFormulaImage(nextFile)
      setFile(nextFile)
      setResult(null)
      setResultText('')
      setError(null)
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : String(validationError))
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const handlePaste = (event: ClipboardEvent) => {
      if (recognizing) return
      const pastedFile = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile()
      if (!pastedFile) return
      event.preventDefault()
      chooseFile(
        new File([pastedFile], 'pasted-formula.png', {
          type: pastedFile.type || 'image/png',
        })
      )
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [chooseFile, open, recognizing])

  const resetSelection = useCallback(() => {
    runIdRef.current += 1
    setDragging(false)
    setError(null)
    setFile(null)
    setRecognizing(false)
    setResult(null)
    setResultText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetSelection()
    onOpenChange(nextOpen)
  }

  const handleRecognize = async () => {
    if (!file || recognizing || modelState !== 'ready') return
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    setRecognizing(true)
    setResult(null)
    setResultText('')
    setError(null)
    try {
      const nextResult = await recognizeFormulaImage(file)
      if (runId !== runIdRef.current) return
      setResult(nextResult)
      setResultText(nextResult.text)
    } catch (recognitionError) {
      if (runId !== runIdRef.current) return
      setError(
        recognitionError instanceof Error ? recognitionError.message : String(recognitionError)
      )
    } finally {
      if (runId === runIdRef.current) setRecognizing(false)
    }
  }

  const handleRetryModel = () => {
    setModelState('loading')
    setError(null)
    preloadImageRecognizer()
      .then((nextInfo) => {
        setInfo(nextInfo)
        setModelState('ready')
      })
      .catch((loadError: unknown) => {
        setModelState('error')
        setError(loadError instanceof Error ? loadError.message : String(loadError))
      })
  }

  const handleUseFormula = () => {
    if (!result?.accepted || !resultText.trim()) return
    onUseFormula(resultText)
    handleOpenChange(false)
  }

  const stageLabel = progress ? t(`imageToTypst.stage.${progress.stage}`) : t('common.loading')
  const modelSize = info ? `${(info.modelBytes / 1_000_000).toFixed(1)} MB` : null
  const score = result ? `${Math.round(result.tokenScore * 100)}%` : null
  const elapsed = result ? `${(result.totalMilliseconds / 1000).toFixed(2)} s` : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden sm:max-w-[820px]">
        <DialogHeader className="shrink-0 space-y-2 pr-7">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="flex items-center gap-2">
              <ScanText className="h-5 w-5" />
              {t('imageToTypst.title')}
            </DialogTitle>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              {t('imageToTypst.experimental')}
            </span>
          </div>
          <DialogDescription>{t('imageToTypst.description')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>{t('imageToTypst.experimentalNotice')}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  <a
                    href={`${import.meta.env.BASE_URL}im2typst/model/MODEL_CARD.md`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-2"
                  >
                    {t('imageToTypst.modelCard')}
                  </a>
                  <a
                    href={`${import.meta.env.BASE_URL}im2typst/THIRD_PARTY_NOTICES.md`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-2"
                  >
                    {t('imageToTypst.thirdPartyNotices')}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/35 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              {modelState === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {modelState === 'ready' && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
              {modelState === 'error' && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
              <span>
                {modelState === 'ready'
                  ? t('imageToTypst.modelReady', { name: info?.modelName ?? 'TypLens V1.1 INT8', size: modelSize ?? '33.1 MB' })
                  : modelState === 'error'
                    ? t('imageToTypst.modelFailed')
                    : stageLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              {t('imageToTypst.localOnly')}
            </div>
          </div>

          {modelState === 'loading' && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${progress?.percent ?? 2}%` }}
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => {
              const nextFile = event.target.files?.[0]
              if (nextFile) chooseFile(nextFile)
              event.target.value = ''
            }}
          />

          <div
            role="button"
            tabIndex={0}
            aria-label={t('imageToTypst.dropTitle')}
            onClick={() => !recognizing && fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !recognizing) {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault()
              if (!recognizing) setDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              if (recognizing) return
              const droppedFile = [...event.dataTransfer.files].find((item) =>
                item.type.startsWith('image/')
              )
              if (droppedFile) chooseFile(droppedFile)
              else setError(t('imageToTypst.invalidDrop'))
            }}
            className={cn(
              'group relative flex min-h-52 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/15 p-4 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              dragging && 'border-primary bg-primary/5',
              file && 'border-solid bg-black/[0.025] dark:bg-white/[0.025]',
              recognizing && 'cursor-wait opacity-75'
            )}
          >
            {file && previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt={t('imageToTypst.previewAlt')}
                  className="max-h-64 max-w-full rounded object-contain"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-background/90 px-3 py-2 text-left text-xs backdrop-blur-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-muted-foreground">
                      {(file.size / 1_000_000).toFixed(2)} MB · {t('imageToTypst.replaceHint')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(event) => {
                      event.stopPropagation()
                      resetSelection()
                    }}
                    disabled={recognizing}
                    aria-label={t('imageToTypst.removeImage')}
                    title={t('imageToTypst.removeImage')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <span className="rounded-full bg-primary/10 p-3 text-primary">
                  <Upload className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{t('imageToTypst.dropTitle')}</p>
                  <p className="mt-1 text-xs">{t('imageToTypst.dropHint')}</p>
                </div>
                <span className="text-xs">{t('imageToTypst.pasteHint')}</span>
              </div>
            )}
          </div>

          {recognizing && (
            <div className="space-y-2 rounded-md border bg-muted/25 p-3" role="status">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {stageLabel}
                </span>
                {progress?.stage === 'decoding' && progress.tokenCount !== undefined && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t('imageToTypst.generatedTokens', {
                      count: formatNumber(progress.tokenCount),
                    })}
                  </span>
                )}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress?.percent ?? 2}%` }}
                />
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    {result.accepted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    {result.accepted
                      ? t('imageToTypst.resultReady')
                      : t('imageToTypst.resultRejected')}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.accepted
                      ? t('imageToTypst.resultHelp')
                      : t(`imageToTypst.issue.${result.safetyIssue ?? 'empty-output'}`)}
                  </p>
                </div>
                <dl className="flex gap-3 text-xs text-muted-foreground">
                  <div>
                    <dt>{t('imageToTypst.metric.tokens')}</dt>
                    <dd className="font-medium tabular-nums text-foreground">{result.tokenCount}</dd>
                  </div>
                  <div>
                    <dt>{t('imageToTypst.metric.time')}</dt>
                    <dd className="font-medium tabular-nums text-foreground">{elapsed}</dd>
                  </div>
                  <div>
                    <dt>{t('imageToTypst.metric.score')}</dt>
                    <dd className="font-medium tabular-nums text-foreground" title={t('imageToTypst.scoreHelp')}>
                      {score}*
                    </dd>
                  </div>
                </dl>
              </div>
              <textarea
                value={resultText}
                onChange={(event) => setResultText(event.target.value)}
                spellCheck={false}
                aria-label={t('imageToTypst.resultLabel')}
                className="min-h-28 w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">* {t('imageToTypst.scoreHelp')}</p>
            </div>
          )}

          {error && (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-4 sm:justify-between">
          <div className="flex gap-2">
            {modelState === 'error' && (
              <Button type="button" variant="outline" onClick={handleRetryModel}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('imageToTypst.retry')}
              </Button>
            )}
            {!result && modelState !== 'error' && (
              <Button
                type="button"
                onClick={handleRecognize}
                disabled={!file || modelState !== 'ready' || recognizing}
              >
                {recognizing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ScanText className="mr-2 h-4 w-4" />
                )}
                {recognizing ? t('imageToTypst.recognizing') : t('imageToTypst.recognize')}
              </Button>
            )}
            {result && (
              <Button type="button" variant="outline" onClick={resetSelection}>
                <FileImage className="mr-2 h-4 w-4" />
                {t('imageToTypst.tryAnother')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            {result && (
              <Button
                type="button"
                onClick={handleUseFormula}
                disabled={!result.accepted || !resultText.trim()}
              >
                {t('imageToTypst.useInEditor')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImageToTypstDialog
