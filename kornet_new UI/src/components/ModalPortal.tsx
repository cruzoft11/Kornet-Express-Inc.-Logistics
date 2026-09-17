import { createPortal } from 'react-dom'
import type { ReactNode, MouseEventHandler } from 'react'

/**
 * Renders the .modal-overlay div into #modal-root at <body> level,
 * escaping any CSS stacking context (animation/transform) on parent elements.
 * This guarantees position:fixed always covers the full viewport.
 */
export default function ModalPortal({ children, onClick }: {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLDivElement>
}) {
  const target = document.getElementById('modal-root') ?? document.body
  return createPortal(
    <div className="modal-overlay" onClick={onClick}>
      {children}
    </div>,
    target
  )
}
