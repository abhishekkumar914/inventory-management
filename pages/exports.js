import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Modal from '@/components/Modal'
import { supabase } from '@/lib/supabase'

const EXPORT_ITEMS = [
  { key: 'sweetpotato', name: 'Sweetpotato', emoji: '🍠', color: 'bg-orange-50 border-orange-200 text-orange-800' },
  { key: 'paddy_lamba', name: 'Paddy (Lamba)', emoji: '🌾', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { key: 'paddy_mota', name: 'Paddy (Mota)', emoji: '🌾', color: 'bg-amber-50 border-amber-200 text-amber-800' },
  { key: 'wheat', name: 'Wheat', emoji: '🌿', color: 'bg-green-50 border-green-200 text-green-800' },
  { key: 'sarso', name: 'Sarso', emoji: '🌻', color: 'bg-lime-50 border-lime-200 text-lime-800' },
  { key: 'madua', name: 'Madua', emoji: '🌱', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
]

export default function Exports() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  
  // Detail view state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [detailEntries, setDetailEntries] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailDateFrom, setDetailDateFrom] = useState('')
  const [detailDateTo, setDetailDateTo] = useState('')
  const [detailSortAsc, setDetailSortAsc] = useState(false)
  const [expandedNoteId, setExpandedNoteId] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    quantity: '',
    unit: 'kg',
    rate_per_unit: '',
    buyer_name: '',
    buyer_phone: '',
    vehicle_number: '',
    notes: '',
    export_date: new Date().toISOString().split('T')[0]
  })

  // Multi-payment state
  const [payments, setPayments] = useState([
    { mode: 'cash', amount: '' }
  ])

  useEffect(() => {
    fetchEntries()
  }, [])

  // Phone search — auto-fill buyer name from export_customers
  const searchBuyerByPhone = async (phone) => {
    if (phone.length !== 10) return
    try {
      const { data } = await supabase
        .from('export_customers')
        .select('name, address, notes')
        .eq('phone', phone)
        .maybeSingle()

      if (data && data.name) {
        setFormData(prev => ({
          ...prev,
          buyer_name: data.name
        }))
        setSuccess('Buyer found! Name autofilled.')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setSuccess('Buyer not found in records. Enter details manually.')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Error searching buyer:', err)
    }
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

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('export_entries')
        .select('*')
        .order('export_date', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error('Failed to fetch export entries:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailEntries = async (itemKey) => {
    setDetailLoading(true)
    try {
      const { data, error } = await supabase
        .from('export_entries')
        .select('*')
        .eq('export_item_key', itemKey)
        .order('export_date', { ascending: false })

      if (error) throw error
      setDetailEntries(data || [])
    } catch (err) {
      console.error('Failed to fetch detail entries:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const getFilteredDetailEntries = () => {
    let filtered = [...detailEntries]
    
    if (detailDateFrom) {
      filtered = filtered.filter(e => new Date(e.export_date) >= new Date(detailDateFrom))
    }
    if (detailDateTo) {
      const toDate = new Date(detailDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(e => new Date(e.export_date) <= toDate)
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.export_date)
      const dateB = new Date(b.export_date)
      return detailSortAsc ? dateA - dateB : dateB - dateA
    })
    
    return filtered
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedItem || !formData.quantity || !formData.rate_per_unit) {
      setError('Please fill in quantity and rate')
      return
    }

    const totalAmount = parseFloat(formData.quantity) * parseFloat(formData.rate_per_unit)

    try {
      // Auto-create export customer if buyer phone is provided
      if (formData.buyer_phone && formData.buyer_phone.length === 10) {
        const { data: existing } = await supabase
          .from('export_customers')
          .select('id')
          .eq('phone', formData.buyer_phone)
          .single()

        if (!existing) {
          await supabase
            .from('export_customers')
            .insert([{
              phone: formData.buyer_phone,
              name: formData.buyer_name || null,
            }])
        }
      }

      const totalPaid = getTotalPaid()
      const validPayments = payments.filter(p => parseFloat(p.amount) > 0)
      const primaryMode = validPayments.length > 0 ? validPayments[0].mode : 'cash'

      const { data: entryData, error } = await supabase
        .from('export_entries')
        .insert([{
          export_item_key: selectedItem.key,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit,
          rate_per_unit: parseFloat(formData.rate_per_unit),
          total_amount: totalAmount,
          amount_paid: totalPaid,
          payment_mode: validPayments.length > 1 ? 'split' : primaryMode,
          buyer_name: formData.buyer_name,
          buyer_phone: formData.buyer_phone,
          vehicle_number: formData.vehicle_number,
          notes: formData.notes,
          export_date: formData.export_date ? new Date(formData.export_date).toISOString() : new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      // Khatabook: auto-create udhar if unpaid amount exists
      const unpaidAmount = totalAmount - totalPaid
      if (formData.buyer_phone && formData.buyer_phone.length === 10 && unpaidAmount > 1) {
        const { data: customerProfile } = await supabase
          .from('export_customers')
          .select('id')
          .eq('phone', formData.buyer_phone)
          .maybeSingle()

        if (customerProfile) {
          // Check if customer has advance balance
          const { data: txns } = await supabase
            .from('export_customer_transactions')
            .select('type, amount')
            .eq('customer_id', customerProfile.id)

          const advanceTotal = (txns || []).filter(t => t.type === 'advance').reduce((s, t) => s + Number(t.amount), 0)
          const deductionTotal = (txns || []).filter(t => t.type === 'udhar' || t.type === 'withdraw').reduce((s, t) => s + Number(t.amount), 0)
          const currentBalance = advanceTotal - deductionTotal

          const entryId = entryData?.id ? entryData.id.toString().slice(0, 8) : ''

          if (currentBalance >= unpaidAmount) {
            // Advance covers the unpaid — deduct from advance
            await supabase
              .from('export_customer_transactions')
              .insert([{
                customer_id: customerProfile.id,
                type: 'udhar',
                amount: unpaidAmount,
                description: `Deducted from advance for Export #${entryId} — ₹${unpaidAmount.toFixed(2)}`,
                transaction_date: new Date().toISOString()
              }])
          } else {
            // No/insufficient advance — record as udhar
            await supabase
              .from('export_customer_transactions')
              .insert([{
                customer_id: customerProfile.id,
                type: 'udhar',
                amount: unpaidAmount,
                description: `Udhar for Export #${entryId} — ₹${unpaidAmount.toFixed(2)} unpaid`,
                transaction_date: new Date().toISOString()
              }])
          }
        }
      }

      setSuccess(`${selectedItem.name} export entry added successfully!`)
      setTimeout(() => setSuccess(''), 3000)
      fetchEntries()
      resetForm()
      setShowModal(false)
    } catch (err) {
      setError('Failed to create entry: ' + err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      quantity: '',
      unit: 'kg',
      rate_per_unit: '',
      buyer_name: '',
      buyer_phone: '',
      vehicle_number: '',
      notes: '',
      export_date: new Date().toISOString().split('T')[0]
    })
    setPayments([{ mode: 'cash', amount: '' }])
  }

  const openNewEntry = (item) => {
    setSelectedItem(item)
    resetForm()
    setShowModal(true)
  }

  const openDetail = (item) => {
    setDetailItem(item)
    setDetailDateFrom('')
    setDetailDateTo('')
    setShowDetailModal(true)
    fetchDetailEntries(item.key)
  }

  // Calculate totals for each item
  const getItemStats = (itemKey) => {
    const itemEntries = entries.filter(e => e.export_item_key === itemKey)
    const totalQty = itemEntries.reduce((sum, e) => sum + parseFloat(e.quantity), 0)
    const totalAmount = itemEntries.reduce((sum, e) => sum + parseFloat(e.total_amount), 0)
    const entryCount = itemEntries.length
    return { totalQty, totalAmount, entryCount }
  }

  // Grand totals
  const grandTotalAmount = entries.reduce((sum, e) => sum + parseFloat(e.total_amount), 0)
  const grandTotalEntries = entries.length

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Exports</h1>
              <p className="text-gray-600 mt-1">Track agricultural exports and shipments</p>
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

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{EXPORT_ITEMS.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{grandTotalEntries}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 col-span-2">
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Export Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {EXPORT_ITEMS.map((item) => {
              const stats = getItemStats(item.key)
              return (
                <div key={item.key} className={`rounded-xl border-2 ${item.color} p-5 transition-all hover:shadow-md`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.emoji}</span>
                      <div>
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="text-xs opacity-70">{stats.entryCount} entries</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs opacity-60 uppercase font-semibold">Total Qty</p>
                      <p className="text-lg font-bold">{stats.totalQty.toLocaleString()} kg</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-60 uppercase font-semibold">Total Value</p>
                      <p className="text-lg font-bold">₹{stats.totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openNewEntry(item)}
                      className="flex-1 py-2 px-3 text-sm font-medium bg-white/80 border border-current/20 rounded-lg hover:bg-white transition-colors"
                    >
                      + Add Entry
                    </button>
                    <button
                      onClick={() => openDetail(item)}
                      className="flex-1 py-2 px-3 text-sm font-medium bg-white/80 border border-current/20 rounded-lg hover:bg-white transition-colors"
                    >
                      View History
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent Entries Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Recent Export Entries</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading entries...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No export entries yet. Click "+ Add Entry" on any item to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entries.slice(0, 20).map((entry) => {
                      const itemInfo = EXPORT_ITEMS.find(i => i.key === entry.export_item_key)
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {new Date(entry.export_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">
                            {itemInfo ? `${itemInfo.emoji} ${itemInfo.name}` : entry.export_item_key}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700">
                            {entry.buyer_name || '-'}
                            {entry.buyer_phone && <span className="text-xs text-gray-400 ml-1">({entry.buyer_phone})</span>}
                          </td>
                          <td className="px-6 py-3 text-sm text-center text-gray-700">{parseFloat(entry.quantity).toLocaleString()} {entry.unit}</td>
                          <td className="px-6 py-3 text-sm text-right text-gray-600">₹{parseFloat(entry.rate_per_unit).toFixed(2)}/{entry.unit}</td>
                          <td className="px-6 py-3 text-sm text-right font-medium text-green-600">₹{parseFloat(entry.total_amount).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-sm text-right text-gray-600">₹{parseFloat(entry.amount_paid || 0).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 text-sm text-center">
                            {parseFloat(entry.amount_paid || 0) >= parseFloat(entry.total_amount) ? (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Paid</span>
                            ) : parseFloat(entry.amount_paid || 0) > 0 ? (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Partial</span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Unpaid</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">{entry.vehicle_number || '-'}</td>
                          <td className="px-6 py-3 text-sm text-gray-500 max-w-[200px]">
                            {entry.notes ? (
                              expandedNoteId === entry.id ? (
                                <div>
                                  <p className="whitespace-pre-wrap">{entry.notes}</p>
                                  <button onClick={() => setExpandedNoteId(null)} className="text-xs text-primary-600 hover:underline mt-1">Show less</button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setExpandedNoteId(entry.id)} 
                                  className="text-left text-xs text-gray-500 hover:text-gray-800 truncate block max-w-[180px]" 
                                  title={entry.notes}
                                >
                                  {entry.notes.length > 30 ? entry.notes.slice(0, 30) + '...' : entry.notes}
                                </button>
                              )
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* New Entry Modal */}
          <Modal
            isOpen={showModal}
            onClose={() => { setShowModal(false); resetForm(); }}
            title={selectedItem ? `New Export: ${selectedItem.emoji} ${selectedItem.name}` : 'New Export Entry'}
            size="md"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="input rounded-r-none flex-1"
                      placeholder="0"
                      required
                    />
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="border border-l-0 border-gray-300 rounded-r-lg px-2 text-sm bg-gray-50"
                    >
                      <option value="kg">kg</option>
                      <option value="quintal">quintal</option>
                      <option value="ton">ton</option>
                      <option value="bags">bags</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per unit (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate_per_unit}
                    onChange={(e) => setFormData({ ...formData, rate_per_unit: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                  <input
                    type="text"
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                    className="input"
                    placeholder="Buyer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Phone</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.buyer_phone}
                      onChange={(e) => setFormData({ ...formData, buyer_phone: e.target.value.replace(/\D/g, '') })}
                      className="input flex-1"
                      maxLength="10"
                      placeholder="10-digit phone"
                    />
                    <button
                      type="button"
                      onClick={() => searchBuyerByPhone(formData.buyer_phone)}
                      disabled={formData.buyer_phone.length !== 10}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Search
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="input"
                    placeholder="e.g. UP 32 XX 1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Export Date</label>
                  <input
                    type="date"
                    value={formData.export_date}
                    onChange={(e) => setFormData({ ...formData, export_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    rows="2"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              {/* Multi-Payment Breakdown */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-gray-700">Payment Breakdown</label>
                  <button
                    type="button"
                    onClick={handleAddPayment}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Payment Method
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
              </div>

              {/* Total Preview */}
              {formData.quantity && formData.rate_per_unit && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Total Amount:</span>
                    <span className="text-xl font-bold text-green-700">
                      ₹{(parseFloat(formData.quantity || 0) * parseFloat(formData.rate_per_unit || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {(() => {
                    const total = parseFloat(formData.quantity || 0) * parseFloat(formData.rate_per_unit || 0)
                    const paid = getTotalPaid()
                    const due = total - paid
                    if (paid > 0 && due > 1) {
                      return (
                        <div className="flex justify-between items-center border-t border-green-200 pt-2">
                          <span className="text-sm font-medium text-red-600">Due (Udhar):</span>
                          <span className="text-lg font-bold text-red-600">
                            ₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )
                    }
                    if (paid === 0 && total > 0) {
                      return (
                        <p className="text-xs text-gray-500 border-t border-green-200 pt-2">
                          Leave payment empty or 0 to record full amount as udhar
                        </p>
                      )
                    }
                    if (paid > 0 && due <= 0) {
                      return (
                        <div className="flex justify-between items-center border-t border-green-200 pt-2">
                          <span className="text-sm font-medium text-green-600">✓ Fully Paid</span>
                          <span className="text-sm font-bold text-green-600">₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button type="submit" className="btn btn-primary flex-1">
                  Add Entry
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>

          {/* Detail/History Modal */}
          <Modal
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false)
              setDetailItem(null)
              setDetailEntries([])
              setDetailDateFrom('')
              setDetailDateTo('')
            }}
            title={detailItem ? `${detailItem.emoji} ${detailItem.name} - Export History` : 'Export History'}
            size="lg"
          >
            {detailItem && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{detailItem.emoji} {detailItem.name}</h3>
                    <p className="text-sm text-gray-500">{getFilteredDetailEntries().length} entries in selected range</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total (filtered)</p>
                    <p className="text-xl font-bold text-green-600">
                      ₹{getFilteredDetailEntries().reduce((s, e) => s + parseFloat(e.total_amount), 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getFilteredDetailEntries().reduce((s, e) => s + parseFloat(e.quantity), 0).toLocaleString()} kg total
                    </p>
                  </div>
                </div>

                {/* Date Filters */}
                <div className="flex flex-wrap items-end gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                    <input 
                      type="date" 
                      value={detailDateFrom}
                      onChange={(e) => setDetailDateFrom(e.target.value)}
                      className="text-sm border-gray-300 rounded-md p-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                    <input 
                      type="date" 
                      value={detailDateTo}
                      onChange={(e) => setDetailDateTo(e.target.value)}
                      className="text-sm border-gray-300 rounded-md p-1.5"
                    />
                  </div>
                  <button 
                    onClick={() => setDetailSortAsc(!detailSortAsc)}
                    className="flex items-center text-xs text-gray-600 hover:text-gray-800 border border-gray-200 bg-white rounded px-2 py-1.5"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    {detailSortAsc ? 'Oldest First' : 'Newest First'}
                  </button>
                  {(detailDateFrom || detailDateTo) && (
                    <button 
                      onClick={() => { setDetailDateFrom(''); setDetailDateTo(''); }}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Entries Table */}
                <div className="overflow-hidden border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailLoading ? (
                        <tr><td colSpan="9" className="px-4 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                      ) : getFilteredDetailEntries().length === 0 ? (
                        <tr><td colSpan="9" className="px-4 py-4 text-center text-sm text-gray-500">No entries found.</td></tr>
                      ) : (
                        getFilteredDetailEntries().map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {new Date(entry.export_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{entry.buyer_name || '-'}</td>
                            <td className="px-4 py-2 text-sm text-center">{parseFloat(entry.quantity).toLocaleString()} {entry.unit}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-600">₹{parseFloat(entry.rate_per_unit).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-green-600">₹{parseFloat(entry.total_amount).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-600">₹{parseFloat(entry.amount_paid || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2 text-sm text-center">
                              {parseFloat(entry.amount_paid || 0) >= parseFloat(entry.total_amount) ? (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Paid</span>
                              ) : parseFloat(entry.amount_paid || 0) > 0 ? (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Partial</span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Unpaid</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{entry.vehicle_number || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {entry.notes ? (
                                <p className="whitespace-pre-wrap text-xs">{entry.notes}</p>
                              ) : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
