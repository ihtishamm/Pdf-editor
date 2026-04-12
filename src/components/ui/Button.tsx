import { type ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed shadow-ring',
  secondary:
    'bg-surface text-text border border-border hover:bg-surface-alt shadow-ring',
  ghost:
    'bg-transparent text-muted hover:bg-surface-alt hover:text-text',
  accent:
    'bg-accent text-white hover:bg-accent-hover shadow-ring',
  destructive:
    'bg-destructive-light text-destructive border border-destructive-border hover:bg-destructive/20',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'secondary', size = 'md', className = '', children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={`inline-flex items-center justify-center font-display font-medium rounded-btn transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  },
)
