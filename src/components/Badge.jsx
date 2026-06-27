const VARIANTS = {
  green: 'bg-[#e6f4ea] text-[#1e8e3e]',
  blue: 'bg-[#e8f0fe] text-[#1a73e8]',
  yellow: 'bg-[#fef7e0] text-[#b06000]',
  red: 'bg-[#fce8e6] text-[#c5221f]',
  purple: 'bg-[#f3ebff] text-[#7b2fff]',
  gray: 'bg-[#f1f3f4] text-[#5f6368]',
  orange: 'bg-[#feefe3] text-[#c4630a]',
}

export default function Badge({ variant = 'gray', children, className = '' }) {
  return (
    <span className={`pill ${VARIANTS[variant] || VARIANTS.gray} ${className}`}>
      {children}
    </span>
  )
}
