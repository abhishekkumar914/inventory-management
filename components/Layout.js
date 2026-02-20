import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

// Icons
const DashboardIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
)
const ProductsIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
)
const SalesIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
)
const CustomersIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
)
const ExportsIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
)
const ExportCustomersIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
)

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [quickSearchOpen, setQuickSearchOpen] = useState(false)
  const [quickSearchTerm, setQuickSearchTerm] = useState('')
  const quickSearchRef = useRef(null)
  const router = useRouter()

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (quickSearchRef.current && !quickSearchRef.current.contains(e.target)) {
        setQuickSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const quickNavItems = [
    { label: 'Dashboard', href: '/dashboard', keywords: 'home overview stats metrics' },
    { label: 'Products', href: '/products', keywords: 'inventory stock items goods fertilizer' },
    { label: 'Sales', href: '/sales', keywords: 'billing invoice receipt sale order' },
    { label: 'Customers', href: '/customers', keywords: 'buyer client contact ledger udhar' },
    { label: 'Exports', href: '/exports', keywords: 'paddy wheat sarso sweetpotato mota lamba madua' },
    { label: 'Export Customers', href: '/export-customers', keywords: 'export buyer khata khatabook advance udhar' },
  ]

  const filteredNavItems = quickSearchTerm
    ? quickNavItems.filter(item =>
        item.label.toLowerCase().includes(quickSearchTerm.toLowerCase()) ||
        item.keywords.toLowerCase().includes(quickSearchTerm.toLowerCase())
      )
    : quickNavItems

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('isAdminLoggedIn')
    router.push('/')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
    { name: 'Products', href: '/products', icon: ProductsIcon },
    { name: 'Sales', href: '/sales', icon: SalesIcon },
    { name: 'Customers', href: '/customers', icon: CustomersIcon },
    { name: 'Exports', href: '/exports', icon: ExportsIcon },
    { name: 'Export Customers', href: '/export-customers', icon: ExportCustomersIcon },
  ]

  const isActive = (path) => router.pathname === path

  return (
    <div className="min-h-screen bg-[#F7F8FC]"> {/* Light gray background from design */}
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">JMD Traders</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-2 mt-4">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-6 py-3.5 rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-red-50 text-red-500 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-4 ${active ? 'text-red-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span className="font-medium">{item.name}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-6 border-t border-gray-50">
             <div className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3 mb-4 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                   <p className="text-sm font-semibold text-gray-900">Admin User</p>
                   <p className="text-xs text-gray-500">admin@store.com</p>
                </div>
             </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 text-sm font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className={`transition-all duration-300 min-h-screen ${sidebarOpen ? 'lg:pl-72' : ''}`}>
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100">
          <div className="flex items-center justify-between px-8 py-5">
            
            {/* Left: Mobile Toggle & Search */}
            <div className="flex items-center flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              
              <div className="hidden md:flex items-center max-w-md w-full">
                 <div className="relative w-full" ref={quickSearchRef}>
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </span>
                    <input 
                       type="text" 
                       placeholder="Quick navigate... (pages)" 
                       value={quickSearchTerm}
                       onChange={(e) => { setQuickSearchTerm(e.target.value); setQuickSearchOpen(true) }}
                       onFocus={() => setQuickSearchOpen(true)}
                       className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:ring-2 focus:ring-red-500/20"
                    />
                    {quickSearchOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                        {filteredNavItems.map(item => (
                          <button
                            key={item.href}
                            onClick={() => { router.push(item.href); setQuickSearchOpen(false); setQuickSearchTerm('') }}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center space-x-3 ${
                              router.pathname === item.href ? 'bg-red-50 text-red-600' : 'text-gray-700'
                            }`}
                          >
                            <span className="font-medium">{item.label}</span>
                          </button>
                        ))}
                        {filteredNavItems.length === 0 && (
                          <p className="px-4 py-3 text-sm text-gray-400">No pages found</p>
                        )}
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-6">
               <div className="flex items-center space-x-3 pl-6">
                  <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white font-bold ring-2 ring-white shadow-sm">
                    A
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700">Abhishek Store</span>
               </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
