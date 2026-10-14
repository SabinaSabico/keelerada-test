import { cn } from '@/lib/utils'
import type { TextToken } from '@/lib/tokenizeText'

type Props = {
  paragraphs: TextToken[][]
  selectedIndices: ReadonlySet<number>
  onToggle: (tokenIndex: number) => void
  disabled?: boolean
}

export function SelectableText({
  paragraphs,
  selectedIndices,
  onToggle,
  disabled,
}: Props) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-[#faf6ee] px-6 py-8 shadow-sm',
        'text-[1.05rem] leading-[1.85] text-foreground',
      )}
    >
      {paragraphs.map((tokens, pIdx) => (
        <p key={pIdx} className={cn(pIdx > 0 && 'mt-5')}>
          {tokens.map((token) => {
            if (token.type !== 'word') {
              return <span key={token.index}>{token.value}</span>
            }
            const selected = selectedIndices.has(token.index)
            return (
              <button
                key={token.index}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(token.index)}
                className={cn(
                  'rounded-sm px-0.5 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50',
                  selected
                    ? 'bg-brand-orange/25 text-foreground'
                    : 'hover:bg-brand-orange/10',
                  disabled && 'cursor-default opacity-80',
                )}
              >
                {token.value}
              </button>
            )
          })}
        </p>
      ))}
    </div>
  )
}
