import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ProtectedRoute({ children }) {
  const router = useRouter()

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn')
    if (isLoggedIn !== 'true') {
      router.push('/')
    }
  }, [router])

  return <>{children}</>
}
