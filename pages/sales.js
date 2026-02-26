import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Modal from '@/components/Modal'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploading, setUploading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [customerSearchMode, setCustomerSearchMode] = useState('phone') // 'phone' or 'name'
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    aadhaar_number: '',
    aadhaar_photo: null,
    notes: '',
    custom_fields: {}
  })

  // Multi-payment state
  const [payments, setPayments] = useState([
    { mode: 'cash', amount: '' }
  ])

  const [saleItems, setSaleItems] = useState([
    { product_id: '', quantity: 1, custom_price: '' }
  ])

  const [customFieldKey, setCustomFieldKey] = useState('')
  const [customFieldValue, setCustomFieldValue] = useState('')

  // Date filter state for sales list
  const [salesDateFrom, setSalesDateFrom] = useState('')
  const [salesDateTo, setSalesDateTo] = useState('')
  const [salesSortAsc, setSalesSortAsc] = useState(false)

  useEffect(() => {
    fetchSales()
    fetchProducts()
  }, [])

  // Auto-fill customer details when phone or name is searched
  const checkCustomerPhone = async (phone) => {
    if (phone.length !== 10) {
        setError('Please enter a valid 10-digit phone number')
        setTimeout(() => setError(''), 3000)
        return
    }

    try {
        const { data, error } = await supabase
            .from('customers')
            .select('name, phone, aadhaar_number, aadhaar_photo_url')
            .eq('phone', phone)
            .maybeSingle()

        if (data && data.name) {
            setFormData(prev => ({
                ...prev,
                customer_name: data.name,
                phone: data.phone,
                aadhaar_number: data.aadhaar_number || '',
                existing_photo_url: data.aadhaar_photo_url || null
            }))
            setCustomerResults([])
            setShowCustomerDropdown(false)
            setIsNewCustomer(false)
            setSuccess('Customer found! Details autofilled.')
            setTimeout(() => setSuccess(''), 3000)
        } else {
            setIsNewCustomer(true)
            setSuccess('New customer! Fill in the details below and they will be saved automatically.')
            setTimeout(() => setSuccess(''), 5000)
        }
    } catch (err) {
        console.error('Error searching customer:', err)
    }
  }

  const searchCustomerByName = async (name) => {
    if (!name || name.length < 2) {
      setCustomerResults([])
      setShowCustomerDropdown(false)
      return
    }
    try {
      // Search customers profile table
      const { data: profileData } = await supabase
        .from('customers')
        .select('name, phone, aadhaar_number, aadhaar_photo_url')
        .ilike('name', `%${name}%`)
        .limit(8)

      // Also search sales table for customers not yet in profiles
      const { data: salesData } = await supabase
        .from('sales')
        .select('customer_name, phone, aadhaar_number, aadhaar_photo_url')
        .ilike('customer_name', `%${name}%`)
        .limit(8)

      // Merge, deduplicating by phone
      const seen = new Set()
      const merged = []
      ;(profileData || []).forEach(c => {
        const key = c.phone || c.name
        if (!seen.has(key)) { seen.add(key); merged.push(c) }
      })
      ;(salesData || []).forEach(s => {
        const key = s.phone || s.customer_name
        if (!seen.has(key)) {
          seen.add(key)
          merged.push({ name: s.customer_name, phone: s.phone, aadhaar_number: s.aadhaar_number, aadhaar_photo_url: s.aadhaar_photo_url })
        }
      })

      setCustomerResults(merged.slice(0, 8))
      setShowCustomerDropdown(true)
    } catch (err) {
      console.error('Error searching customer by name:', err)
    }
  }

  const selectCustomerResult = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer_name: customer.name,
      phone: customer.phone || '',
      aadhaar_number: customer.aadhaar_number || '',
      existing_photo_url: customer.aadhaar_photo_url || null
    }))
    setCustomerSearchQuery('')
    setCustomerResults([])
    setShowCustomerDropdown(false)
    setIsNewCustomer(false)
    setSuccess('Customer selected! Details autofilled.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (*)
          ),
          sale_payments (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSales(data || [])
    } catch (err) {
      setError('Failed to fetch sales: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

  const handleAddItem = () => {
    setSaleItems([...saleItems, { product_id: '', quantity: 1, custom_price: '' }])
  }

  const handleRemoveItem = (index) => {
    setSaleItems(saleItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...saleItems]
    newItems[index][field] = value
    setSaleItems(newItems)
  }

  const handleAddCustomField = () => {
    if (customFieldKey && customFieldValue) {
      setFormData({
        ...formData,
        custom_fields: {
          ...formData.custom_fields,
          [customFieldKey]: customFieldValue
        }
      })
      setCustomFieldKey('')
      setCustomFieldValue('')
    }
  }

  const handleRemoveCustomField = (key) => {
    const newFields = { ...formData.custom_fields }
    delete newFields[key]
    setFormData({ ...formData, custom_fields: newFields })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }
      setFormData({ ...formData, aadhaar_photo: file })
    }
  }

  const uploadAadhaarPhoto = async (file) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `aadhaar-photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (err) {
      throw new Error('Failed to upload photo: ' + err.message)
    }
  }

  const validateForm = () => {
    // Validate phone (10 digits) - optional
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be exactly 10 digits if provided')
      return false
    }

    // Validate Aadhaar (12 digits) - optional
    if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number)) {
      setError('Aadhaar number must be exactly 12 digits if provided')
      return false
    }

    // Validate at least one item
    const validItems = saleItems.filter(item => item.product_id && item.quantity > 0)
    if (validItems.length === 0) {
      setError('Please add at least one product')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) return

    setUploading(true)

    try {
      // Upload Aadhaar photo if provided
      let aadhaarPhotoUrl = null
      if (formData.aadhaar_photo) {
        aadhaarPhotoUrl = await uploadAadhaarPhoto(formData.aadhaar_photo)
      }

      // 1. Ensure Customer Profile Exists & Update details
      // We only try to sync to customers table if we have a phone number (unique key)
      let customerCreated = false
      if (formData.phone && formData.phone.length === 10) {
          const profileUpdate = { 
               phone: formData.phone, 
               name: formData.customer_name || 'Walk-in Customer',
               aadhaar_number: formData.aadhaar_number || null
          }
          if (aadhaarPhotoUrl) {
              profileUpdate.aadhaar_photo_url = aadhaarPhotoUrl
          }

          // Check if this is a new customer
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', formData.phone)
            .maybeSingle()

          const { error: profileError } = await supabase
            .from('customers')
            .upsert(
                profileUpdate, 
                { onConflict: 'phone' }
            )
          
          if (profileError) {
              console.error("Could not sync customer profile:", profileError)
              setError('Sale saved but failed to create customer profile: ' + profileError.message)
              setTimeout(() => setError(''), 5000)
          } else if (!existingCustomer) {
              customerCreated = true
          }
      }

      // Create sale
      // Default to "Walk-in Customer" and empty phone if not provided
      const totalPaid = getTotalPaid()
      const primaryMode = payments.length > 0 ? payments[0].mode : 'cash'
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_name: formData.customer_name || 'Walk-in Customer',
          phone: formData.phone || '',
          aadhaar_number: formData.aadhaar_number || null,
          aadhaar_photo_url: aadhaarPhotoUrl || formData.existing_photo_url,
          notes: formData.notes,
          custom_fields: formData.custom_fields,
          payment_mode: primaryMode,
          amount_paid: totalPaid
        }])
        .select()
        .single()

      if (saleError) throw saleError

      // Save split payments
      const validPayments = payments.filter(p => parseFloat(p.amount) > 0)
      if (validPayments.length > 0) {
        const paymentRows = validPayments.map(p => ({
          sale_id: saleData.id,
          payment_mode: p.mode,
          amount: parseFloat(p.amount)
        }))
        const { error: payError } = await supabase
          .from('sale_payments')
          .insert(paymentRows)
        if (payError) console.warn('Failed to save split payments:', payError)
      }

      // Prepare sale items
      const validItems = saleItems.filter(item => item.product_id && item.quantity > 0)
      const itemsToInsert = validItems.map(item => {
        const product = products.find(p => p.id === item.product_id)
        const priceToUse = item.custom_price && parseFloat(item.custom_price) > 0 
          ? parseFloat(item.custom_price) 
          : product.unit_price
        return {
          sale_id: saleData.id,
          product_id: item.product_id,
          quantity: parseInt(item.quantity),
          price_at_sale: priceToUse
        }
      })

      // Insert sale items (triggers will handle inventory deduction)
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // Auto-create customer transaction if amount paid is specified
      const totalAmount = validItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id)
        const price = item.custom_price && parseFloat(item.custom_price) > 0 
          ? parseFloat(item.custom_price) 
          : product.unit_price
        return sum + (price * parseInt(item.quantity))
      }, 0)

      // Khatabook: Only create ledger entry if there's unpaid amount (udhar)
      const unpaidAmount = totalAmount - totalPaid
      if (formData.phone && formData.phone.length === 10 && unpaidAmount > 1) {
          const { data: customerProfile } = await supabase
              .from('customers')
              .select('id')
              .eq('phone', formData.phone)
              .maybeSingle()

          if (customerProfile) {
              // Check if customer has advance balance
              const { data: txns } = await supabase
                  .from('customer_transactions')
                  .select('type, amount')
                  .eq('customer_id', customerProfile.id)

              const advanceTotal = (txns || []).filter(t => t.type === 'advance').reduce((s, t) => s + Number(t.amount), 0)
              const udharTotal = (txns || []).filter(t => t.type === 'udhar').reduce((s, t) => s + Number(t.amount), 0)
              const currentBalance = advanceTotal - udharTotal

              if (currentBalance >= unpaidAmount) {
                  // Advance covers the unpaid — deduct from advance
                  await supabase
                      .from('customer_transactions')
                      .insert([{
                          customer_id: customerProfile.id,
                          type: 'udhar',
                          amount: unpaidAmount,
                          description: `Deducted from advance for Sale #${saleData.id.toString().slice(0,8)} — ₹${unpaidAmount.toFixed(2)}`,
                          transaction_date: new Date().toISOString()
                      }])
              } else {
                  // No/insufficient advance — record as udhar
                  await supabase
                      .from('customer_transactions')
                      .insert([{
                          customer_id: customerProfile.id,
                          type: 'udhar',
                          amount: unpaidAmount,
                          description: `Udhar for Sale #${saleData.id.toString().slice(0,8)} — ₹${unpaidAmount.toFixed(2)} unpaid`,
                          transaction_date: new Date().toISOString()
                      }])
              }
          }
      }

      setSuccess(customerCreated ? 'Sale created & new customer added successfully!' : 'Sale created successfully!')
      fetchSales()
      resetForm()
      setShowModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_name: '',
      phone: '',
      aadhaar_number: '',
      aadhaar_photo: null,
      existing_photo_url: null,
      notes: '',
      custom_fields: {}
    })
    setSaleItems([{ product_id: '', quantity: 1, custom_price: '' }])
    setPayments([{ mode: 'cash', amount: '' }])
    setIsNewCustomer(false)
  }

  // Multi-payment helpers
  const handleAddPayment = () => {
    setPayments([...payments, { mode: 'cash', amount: '' }])
  }

  const handleRemovePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index))
  }

  const handlePaymentChange = (index, field, value) => {
    const updated = [...payments]
    updated[index][field] = value
    setPayments(updated)
  }

  const getTotalPaid = () => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  }

  // Helper to get total paid from a saved sale's sale_payments
  const getSaleTotalPaid = (sale) => {
    if (sale.sale_payments && sale.sale_payments.length > 0) {
      return sale.sale_payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    }
    return parseFloat(sale.amount_paid || 0)
  }

  const handleDeleteSale = async (sale) => {
    if (!confirm(`Delete sale for "${sale.customer_name}" (₹${calculateTotal(sale).toFixed(2)})? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from('sales').delete().eq('id', sale.id)
      if (error) throw error
      setSuccess('Sale deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      fetchSales()
      if (selectedSale?.id === sale.id) {
        setShowDetailsModal(false)
        setSelectedSale(null)
      }
    } catch (err) {
      setError('Failed to delete: ' + err.message)
    }
  }

  const generateBill = async (sale) => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Abhishek Store', 105, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Invoice / Bill', 105, 28, { align: 'center' })
    
    // Line
    doc.setDrawColor(200)
    doc.line(15, 32, 195, 32)
    
    // Sale info
    doc.setFontSize(10)
    doc.text(`Bill No: ${sale.id.toString().slice(0, 8).toUpperCase()}`, 15, 40)
    doc.text(`Date: ${new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 15, 46)
    doc.text(`Customer: ${sale.customer_name}`, 15, 52)
    if (sale.phone) doc.text(`Phone: ${sale.phone}`, 15, 58)
    
    // Items table
    const tableData = sale.sale_items.map((item, i) => [
      i + 1,
      item.products?.name || 'Product',
      item.quantity,
      `Rs.${parseFloat(item.price_at_sale).toFixed(2)}`,
      `Rs.${(parseFloat(item.price_at_sale) * item.quantity).toFixed(2)}`
    ])
    
    const total = calculateTotal(sale)
    const amtPaid = getSaleTotalPaid(sale)
    
    // Build footer rows
    const footRows = [['', '', '', 'Total:', `Rs.${total.toFixed(2)}`]]
    
    // Add individual payment lines
    if (sale.sale_payments && sale.sale_payments.length > 0) {
      sale.sale_payments.forEach(p => {
        footRows.push(['', '', '', `${p.payment_mode.replace('_', ' ').toUpperCase()}:`, `Rs.${parseFloat(p.amount).toFixed(2)}`])
      })
    } else if (amtPaid > 0) {
      footRows.push(['', '', '', 'Paid:', `Rs.${amtPaid.toFixed(2)}`])
    }
    
    if (amtPaid > 0 && amtPaid < total) {
      footRows.push(['', '', '', 'Due:', `Rs.${(total - amtPaid).toFixed(2)}`])
    }
    
    autoTable(doc, {
      startY: 64,
      head: [['#', 'Product', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      foot: footRows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      footStyles: { fillColor: [249, 250, 251], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9 }
    })
    
    // Footer
    const finalY = doc.lastAutoTable.finalY + 15
    doc.setFontSize(8)
    doc.text('Thank you for your business!', 105, finalY, { align: 'center' })
    
    doc.save(`bill-${sale.id.toString().slice(0, 8)}.pdf`)
  }

  const viewSaleDetails = (sale) => {
    setSelectedSale(sale)
    setShowDetailsModal(true)
  }

  const calculateTotal = (sale) => {
    return sale.sale_items.reduce((sum, item) => {
      return sum + (parseFloat(item.price_at_sale) * item.quantity)
    }, 0)
  }

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId)
    return product ? product.name : 'Select product'
  }

  const getAvailableStock = (productId) => {
    const product = products.find(p => p.id === productId)
    return product ? product.current_stock : 0
  }

  const getFilteredSales = () => {
    let filtered = [...sales]
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(sale => 
        sale.customer_name.toLowerCase().includes(term) ||
        sale.phone.includes(term)
      )
    }
    
    if (salesDateFrom) {
      filtered = filtered.filter(sale => new Date(sale.created_at) >= new Date(salesDateFrom))
    }
    if (salesDateTo) {
      const toDate = new Date(salesDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(sale => new Date(sale.created_at) <= toDate)
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)
      return salesSortAsc ? dateA - dateB : dateB - dateA
    })
    
    return filtered
  }

  const exportSalesCSV = () => {
    const filtered = getFilteredSales()
    const rows = [
      ['Date', 'Customer', 'Phone', 'Items', 'Total', 'Paid', 'Payment Mode'].join(',')
    ]
    filtered.forEach(sale => {
      const total = calculateTotal(sale)
      const paid = getSaleTotalPaid(sale)
      const modes = sale.sale_payments && sale.sale_payments.length > 0
        ? sale.sale_payments.map(p => `${p.payment_mode}:${parseFloat(p.amount).toFixed(0)}`).join(' + ')
        : (sale.payment_mode || 'cash')
      rows.push([
        new Date(sale.created_at).toLocaleDateString('en-IN'),
        `"${sale.customer_name}"`,
        sale.phone,
        sale.sale_items.length,
        total.toFixed(2),
        paid.toFixed(2),
        `"${modes}"`
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-export-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
              <p className="text-gray-600 mt-1">Manage your sales transactions</p>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="btn btn-primary"
            >
              + New Sale
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Search by customer name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-white border-0 ring-1 ring-gray-200 rounded-lg py-2.5 text-sm focus:ring-2 focus:ring-primary-500 shadow-sm"
              />
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-4">
              {success}
            </div>
          )}

          {/* Date Filter Bar */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                <input 
                  type="date" 
                  value={salesDateFrom}
                  onChange={(e) => setSalesDateFrom(e.target.value)}
                  className="text-sm border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                <input 
                  type="date" 
                  value={salesDateTo}
                  onChange={(e) => setSalesDateTo(e.target.value)}
                  className="text-sm border-gray-300 rounded-md p-2"
                />
              </div>
              <button 
                onClick={() => setSalesSortAsc(!salesSortAsc)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 border border-gray-200 bg-gray-50 rounded-md px-3 py-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                {salesSortAsc ? 'Oldest First' : 'Newest First'}
              </button>
              {(salesDateFrom || salesDateTo) && (
                <button 
                  onClick={() => { setSalesDateFrom(''); setSalesDateTo(''); }}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Clear Filters
                </button>
              )}
              <button 
                onClick={exportSalesCSV}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 border border-gray-200 bg-gray-50 rounded-md px-3 py-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
              {/* Summary */}
              <div className="ml-auto flex gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Sales Count</p>
                  <p className="text-xl font-bold text-gray-900">{getFilteredSales().length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">
                    ₹{getFilteredSales().reduce((sum, sale) => sum + calculateTotal(sale), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="card overflow-hidden p-0">
            {loading ? (
              <div className="p-8 text-center">Loading sales...</div>
            ) : sales.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No sales found. Create your first sale to get started.
              </div>
            ) : getFilteredSales().length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No sales found for the selected date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Mode</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getFilteredSales().map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          {new Date(sale.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="font-medium">{sale.customer_name}</td>
                        <td>{sale.phone}</td>
                        <td>{sale.sale_items.length} item(s)</td>
                        <td className="font-semibold text-green-600">
                          ₹{calculateTotal(sale).toFixed(2)}
                        </td>
                        <td>
                          {sale.sale_payments && sale.sale_payments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sale.sale_payments.map((p, i) => (
                                <span key={i} className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  p.payment_mode === 'upi' ? 'bg-blue-100 text-blue-700' :
                                  p.payment_mode === 'bank_transfer' ? 'bg-purple-100 text-purple-700' :
                                  p.payment_mode === 'cheque' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {p.payment_mode.replace('_', ' ').toUpperCase()} ₹{parseFloat(p.amount).toFixed(0)}
                                </span>
                              ))}
                              {(() => {
                                const due = calculateTotal(sale) - getSaleTotalPaid(sale)
                                return due > 1 ? <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">UNPAID ₹{due.toFixed(0)}</span> : null
                              })()}
                            </div>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              sale.payment_mode === 'credit' ? 'bg-red-100 text-red-700' :
                              sale.payment_mode === 'upi' ? 'bg-blue-100 text-blue-700' :
                              sale.payment_mode === 'bank_transfer' ? 'bg-purple-100 text-purple-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {(sale.payment_mode || 'cash').replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => viewSaleDetails(sale)}
                              className="text-primary-600 hover:text-primary-800 text-sm"
                            >
                              View
                            </button>
                            <button
                              onClick={() => generateBill(sale)}
                              className="text-green-600 hover:text-green-800 text-sm"
                              title="Download Bill PDF"
                            >
                              Bill
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale)}
                              className="text-red-400 hover:text-red-600 text-sm"
                              title="Delete Sale"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* New Sale Modal */}
          <Modal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false)
              resetForm()
            }}
            title="New Sale"
            size="lg"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                
                {/* Search mode toggle */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium text-gray-600">Search by:</span>
                  <div className="flex bg-gray-100 rounded-lg overflow-hidden border border-gray-200 text-xs font-semibold">
                    <button type="button" onClick={() => { setCustomerSearchMode('phone'); setCustomerResults([]); setShowCustomerDropdown(false) }} className={`px-3 py-1.5 transition-all ${customerSearchMode === 'phone' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>Phone</button>
                    <button type="button" onClick={() => { setCustomerSearchMode('name'); setCustomerResults([]); setShowCustomerDropdown(false) }} className={`px-3 py-1.5 transition-all ${customerSearchMode === 'name' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>Name</button>
                  </div>
                </div>

                {/* Search input */}
                {customerSearchMode === 'phone' ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (10 digits)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '')
                            setFormData({ ...formData, phone: val })
                        }}
                        className="input flex-1"
                        maxLength="10"
                        placeholder="Enter phone number"
                      />
                      <button type="button" onClick={() => checkCustomerPhone(formData.phone)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap">Search</button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name</label>
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value)
                        searchCustomerByName(e.target.value)
                      }}
                      className="input w-full"
                      placeholder="Type customer name..."
                    />
                    {showCustomerDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.length > 0 ? customerResults.map((c, i) => (
                          <button key={i} type="button" onClick={() => selectCustomerResult(c)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors">
                            <span className="font-medium text-gray-800">{c.name}</span>
                            <span className="text-gray-400 text-xs ml-2">{c.phone}</span>
                          </button>
                        )) : (
                          <button type="button" onClick={() => {
                            setFormData(prev => ({ ...prev, customer_name: customerSearchQuery }))
                            setShowCustomerDropdown(false)
                            setIsNewCustomer(true)
                            setSuccess('New customer! Fill in phone and other details below.')
                            setTimeout(() => setSuccess(''), 5000)
                          }} className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors">
                            <span className="text-green-700 font-medium">+ Create new customer "{customerSearchQuery}"</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* New Customer Badge */}
                {isNewCustomer && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
                    <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">NEW</span>
                    <span className="text-sm text-green-800">New customer — will be automatically saved to your customer list when this sale is created.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="input"
                      placeholder="Walk-in Customer"
                    />
                  </div>

                  {customerSearchMode === 'name' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        className="input"
                        maxLength="10"
                        placeholder="10-digit phone"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aadhaar Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.aadhaar_number}
                      onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value.replace(/\D/g, '') })}
                      className="input"
                      maxLength="12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aadhaar Photo (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="input"
                    />
                    {formData.existing_photo_url && !formData.aadhaar_photo && (
                       <div className="mt-2">
                           <p className="text-xs text-green-600 mb-1">✓ Photo on file</p>
                           <img 
                               src={formData.existing_photo_url} 
                               alt="Customer Aadhaar" 
                               className="h-20 w-auto rounded border border-gray-200"
                           />
                       </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Mode
                    </label>
                    <p className="text-xs text-gray-400 mb-2">Set in payment section below</p>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Products</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {saleItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <select
                          value={item.product_id}
                          onChange={(e) => {
                            handleItemChange(index, 'product_id', e.target.value)
                            // Auto-fill price when product is selected
                            const product = products.find(p => p.id === e.target.value)
                            if (product) {
                              handleItemChange(index, 'custom_price', product.unit_price)
                            }
                          }}
                          className="input"
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ₹{product.unit_price} (Stock: {product.current_stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="input"
                          min="1"
                          max={item.product_id ? getAvailableStock(item.product_id) : 999999}
                          placeholder="Qty"
                          required
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          step="0.01"
                          value={item.custom_price}
                          onChange={(e) => handleItemChange(index, 'custom_price', e.target.value)}
                          className="input"
                          min="0"
                          placeholder="Price"
                          required
                        />
                      </div>
                      {saleItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800 mt-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Custom Fields */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Custom Fields</h3>
                
                {Object.keys(formData.custom_fields).length > 0 && (
                  <div className="mb-4 space-y-2">
                    {Object.entries(formData.custom_fields).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <span className="text-sm font-medium">{key}:</span>
                        <span className="text-sm">{value}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(key)}
                          className="ml-auto text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={customFieldKey}
                    onChange={(e) => setCustomFieldKey(e.target.value)}
                    className="input flex-1"
                    placeholder="Field name"
                  />
                  <input
                    type="text"
                    value={customFieldValue}
                    onChange={(e) => setCustomFieldValue(e.target.value)}
                    className="input flex-1"
                    placeholder="Field value"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="btn btn-secondary"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Total & Payments */}
              <div className="bg-primary-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary-600">
                    ₹{saleItems.reduce((total, item) => {
                      if (!item.product_id) return total
                      const product = products.find(p => p.id === item.product_id)
                      const price = item.custom_price && !isNaN(parseFloat(item.custom_price)) 
                        ? parseFloat(item.custom_price) 
                        : (product ? product.unit_price : 0)
                      return total + (price * item.quantity)
                    }, 0).toFixed(2)}
                  </span>
                </div>

                {/* Multi-Payment Rows */}
                <div className="border-t border-primary-100 pt-3 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-gray-700">Payment Breakdown</label>
                    <button
                      type="button"
                      onClick={handleAddPayment}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      + Add Payment
                    </button>
                  </div>
                  {payments.map((payment, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={payment.mode}
                        onChange={(e) => handlePaymentChange(index, 'mode', e.target.value)}
                        className="border border-gray-300 rounded-md text-sm px-2 py-1.5 w-36"
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={payment.amount}
                          onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                          className="border border-gray-300 rounded-md text-sm pl-6 pr-2 py-1.5 w-full"
                          min="0"
                          placeholder="0.00"
                        />
                      </div>
                      {payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePayment(index)}
                          className="text-red-500 hover:text-red-700 text-lg font-bold px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Summary Row */}
                  <div className="flex justify-between items-center pt-2 border-t mt-2 border-primary-200">
                    <div className="text-sm">
                      <span className="text-gray-600">Paid: </span>
                      <span className="font-bold text-green-600">₹{getTotalPaid().toFixed(2)}</span>
                    </div>
                    {(() => {
                      const saleTotal = saleItems.reduce((total, item) => {
                        if (!item.product_id) return total
                        const product = products.find(p => p.id === item.product_id)
                        const price = item.custom_price && !isNaN(parseFloat(item.custom_price)) 
                          ? parseFloat(item.custom_price) 
                          : (product ? product.unit_price : 0)
                        return total + (price * item.quantity)
                      }, 0)
                      const due = saleTotal - getTotalPaid()
                      return due > 0 ? (
                        <div className="text-sm">
                          <span className="text-gray-600">Unpaid (Udhar): </span>
                          <span className="font-bold text-red-600">₹{due.toFixed(2)}</span>
                        </div>
                      ) : due < 0 ? (
                        <div className="text-sm">
                          <span className="text-gray-600">Overpaid: </span>
                          <span className="font-bold text-yellow-600">₹{Math.abs(due).toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-green-600 font-bold">✓ Fully Paid</span>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button 
                  type="submit" 
                  className="btn btn-primary flex-1"
                  disabled={uploading}
                >
                  {uploading ? 'Processing...' : 'Create Sale'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn btn-secondary"
                  disabled={uploading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>

          {/* Sale Details Modal */}
          <Modal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false)
              setSelectedSale(null)
            }}
            title="Sale Details"
            size="lg"
          >
            {selectedSale && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{selectedSale.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedSale.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Aadhaar Number</p>
                      <p className="font-medium">{selectedSale.aadhaar_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Mode</p>
                      <p className="font-medium">
                        {selectedSale.sale_payments && selectedSale.sale_payments.length > 0 
                          ? 'Split Payment' 
                          : (selectedSale.payment_mode || 'cash').replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Amount Paid</p>
                      <p className="font-medium text-green-600">₹{getSaleTotalPaid(selectedSale).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Balance Due</p>
                      <p className={`font-medium ${(calculateTotal(selectedSale) - getSaleTotalPaid(selectedSale)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{(calculateTotal(selectedSale) - getSaleTotalPaid(selectedSale)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">
                        {new Date(selectedSale.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Aadhaar Photo */}
                {selectedSale.aadhaar_photo_url && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Customer Photo</h3>
                    <img 
                      src={selectedSale.aadhaar_photo_url} 
                      alt="Aadhaar" 
                      className="max-w-md rounded-lg border"
                    />
                  </div>
                )}

                {/* Products */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Products</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.sale_items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.products.name}</td>
                          <td>{item.quantity}</td>
                          <td>₹{parseFloat(item.price_at_sale).toFixed(2)}</td>
                          <td>₹{(parseFloat(item.price_at_sale) * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan="3" className="text-right font-semibold">Total:</td>
                        <td className="font-bold text-green-600">
                          ₹{calculateTotal(selectedSale).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Payment Breakdown */}
                {selectedSale.sale_payments && selectedSale.sale_payments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Payment Breakdown</h3>
                    <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      {selectedSale.sale_payments.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-b-0">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            p.payment_mode === 'upi' ? 'bg-blue-100 text-blue-700' :
                            p.payment_mode === 'bank_transfer' ? 'bg-purple-100 text-purple-700' :
                            p.payment_mode === 'cheque' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {p.payment_mode.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="font-semibold text-green-600">₹{parseFloat(p.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      {(() => {
                        const due = calculateTotal(selectedSale) - getSaleTotalPaid(selectedSale)
                        return due > 1 ? (
                          <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border-t border-red-100">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">UNPAID / UDHAR</span>
                            <span className="font-bold text-red-600">₹{due.toFixed(2)}</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedSale.notes && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Notes</h3>
                    <p className="bg-gray-50 p-4 rounded-lg">{selectedSale.notes}</p>
                  </div>
                )}

                {/* Custom Fields */}
                {Object.keys(selectedSale.custom_fields).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Custom Fields</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {Object.entries(selectedSale.custom_fields).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium mr-2">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => generateBill(selectedSale)}
                    className="btn btn-primary flex-1"
                  >
                    Download Bill PDF
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteSale(selectedSale)
                      setShowDetailsModal(false)
                    }}
                    className="btn bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    Delete Sale
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
