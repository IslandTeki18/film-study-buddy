import type { ReactNode } from 'react'
import { Archive, Clapperboard, LayoutTemplate, Settings, type LucideIcon } from 'lucide-react'
import {
  Outlet,
  createHashRouter,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import { App } from '@/app'
import { Tabs } from '@/components/ui/tabs'
import { AddSourceGamePage } from './add-source-game-page'
import { ArchivePage } from './archive-page'
import { CreateOpponentPage } from './create-opponent-page'
import { HomePage } from './home-page'
import { HudlImportPage } from './hudl-import-page'
import { ImportPreviewPage } from './import-preview-page'
import { MustReviewPage } from './must-review-page'
import { OpponentDataPage } from './opponent-data-page'
import { PlayDesignerPage } from './play-designer-page'
import { PlayDetailPage } from './play-detail-page'
import { PlayDiagramsPage } from './play-diagrams-page'
import { PlayLogPage } from './play-log-page'
import { QuickNotesPage } from './quick-notes-page'
import { ReportBuilderPage } from './report-builder-page'
import { ReportListPage } from './report-list-page'
import { ReportPreviewPage } from './report-preview-page'
import { ScratchPage } from './scratch-page'
import { SeasonPage } from './season-page'
import { SettingsPage } from './settings-page'
import { SourceGamesPage } from './source-games-page'
import { TemplateBuilderPage } from './template-builder-page'
import { TemplatesPage } from './templates-page'
import { TendenciesPage } from './tendencies-page'
import { WelcomePage } from './welcome-page'
import { WorkspaceOverviewPage } from './workspace-overview-page'

export const ROUTES = [
  { path: '/', label: 'Home', Icon: Clapperboard },
  { path: '/templates', label: 'Templates', Icon: LayoutTemplate },
  { path: '/archive', label: 'Archive', Icon: Archive },
  { path: '/settings', label: 'Settings', Icon: Settings },
] as const satisfies ReadonlyArray<{ path: string; label: string; Icon: LucideIcon }>

function WorkspaceLayout(): ReactNode {
  const { workspaceId = '' } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const base = `/w/${workspaceId}`
  const section = pathname.slice(base.length).split('/')[1] ?? ''
  const value = ['games', 'data', 'tendencies', 'reports'].includes(section) ? section : 'overview'
  const paths = {
    overview: base,
    games: `${base}/games`,
    data: `${base}/data`,
    tendencies: `${base}/tendencies`,
    reports: `${base}/reports`,
  }

  return (
    <Tabs
      label="Workspace"
      value={value}
      onValueChange={(next) => navigate(paths[next as keyof typeof paths])}
      items={[
        { value: 'overview', label: 'Overview', content: <Outlet /> },
        { value: 'games', label: 'Source Games', content: <Outlet /> },
        { value: 'data', label: 'Opponent Data', content: <Outlet /> },
        { value: 'tendencies', label: 'Tendencies', content: <Outlet /> },
        { value: 'reports', label: 'Reports', content: <Outlet /> },
      ]}
    />
  )
}

function SourceGameLayout(): ReactNode {
  const { workspaceId = '', gameId = '' } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const base = `/w/${workspaceId}/games/${gameId}`
  const section = pathname.slice(base.length).split('/')[1] ?? ''
  const value = ['notes', 'review', 'diagrams'].includes(section) ? section : 'play-log'
  const paths = {
    'play-log': base,
    notes: `${base}/notes`,
    review: `${base}/review`,
    diagrams: `${base}/diagrams`,
  }

  return (
    <Tabs
      label="Source game"
      value={value}
      onValueChange={(next) => navigate(paths[next as keyof typeof paths])}
      items={[
        { value: 'play-log', label: 'Play Log', content: <Outlet /> },
        { value: 'notes', label: 'Quick Notes', content: <Outlet /> },
        { value: 'review', label: 'Must Review', content: <Outlet /> },
        { value: 'diagrams', label: 'Play Diagrams', content: <Outlet /> },
      ]}
    />
  )
}

function ImportPage(): ReactNode {
  const [searchParams] = useSearchParams()
  return searchParams.get('step') === 'preview' ? <ImportPreviewPage /> : <HudlImportPage />
}

export const router = createHashRouter([
  { path: '/welcome', element: <WelcomePage /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'seasons/:seasonId',
        children: [
          { index: true, element: <SeasonPage /> },
          { path: 'new', element: <CreateOpponentPage /> },
        ],
      },
      {
        path: 'w/:workspaceId',
        element: <WorkspaceLayout />,
        children: [
          { index: true, element: <WorkspaceOverviewPage /> },
          {
            path: 'games',
            children: [
              { index: true, element: <SourceGamesPage /> },
              { path: 'new', element: <AddSourceGamePage /> },
              {
                path: ':gameId',
                element: <SourceGameLayout />,
                children: [
                  { index: true, element: <PlayLogPage /> },
                  { path: 'import', element: <ImportPage /> },
                  { path: 'snap/:snapId', element: <PlayDetailPage /> },
                  { path: 'notes', element: <QuickNotesPage /> },
                  { path: 'review', element: <MustReviewPage /> },
                  {
                    path: 'diagrams',
                    children: [
                      { index: true, element: <PlayDiagramsPage /> },
                      { path: ':diagramId', element: <PlayDesignerPage /> },
                    ],
                  },
                ],
              },
            ],
          },
          { path: 'data', element: <OpponentDataPage /> },
          { path: 'tendencies', element: <TendenciesPage /> },
          {
            path: 'reports',
            children: [
              { index: true, element: <ReportListPage /> },
              {
                path: ':reportId',
                children: [
                  { index: true, element: <ReportBuilderPage /> },
                  { path: 'preview', element: <ReportPreviewPage /> },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'templates',
        children: [
          { index: true, element: <TemplatesPage /> },
          { path: ':templateId', element: <TemplateBuilderPage /> },
        ],
      },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'archive', element: <ArchivePage /> },
      { path: 'scratch', element: <ScratchPage /> },
    ],
  },
])
