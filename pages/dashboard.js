import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    todaySalesCount: 0,
    totalUnitsSold: 0,
    totalProducts: 0,
    lowStockProducts: [],
    topSellingProducts: []
  })
  const [showLowStockDropdown, setShowLowStockDropdown] = useState(false)
  const [productSalesData, setProductSalesData] = useState(null)
  const [timeSeriesData, setTimeSeriesData] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [timeRange, setTimeRange] = useState('7') // days

  // Bar chart filters
  const todayStr = new Date().toISOString().split('T')[0]
  const [barDateFrom, setBarDateFrom] = useState('')
  const [barDateTo, setBarDateTo] = useState(todayStr)
  const [barSelectedProducts, setBarSelectedProducts] = useState([]) // [] = all
  const [barSelectionMode, setBarSelectionMode] = useState('multi') // 'single' | 'multi'

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchMetrics(),
        fetchProductSales('', todayStr, []),
        fetchTimeSeries(),
        fetchAllProducts(),
      ])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      // Total sales count
      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })

      // Today's sales count
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: todayCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Total units sold
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('quantity')
      const totalUnitsSold = saleItems?.reduce((sum, item) => sum + item.quantity, 0) || 0

      // Low stock products (less than 10 units)
      const { data: lowStock } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .lt('current_stock', 10)
        .order('current_stock', { ascending: true })

      // Top selling products by quantity
      const { data: topProducts } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          products (name)
        `)

      const productSalesMap = {}
      topProducts?.forEach(item => {
        if (!item.products) return
        const productId = item.product_id
        if (!productSalesMap[productId]) {
          productSalesMap[productId] = {
            name: item.products.name,
            totalQuantity: 0
          }
        }
        productSalesMap[productId].totalQuantity += item.quantity
      })

      const topSellingProducts = Object.values(productSalesMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5)

      // Total active products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      setMetrics({
        totalSales: salesCount || 0,
        todaySalesCount: todayCount || 0,
        totalUnitsSold,
        totalProducts: productCount || 0,
        lowStockProducts: lowStock || [],
        topSellingProducts
      })
    } catch (err) {
      console.error('Error fetching metrics:', err)
    }
  }

  const fetchProductSales = async (fromDate, toDate, filterProducts) => {
    try {
      // Step 1: get sales IDs within date range (if any range set)
      let saleIds = null
      if (fromDate || toDate) {
        let q = supabase.from('sales').select('id')
        if (fromDate) q = q.gte('created_at', new Date(fromDate).toISOString())
        if (toDate) {
          const end = new Date(toDate)
          end.setHours(23, 59, 59, 999)
          q = q.lte('created_at', end.toISOString())
        }
        const { data: salesInRange } = await q
        if (!salesInRange || salesInRange.length === 0) {
          setProductSalesData(null)
          return
        }
        saleIds = salesInRange.map(s => s.id)
      }

      // Step 2: fetch sale_items
      let query = supabase
        .from('sale_items')
        .select('product_id, quantity, products (name)')
      if (saleIds) query = query.in('sale_id', saleIds)
      const { data } = await query

      const productSalesMap = {}
      data?.forEach(item => {
        if (!item.products) return
        const productName = item.products.name
        if (!productSalesMap[productName]) productSalesMap[productName] = 0
        productSalesMap[productName] += item.quantity
      })

      // Apply product filter
      let entries = Object.entries(productSalesMap)
      if (filterProducts && filterProducts.length > 0) {
        entries = entries.filter(([name]) => filterProducts.includes(name))
      }

      // Sort descending, top 10 (unless filtered)
      const sorted = entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, filterProducts?.length > 0 ? entries.length : 10)

      if (sorted.length === 0) {
        setProductSalesData(null)
        return
      }

      const labels = sorted.map(([name]) => name)
      const quantities = sorted.map(([, qty]) => qty)

      const bgColors = [
        'rgba(59,130,246,0.85)', 'rgba(239,68,68,0.85)', 'rgba(34,197,94,0.85)',
        'rgba(251,146,60,0.85)', 'rgba(168,85,247,0.85)', 'rgba(20,184,166,0.85)',
        'rgba(245,158,11,0.85)', 'rgba(236,72,153,0.85)', 'rgba(99,102,241,0.85)',
        'rgba(16,185,129,0.85)',
      ]

      setProductSalesData({
        labels,
        datasets: [
          {
            label: 'Units Sold',
            data: quantities,
            backgroundColor: bgColors.slice(0, labels.length),
            borderColor: bgColors.slice(0, labels.length).map(c => c.replace('0.85)', '1)')),
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      })
    } catch (err) {
      console.error('Error fetching product sales:', err)
    }
  }

  const fetchTimeSeries = async () => {
    try {
      const daysAgo = parseInt(timeRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      // Step 1: fetch sales in date range
      const { data: salesInRange } = await supabase
        .from('sales')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (!salesInRange || salesInRange.length === 0) {
        setTimeSeriesData(null)
        return
      }

      const saleIds = salesInRange.map(s => s.id)
      const saleDateMap = {}
      salesInRange.forEach(s => {
        saleDateMap[s.id] = new Date(s.created_at).toLocaleDateString('en-IN')
      })

      // Step 2: fetch sale_items for those sales
      const { data: items } = await supabase
        .from('sale_items')
        .select('sale_id, product_id, quantity, products (name)')
        .in('sale_id', saleIds)

      if (!items || items.length === 0) {
        setTimeSeriesData(null)
        return
      }

      // Group by date and product
      const dateProductSales = {}
      const productNames = new Set()

      items.forEach(item => {
        if (!item.products) return
        const date = saleDateMap[item.sale_id]
        const productName = item.products.name
        productNames.add(productName)
        if (!dateProductSales[date]) dateProductSales[date] = {}
        if (!dateProductSales[date][productName]) dateProductSales[date][productName] = 0
        dateProductSales[date][productName] += item.quantity
      })

      // All dates in range (fill gaps)
      const allDates = []
      for (let i = daysAgo; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        allDates.push(d.toLocaleDateString('en-IN'))
      }

      const productsToShow = selectedProducts.length > 0
        ? selectedProducts
        : Array.from(productNames).slice(0, 5)

      const colors = [
        'rgba(59,130,246,1)', 'rgba(239,68,68,1)', 'rgba(34,197,94,1)',
        'rgba(251,146,60,1)', 'rgba(168,85,247,1)', 'rgba(20,184,166,1)',
        'rgba(245,158,11,1)',
      ]

      const datasets = productsToShow.map((productName, index) => ({
        label: productName,
        data: allDates.map(date => dateProductSales[date]?.[productName] || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('1)', '0.1)'),
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      }))

      setTimeSeriesData({ labels: allDates, datasets })
    } catch (err) {
      console.error('Error fetching time series:', err)
    }
  }

  const fetchAllProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      setAllProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const handleProductSelection = (productName) => {
    setSelectedProducts(prev => {
      if (prev.includes(productName)) {
        return prev.filter(p => p !== productName)
      } else {
        return [...prev, productName]
      }
    })
  }

  // Bar chart product selection
  const handleBarProductSelect = (productName) => {
    if (barSelectionMode === 'single') {
      setBarSelectedProducts(prev => prev[0] === productName ? [] : [productName])
    } else {
      setBarSelectedProducts(prev =>
        prev.includes(productName) ? prev.filter(p => p !== productName) : [...prev, productName]
      )
    }
  }

  const applyBarPreset = (days) => {
    if (days === null) {
      setBarDateFrom('')
      setBarDateTo(todayStr)
    } else {
      const from = new Date()
      from.setDate(from.getDate() - days)
      setBarDateFrom(from.toISOString().split('T')[0])
      setBarDateTo(todayStr)
    }
  }

  useEffect(() => {
    if (allProducts.length > 0) {
      fetchTimeSeries()
    }
  }, [selectedProducts, timeRange])

  useEffect(() => {
    if (allProducts.length > 0) {
      fetchProductSales(barDateFrom, barDateTo, barSelectedProducts)
    }
  }, [barDateFrom, barDateTo, barSelectedProducts])

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.parsed.y} units` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 }, usePointStyle: true } },
      title: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} units` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <div className={`p-6 rounded-xl shadow-lg relative overflow-hidden transition-transform hover:-translate-y-1 ${color} text-white`}>
      <div className="flex items-center justify-between z-10 relative">
        <div>
          <p className="text-white/80 font-medium text-sm">{title}</p>
          <p className="text-4xl font-bold mt-3 tracking-tight">{value}</p>
          {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
    </div>
  )

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
              <p className="text-gray-500 mt-2 font-medium">Sales performance, trends &amp; inventory overview</p>
            </div>
            {/* Low Stock Notification Bell */}
            <div className="mt-4 md:mt-0 relative">
              <button
                onClick={() => setShowLowStockDropdown(!showLowStockDropdown)}
                className="relative bg-white shadow-sm px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {metrics.lowStockProducts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {metrics.lowStockProducts.length}
                  </span>
                )}
              </button>
              {showLowStockDropdown && metrics.lowStockProducts.length > 0 && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-80 overflow-y-auto">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-700">Low Stock Alerts</p>
                  </div>
                  {metrics.lowStockProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                      <span className="text-sm font-medium text-gray-700">{p.name}</span>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{p.current_stock} left</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Sales"
              value={metrics.totalSales}
              subtitle="All time transactions"
              color="bg-gradient-to-br from-blue-500 to-blue-600"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            />
            <StatCard
              title="Today's Sales"
              value={metrics.todaySalesCount}
              subtitle="Transactions today"
              color="bg-gradient-to-br from-green-500 to-green-600"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
            <StatCard
              title="Units Sold"
              value={metrics.totalUnitsSold}
              subtitle="Total quantity dispatched"
              color="bg-gradient-to-br from-purple-500 to-purple-600"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            />
            <StatCard
              title="Low Stock Items"
              value={metrics.lowStockProducts.length}
              subtitle="Products below 10 units"
              color="bg-gradient-to-br from-red-500 to-red-600"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            />
          </div>

          {/* Top Selling Products */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Top Selling Products</h2>
            {metrics.topSellingProducts.length > 0 ? (
              <div className="space-y-3">
                {metrics.topSellingProducts.map((product, index) => {
                  const maxQty = metrics.topSellingProducts[0].totalQuantity
                  const pct = Math.round((product.totalQuantity / maxQty) * 100)
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-gray-200 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-700 text-sm truncate">{product.name}</span>
                          <span className="text-xs font-bold text-blue-700 ml-2 flex-shrink-0">{product.totalQuantity} units</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-400 text-lg">No sales data available</p>
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          {metrics.lowStockProducts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-2 h-8 bg-red-500 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-800">Low Stock Alerts</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl">
                    <span className="font-semibold text-gray-800">{product.name}</span>
                    <span className="text-red-600 font-bold bg-white px-3 py-1 rounded-lg shadow-sm text-sm border border-red-100">
                      {product.current_stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bar Chart - Product-wise Sales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Product-wise Sales</h2>
                <p className="text-sm text-gray-500 mt-0.5">Units sold per product</p>
              </div>
              {/* Date range presets */}
              <div className="flex flex-wrap gap-2 items-center">
                {[
                  { label: 'All time', days: null },
                  { label: '7d', days: 7 },
                  { label: '30d', days: 30 },
                  { label: '90d', days: 90 },
                ].map(({ label, days }) => {
                  const isActive = days === null
                    ? barDateFrom === ''
                    : barDateFrom === (() => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0] })()
                  return (
                    <button
                      key={label}
                      onClick={() => applyBarPreset(days)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom date range */}
            <div className="flex flex-wrap gap-3 items-center mb-5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500">From</label>
                <input
                  type="date"
                  value={barDateFrom}
                  max={barDateTo || todayStr}
                  onChange={e => setBarDateFrom(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500">To</label>
                <input
                  type="date"
                  value={barDateTo}
                  min={barDateFrom}
                  max={todayStr}
                  onChange={e => setBarDateTo(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {barDateFrom && (
                <button
                  onClick={() => { setBarDateFrom(''); setBarDateTo(todayStr) }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium underline"
                >
                  Reset dates
                </button>
              )}
            </div>

            {/* Product selection */}
            {allProducts.length > 0 && (
              <div className="mb-6 bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Filter Products
                    {barSelectedProducts.length === 0 && (
                      <span className="normal-case font-normal text-gray-400 ml-1">(showing top 10)</span>
                    )}
                  </p>
                  {/* Single / Multi toggle */}
                  <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
                    <button
                      onClick={() => { setBarSelectionMode('multi'); }}
                      className={`px-3 py-1.5 transition-all ${barSelectionMode === 'multi' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      Multi
                    </button>
                    <button
                      onClick={() => { setBarSelectionMode('single'); setBarSelectedProducts(prev => prev.slice(0, 1)) }}
                      className={`px-3 py-1.5 transition-all ${barSelectionMode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      Single
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allProducts.map((product) => {
                    const isSelected = barSelectedProducts.includes(product.name)
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleBarProductSelect(product.name)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md scale-105'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {product.name}
                      </button>
                    )
                  })}
                  {barSelectedProducts.length > 0 && (
                    <button
                      onClick={() => setBarSelectedProducts([])}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {productSalesData && productSalesData.labels.length > 0 ? (
              <div style={{ height: '380px' }}>
                <Bar data={productSalesData} options={barOptions} />
              </div>
            ) : (
              <div className="py-20 text-center bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                <p className="text-gray-400">No sales data for the selected filters</p>
              </div>
            )}
          </div>

          {/* Line Chart - Sales Trends Over Time */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Sales Trends</h2>
                <p className="text-sm text-gray-500 mt-1">Daily units sold per product over time</p>
              </div>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>

            {/* Product Filter */}
            {allProducts.length > 0 && (
              <div className="mb-6 bg-gray-50 p-4 rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Filter by Product {selectedProducts.length === 0 && <span className="normal-case font-normal text-gray-400">(showing top 5)</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {allProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelection(product.name)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedProducts.includes(product.name)
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {product.name}
                    </button>
                  ))}
                  {selectedProducts.length > 0 && (
                    <button
                      onClick={() => setSelectedProducts([])}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {timeSeriesData && timeSeriesData.labels.length > 0 ? (
              <div style={{ height: '380px' }}>
                <Line data={timeSeriesData} options={lineOptions} />
              </div>
            ) : (
              <div className="py-20 text-center bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                <p className="text-gray-400">No sales data for the selected time range</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
