import { useCallback, useRef } from 'react'
import { useToast } from '@/components/ui/toast'

export function useUndoableMutation<TArgs>(
  run: (args: TArgs) => Promise<string>,
  undo: (args: { batchId: string }) => Promise<void>,
  describe: (args: TArgs) => string,
): (args: TArgs) => Promise<void> {
  const { show } = useToast()
  const runRef = useRef(run)
  const undoRef = useRef(undo)
  const describeRef = useRef(describe)
  runRef.current = run
  undoRef.current = undo
  describeRef.current = describe

  return useCallback(async (args: TArgs): Promise<void> => {
    const batchId = await runRef.current(args)
    let used = false
    show({
      message: describeRef.current(args),
      action: {
        label: 'Undo',
        onAction: () => {
          if (used) return
          used = true
          void Promise.resolve().then(() => undoRef.current({ batchId })).catch((error: unknown) => {
            console.error('Undo failed', error)
            show({ message: 'Undo failed. Please try again.' })
          })
        },
      },
    })
  }, [show])
}
