import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Portal from './Portal'

const DEFAULT_DURATION_MS = 200

/**
 * Portal modal with smooth open/close transitions.
 * Keeps content mounted while closing so CSS transitions can finish.
 */
export default function PortalModal({
  isOpen,
  onRequestClose,
  children,
  durationMs = DEFAULT_DURATION_MS,
  role = 'dialog',
  ariaLabelledby,
  ariaDescribedby,
  closeOnEsc = true,
  closeOnBackdrop = true,
  overlayClassName = 'portal-modal-overlay',
  backdropClassName = 'portal-modal-backdrop',
  wrapClassName = 'portal-modal-wrap',
  panelClassName = 'portal-modal-panel',
}) {
  const [rendered, setRendered] = useState(Boolean(isOpen))
  const [phase, setPhase] = useState(isOpen ? 'open' : 'closed') // closed | open | closing
  const closingTimerRef = useRef(null)

  const mounted = rendered || isOpen

  const requestClose = useCallback(() => {
    if (phase === 'closing') return
    onRequestClose?.()
  }, [onRequestClose, phase])

  useEffect(() => {
    if (!closeOnEsc || !mounted) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeOnEsc, mounted, requestClose])

  useEffect(() => {
    if (closingTimerRef.current) {
      clearTimeout(closingTimerRef.current)
      closingTimerRef.current = null
    }

    if (isOpen) {
      // This component intentionally uses effect-driven state transitions
      // to keep the modal mounted during exit animations.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRendered(true)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('open')
      return
    }

    if (rendered) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('closing')
      closingTimerRef.current = setTimeout(() => {
        setRendered(false)
        setPhase('closed')
      }, durationMs)
    }
  }, [isOpen, rendered, durationMs])

  useEffect(() => {
    return () => {
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current)
    }
  }, [])

  const overlayProps = useMemo(
    () => ({
      role,
      'aria-modal': true,
      ...(ariaLabelledby ? { 'aria-labelledby': ariaLabelledby } : null),
      ...(ariaDescribedby ? { 'aria-describedby': ariaDescribedby } : null),
    }),
    [role, ariaLabelledby, ariaDescribedby]
  )

  if (!rendered) return null

  return (
    <Portal>
      <div className={overlayClassName} {...overlayProps}>
        <div
          className={`${backdropClassName} modal-backdrop-animation${phase === 'closing' ? ' exit' : ''}`}
          onClick={closeOnBackdrop ? requestClose : undefined}
          aria-hidden
        />
        <div className={wrapClassName}>
          <div className={`${panelClassName} modal-content-animation${phase === 'closing' ? ' exit' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </Portal>
  )
}

