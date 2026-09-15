import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Page } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import {
  autoMap,
  coerceRow,
  findLikelyDuplicates,
  findOdkHeader,
  headerSignature,
  IMPORT_TARGETS,
  missingRequiredTargets,
  normalizeHeader,
  type ColumnMapping,
  type ImportTarget,
} from '../../../convex/domain/csvMapping.ts'
import { MappingStep } from './mapping-step'
import type { ParsedCsv } from './parse-csv'
import { PreviewStep } from './preview-step'
import { UploadStep } from './upload-step'

type Step = 'upload' | 'mapping' | 'preview'

export function HudlImport(): ReactNode {
  const { workspaceId = '', gameId = '' } = useParams()
  return <GameHudlImport key={`${workspaceId}/${gameId}`} workspaceId={workspaceId} gameId={gameId} />
}

function GameHudlImport({ workspaceId, gameId }: { readonly workspaceId: string; readonly gameId: string }): ReactNode {
  const navigate = useNavigate()
  const { show } = useToast()
  const game = useQuery(api.sourceGames.get, { sourceGameId: gameId })
  const commit = useMutation(api.hudlImport.commit)
  const [searchParams, setSearchParams] = useSearchParams()
  const [reloadMessage, setReloadMessage] = useState(() => searchParams.get('step') === 'preview'
    ? 'Pick the file again to continue.' : undefined)
  const [step, setStep] = useState<Step>('upload')
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [included, setIncluded] = useState<Set<number>>(new Set())
  const [usingRemembered, setUsingRemembered] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const committing = useRef(false)
  const initializedCsv = useRef<ParsedCsv | null>(null)
  const signature = csv ? headerSignature(csv.headers) : null
  const remembered = useQuery(api.hudlImport.getRememberedMapping, signature ? { signature } : 'skip')
  const existingSnaps = useQuery(api.snaps.listBySourceGame, game ? { sourceGameId: game._id } : 'skip')
  const rows = useMemo(() => csv && mapping
    ? csv.rows.map((row, index) => coerceRow(row, mapping, findOdkHeader(csv.headers), index))
    : [], [csv, mapping])
  const duplicates = useMemo(
    () => findLikelyDuplicates(existingSnaps ?? [], rows),
    [existingSnaps, rows],
  )
  const mappedTargets = useMemo(() => new Set(Object.values(mapping ?? {}).filter(
    (target): target is ImportTarget => target !== null,
  )), [mapping])

  async function importRows(): Promise<void> {
    if (!game || !signature || !mapping || committing.current) return
    committing.current = true
    setPending(true)
    setError(null)
    try {
      const result = await commit({
        sourceGameId: game._id, signature, mapping,
        rows: rows.filter(({ index }) => included.has(index)).map(({ core, imported }) => ({ core, imported })),
      })
      show({ message: `Imported ${result.inserted} Snaps` })
      void navigate(`/w/${workspaceId}/games/${gameId}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      committing.current = false
      setPending(false)
    }
  }

  useEffect(() => {
    setIncluded(new Set(rows.filter(({ flag }) => flag === null).map(({ index }) => index)))
  }, [rows])

  useEffect(() => {
    if (searchParams.get('step') === 'preview' && !csv) setSearchParams({}, { replace: true })
  }, [csv, searchParams, setSearchParams])

  useEffect(() => {
    if (!csv || remembered === undefined || initializedCsv.current === csv) return
    initializedCsv.current = csv
    const reconciled = remembered && reconcileRememberedMapping(csv.headers, remembered)
    if (reconciled) {
      setMapping(reconciled)
      setUsingRemembered(true)
      setStep('preview')
      setSearchParams({ step: 'preview' }, { replace: true })
    } else {
      setMapping(autoMap(csv.headers))
      setUsingRemembered(false)
      setStep('mapping')
      setSearchParams({}, { replace: true })
    }
  }, [csv, remembered, setSearchParams])

  if (game === undefined) return <div role="status" aria-label="Loading Hudl CSV Import" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!game || game.workspaceId !== workspaceId) return <main className="space-y-3 p-6">
    <h1>Source Game not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link>
  </main>

  return <Page>
    {step === 'upload' && <UploadStep sourceGameLabel={game.label} reloadMessage={reloadMessage} onParsed={(parsed) => {
      setCsv(parsed)
      setMapping(null)
      setReloadMessage(undefined)
      setStep('mapping')
    }} />}
    {csv && remembered === undefined && <div role="status" aria-label="Loading saved column mapping" className="h-32 animate-pulse rounded bg-muted" />}
    {step === 'mapping' && csv && mapping && <MappingStep csv={csv} mapping={mapping}
      onMappingChange={setMapping} onBack={() => { setStep('upload'); setSearchParams({}, { replace: true }) }}
      onContinue={() => { setUsingRemembered(false); setStep('preview'); setSearchParams({ step: 'preview' }) }} />}
    {step === 'preview' && csv && mapping && existingSnaps === undefined
      ? <div role="status" aria-label="Checking for duplicate Snaps" className="h-32 animate-pulse rounded bg-muted" />
      : step === 'preview' && csv && mapping && <PreviewStep rows={rows} duplicates={duplicates} mappedTargets={mappedTargets}
      included={included} usingRemembered={usingRemembered} onIncludedChange={setIncluded}
      pending={pending} error={error} onImport={() => { void importRows() }}
      onBack={() => {
        setStep(usingRemembered ? 'upload' : 'mapping')
        setSearchParams({}, { replace: true })
      }} onChangeMapping={() => {
          setUsingRemembered(false)
          setStep('mapping')
          setSearchParams({}, { replace: true })
        }} />}
  </Page>
}

function reconcileRememberedMapping(
  headers: readonly string[], stored: Readonly<Record<string, string | null>>,
): ColumnMapping | null {
  const currentByNormalized = new Map(headers.map((header) => [normalizeHeader(header), header]))
  if (currentByNormalized.size !== headers.length || Object.keys(stored).length !== headers.length) return null
  const validTargets = new Set<string>(IMPORT_TARGETS.map(({ key }) => key))
  const claimed = new Set<string>()
  const reconciled: Record<string, ImportTarget | null> = {}
  for (const [storedHeader, target] of Object.entries(stored)) {
    const currentHeader = currentByNormalized.get(normalizeHeader(storedHeader))
    if (!currentHeader || (target !== null && (!validTargets.has(target) || claimed.has(target)))) return null
    if (target !== null) claimed.add(target)
    reconciled[currentHeader] = target as ImportTarget | null
  }
  return Object.keys(reconciled).length === headers.length && !missingRequiredTargets(reconciled).length
    ? reconciled : null
}
