import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, IconButton } from './button'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export function DialogContent({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-background/75 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content className={cn('fixed left-1/2 top-1/2 z-modal w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 shadow-xl data-[state=open]:animate-slide-up', className)}>
        <div className="mb-4 pr-8">
          <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>}
        </div>
        {children}
        <DialogPrimitive.Close asChild>
          <IconButton label="Close dialog" icon={<X className="size-4" />} variant="ghost" className="absolute right-3 top-3" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Full-viewport modal for complex forms (AWB, BL, Delivery Receipts, container stuffing, vehicles, etc.)
 *  Takes up the full screen with generous padding, rich backdrop blur,
 *  sticky header with badges, and sticky bottom action bar.
 */
export function FullscreenDialog({
  open,
  onOpenChange,
  title,
  description,
  badge,
  headerActions,
  children,
  actions,
  className,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  badge?: React.ReactNode
  headerActions?: React.ReactNode
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-background/85 backdrop-blur-md data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-1 sm:inset-3 md:inset-5 lg:inset-6 z-modal flex flex-col rounded-2xl border border-border/80 bg-background/98 shadow-2xl data-[state=open]:animate-slide-up overflow-hidden backdrop-saturate-150',
            className
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/70 bg-card/60 px-5 sm:px-6 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <DialogPrimitive.Title className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
                  {title}
                </DialogPrimitive.Title>
                {badge}
              </div>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <DialogPrimitive.Close asChild>
                <IconButton label="Close dialog" icon={<X className="size-4" />} variant="ghost" className="size-9 rounded-lg hover:bg-muted" />
              </DialogPrimitive.Close>
            </div>
          </div>
          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 custom-scrollbar space-y-6 bg-background/40">
            {children}
          </div>
          {/* Footer with action buttons */}
          {actions && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 bg-card/80 px-5 sm:px-6 py-3.5 backdrop-blur-xs">
              {actions}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export function SheetContent({
  title,
  description,
  side = 'right',
  children,
  className,
}: {
  title: string
  description?: string
  side?: 'right' | 'left'
  children: React.ReactNode
  className?: string
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-background/75 backdrop-blur-xs data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-0 z-modal h-dvh w-full max-w-xl sm:max-w-2xl border bg-popover p-5 sm:p-6 shadow-2xl transition-transform duration-200 overflow-y-auto',
          side === 'right' ? 'right-0' : 'left-0',
          className
        )}
      >
        <div className="mb-4 pr-8">
          <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>}
        </div>
        {children}
        <DialogPrimitive.Close asChild>
          <IconButton label="Close panel" icon={<X className="size-4" />} variant="ghost" className="absolute right-3.5 top-3.5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
export const Drawer = Sheet

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverContent = ({ className, ...props }: PopoverPrimitive.PopoverContentProps) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content className={cn('z-modal rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg', className)} {...props} />
  </PopoverPrimitive.Portal>
)

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="z-toast rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md" sideOffset={6}>
            {content}
            <TooltipPrimitive.Arrow className="fill-foreground" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuContent = ({ className, ...props }: DropdownMenuPrimitive.DropdownMenuContentProps) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content className={cn('z-modal min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg', className)} {...props} />
  </DropdownMenuPrimitive.Portal>
)
export const DropdownMenuItem = ({ className, ...props }: DropdownMenuPrimitive.DropdownMenuItemProps) => (
  <DropdownMenuPrimitive.Item className={cn('flex cursor-default select-none items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-[highlighted]:bg-muted', className)} {...props} />
)
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator
