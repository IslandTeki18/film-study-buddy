import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Page, Panel } from '@/components/ui/panel'
import { autoMap, type ColumnMapping } from '../../../convex/domain/csvMapping.ts'
import { MappingStep } from './mapping-step'
import type { ParsedCsv } from './parse-csv'
import { UploadStep } from './upload-step'

type Step = 'upload' | 'mapping' | 'preview'

export function HudlImport(): ReactNode {
  const { workspaceId = '', gameId = '' } = useParams()
  return <GameHudlImport key={`${workspaceId}/${gameId}`} workspaceId={workspaceId} gameId={gameId} />
}

function GameHudlImport({ workspaceId, gameId }: { readonly workspaceId: string; readonly gameId: string }): ReactNode {
  const game = useQuery(api.sourceGames.get, { sourceGameId: gameId })
  const [step, setStep] = useState<Step>('upload')
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  if (game === undefined) return <div role="status" aria-label="Loading Hudl CSV Import" className="m-6 h-32 animate-pulse rounded bg-muted" />
  if (!game || game.workspaceId !== workspaceId) return <main className="space-y-3 p-6">
    <h1>Source Game not found</h1><Link className="underline" to={`/w/${workspaceId}/games`}>Source Games</Link>
  </main>

  return <Page>
    {step === 'upload' && <UploadStep sourceGameLabel={game.label} onParsed={(parsed) => {
      setCsv(parsed)
      setMapping(autoMap(parsed.headers))
      setStep('mapping')
    }} />}
    {step === 'mapping' && csv && mapping && <MappingStep csv={csv} mapping={mapping}
      onMappingChange={setMapping} onBack={() => setStep('upload')} onContinue={() => setStep('preview')} />}
    {step === 'preview' && <Panel className="grid gap-2 p-6">
      <h1 className="text-2xl font-semibold">Preview import</h1>
      <p className="text-sm text-muted-foreground">Review the mapped rows before importing.</p>
    </Panel>}
  </Page>
}
