import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { Kbd } from './feedback'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,color,box-shadow,transform,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90',
        accent: 'bg-accent text-accent-foreground shadow-sm hover:bg-accent/90',
        outline: 'border border-border/90 bg-card text-foreground shadow-xs hover:bg-muted hover:border-border',
        ghost: 'text-foreground hover:bg-muted hover:text-foreground',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        link: 'text-secondary underline-offset-4 hover:underline shadow-none px-0',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-[var(--density-control)] px-4',
        lg: 'h-11 px-5 text-base',
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

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ label, icon, size = 'md', ...props }, ref) => (
  <Button ref={ref} aria-label={label} title={label} size="icon" {...props} className={cn(size === 'sm' && 'size-8', size === 'lg' && 'size-11', props.className)}>
    <span aria-hidden="true">{icon}</span>
  </Button>
))
IconButton.displayName = 'IconButton'
