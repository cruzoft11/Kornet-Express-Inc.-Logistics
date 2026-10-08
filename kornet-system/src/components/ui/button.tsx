import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { Kbd } from './feedback'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/95 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs',
        accent: 'bg-accent text-accent-foreground shadow-sm hover:bg-accent/95 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs',
        outline: 'border border-border bg-card/90 text-foreground shadow-2xs hover:bg-muted/80 hover:border-primary/50 hover:text-primary dark:hover:text-white hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-2xs',
        ghost: 'text-foreground hover:bg-muted/80 hover:text-foreground active:scale-[0.97]',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs',
        link: 'text-secondary underline-offset-4 hover:underline shadow-none px-0',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-[var(--density-control)] px-4',
        lg: 'h-11 px-5 text-base rounded-xl',
        icon: 'size-[var(--density-control)] p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  kbd?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, loading, disabled, children, kbd, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      <span className="inline-flex items-center gap-2 truncate">{children}</span>
      {kbd && <Kbd>{kbd}</Kbd>}
    </Comp>
  )
})
Button.displayName = 'Button'

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
  label: string
  icon: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ label, icon, size = 'md', className, ...props }, ref) => (
  <Button
    ref={ref}
    aria-label={label}
    title={label}
    size="icon"
    className={cn(
      'transition-all duration-200 hover:scale-105 active:scale-95 rounded-lg',
      size === 'sm' && 'size-8',
      size === 'lg' && 'size-11',
      className
    )}
    {...props}
  >
    <span aria-hidden="true" className="flex items-center justify-center transition-transform duration-200">{icon}</span>
  </Button>
))
IconButton.displayName = 'IconButton'
