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
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-background/75 backdrop-blur-sm data-[state=open]:animate-fade-in" /><DialogPrimitive.Content className={cn('fixed left-1/2 top-1/2 z-modal w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 shadow-xl data-[state=open]:animate-slide-up', className)}><div className="mb-4 pr-8"><DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>{description && <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>}</div>{children}<DialogPrimitive.Close asChild><IconButton label="Close dialog" icon={<X className="size-4" />} variant="ghost" className="absolute right-3 top-3" /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>
}

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export function SheetContent({ title, description, side = 'right', children, className }: { title: string; description?: string; side?: 'right' | 'left'; children: React.ReactNode; className?: string }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-background/70" /><DialogPrimitive.Content className={cn('fixed top-0 z-modal h-dvh w-[min(34rem,100vw)] border bg-popover p-5 shadow-xl transition-transform duration-150', side === 'right' ? 'right-0' : 'left-0', className)}><div className="mb-4 pr-8"><DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>{description && <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>}</div>{children}<DialogPrimitive.Close asChild><IconButton label="Close panel" icon={<X className="size-4" />} variant="ghost" className="absolute right-3 top-3" /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>
}
export const Drawer = Sheet

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; onConfirm: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent title={title} description={description}><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>Confirm</Button></div></DialogContent></Dialog>
}

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverContent = ({ className, ...props }: PopoverPrimitive.PopoverContentProps) => <PopoverPrimitive.Portal><PopoverPrimitive.Content className={cn('z-modal rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg', className)} {...props} /></PopoverPrimitive.Portal>

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={250}><TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content className="z-toast rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md" sideOffset={6}>{content}<TooltipPrimitive.Arrow className="fill-foreground" /></TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root></TooltipPrimitive.Provider>
}

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuContent = ({ className, ...props }: DropdownMenuPrimitive.DropdownMenuContentProps) => <DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className={cn('z-modal min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg', className)} {...props} /></DropdownMenuPrimitive.Portal>
export const DropdownMenuItem = ({ className, ...props }: DropdownMenuPrimitive.DropdownMenuItemProps) => <DropdownMenuPrimitive.Item className={cn('flex cursor-default select-none items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-[highlighted]:bg-muted', className)} {...props} />
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator
