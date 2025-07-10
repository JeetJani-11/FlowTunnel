// src/components/ClientOnly.tsx
'use client'
import { ReactNode, useEffect, useState } from 'react'

export function ClientOnly({ children }: { children: ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    setHasMounted(true)
  }, [])
  return hasMounted ? <>{children}</> : null
}
