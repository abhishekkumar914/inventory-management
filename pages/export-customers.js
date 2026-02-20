import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'

const Avatar = ({ name }) => {
  const initials = (name || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
    
  const colors = [
    'bg-red-200 text-red-800',
    'bg-blue-200 text-blue-800',
    'bg-green-200 text-green-800',
    'bg-yellow-200 text-yellow-800',
    'bg-purple-200 text-purple-800',
    'bg-pink-200 text-pink-800'
  ]
  const colorIndex = (name || '').length % colors.length
  
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${colors[colorIndex]}`}>
      {initials}
    </div>
  )
}

export default function ExportCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Customer modal
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [newTransaction, setNewTransaction] = useState({ type: 'advance', amount: '', description: '' })
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [transactionSortAsc, setTransactionSortAsc] = useState(false)

  // New customer modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '', address: '' })

  // Edit profile
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editProfileData, setEditProfileData] = useState({ name: '', email: '', address: '' })

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      // Auto-sync: create export_customers from export_entries buyers who don't exist yet
      const { data: entries } = await supabase
        .from('export_entries')
        .select('buyer_name, buyer_phone')
      
      if (entries) {
        const uniqueBuyers = new Map()
        entries.forEach(e => {
          if (e.buyer_phone && e.buyer_phone.length >= 10 && !uniqueBuyers.has(e.buyer_phone)) {
            uniqueBuyers.set(e.buyer_phone, e.buyer_name)
          }
        })

        for (const [phone, name] of uniqueBuyers) {
          const { data: existing } = await supabase
            .from('export_customers')
            .select('id')
            .eq('phone', phone)
            .single()

          if (!existing) {
            await supabase.from('export_customers').insert([{ phone, name: name || null }])
          }
        }
      }

      const { data, error } = await supabase
        .from('export_customers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // For each customer, get their transaction summary
      const customersWithBalance = await Promise.all((data || []).map(async (customer) => {
        const { data: txns } = await supabase
          .from('export_customer_transactions')
          .select('type, amount')
          .eq('customer_id', customer.id)

        const totalAdvance = (txns || [])
          .filter(t => t.type === 'advance')
          .reduce((s, t) => s + Number(t.amount), 0)
        const totalDeductions = (txns || [])
          .filter(t => ['udhar', 'withdraw'].includes(t.type))
          .reduce((s, t) => s + Number(t.amount), 0)

        return {
          ...customer,
          balance: totalAdvance - totalDeductions,
          totalTransactions: (txns || []).length
        }
      }))

      setCustomers(customersWithBalance)
    } catch (err) {
      console.error('Error fetching export customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    if (!newCustomerData.phone || newCustomerData.phone.length !== 10) {
      alert('Please enter a valid 10-digit phone number')
      return
    }

    try {
      const { error } = await supabase
        .from('export_customers')
        .insert([{
          name: newCustomerData.name,
          phone: newCustomerData.phone,
          email: newCustomerData.email || null,
          address: newCustomerData.address || null
        }])

      if (error) throw error
      setIsNewModalOpen(false)
      setNewCustomerData({ name: '', phone: '', email: '', address: '' })
      fetchCustomers()
    } catch (err) {
      alert('Error creating customer: ' + err.message)
    }
  }

  const openCustomerModal = async (customer) => {
    setSelectedCustomer(customer)
    setIsModalOpen(true)
    setIsEditingProfile(false)
    setEditingTransaction(null)
    setNewTransaction({ type: 'advance', amount: '', description: '' })
    fetchTransactions(customer.id)
  }

  const fetchTransactions = async (customerId) => {
    setTransactionLoading(true)
    const { data, error } = await supabase
      .from('export_customer_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('transaction_date', { ascending: false })

    if (data) setTransactions(data)
    setTransactionLoading(false)
  }

  const handleSaveTransaction = async (e) => {
    e.preventDefault()
    if (!selectedCustomer || !newTransaction.amount) return

    try {
      if (editingTransaction) {
        const { error } = await supabase
          .from('export_customer_transactions')
          .update({
            type: newTransaction.type,
            amount: parseFloat(newTransaction.amount),
            description: newTransaction.description
          })
          .eq('id', editingTransaction.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('export_customer_transactions')
          .insert([{
            customer_id: selectedCustomer.id,
            type: newTransaction.type,
            amount: parseFloat(newTransaction.amount),
            description: newTransaction.description,
            transaction_date: new Date().toISOString()
          }])

        if (error) throw error
      }

      setNewTransaction({ type: 'advance', amount: '', description: '' })
      setEditingTransaction(null)
      fetchTransactions(selectedCustomer.id)
      fetchCustomers() // refresh balances
    } catch (err) {
      alert('Failed to save transaction')
      console.error(err)
    }
  }

  const handleEditClick = (transaction) => {
    setEditingTransaction(transaction)
    setNewTransaction({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || ''
    })
  }

  const handleDeleteTransaction = async (txnId) => {
    if (!confirm('Delete this entry?')) return
    try {
      const { error } = await supabase
        .from('export_customer_transactions')
        .delete()
        .eq('id', txnId)
      if (error) throw error
      fetchTransactions(selectedCustomer.id)
      fetchCustomers()
    } catch (err) {
      alert('Failed to delete')
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('export_customers')
        .update({
          name: editProfileData.name,
          email: editProfileData.email || null,
          address: editProfileData.address || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCustomer.id)

      if (error) throw error
      setIsEditingProfile(false)
      // Update in-memory
      setSelectedCustomer({ ...selectedCustomer, name: editProfileData.name, email: editProfileData.email, address: editProfileData.address })
      fetchCustomers()
    } catch (err) {
      alert('Failed to update profile')
    }
  }

  const exportCSV = () => {
    const rows = [
      ['Name', 'Phone', 'Email', 'Address', 'Balance', 'Balance Type'].join(',')
    ]
    filteredCustomers.forEach(c => {
      rows.push([
        `"${c.name || ''}"`,
        c.phone,
        c.email || '',
        `"${c.address || ''}"`,
        Math.abs(c.balance).toFixed(2),
        c.balance >= 0 ? 'Advance' : 'Udhar'
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export-customers-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  // Balance calculation from transactions
  const getBalance = () => {
    const totalAdvance = transactions
      .filter(t => t.type === 'advance')
      .reduce((s, t) => s + Number(t.amount), 0)
    const totalDeductions = transactions
      .filter(t => ['udhar', 'withdraw'].includes(t.type))
      .reduce((s, t) => s + Number(t.amount), 0)
    return totalAdvance - totalDeductions
  }

  // Stats
  const totalCustomers = customers.length
  const totalAdvanceHeld = customers.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0)
  const totalUdharOwed = customers.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0)

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

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Export Customers</h1>
              <p className="text-gray-600 mt-1">Manage your export business khatabook</p>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={exportCSV} className="flex items-center text-sm text-gray-600 hover:text-gray-800 border border-gray-200 bg-gray-50 rounded-md px-3 py-2">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
              <button onClick={() => setIsNewModalOpen(true)} className="btn btn-primary">
                + Add Customer
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-800">{totalCustomers}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-green-100 shadow-sm">
              <p className="text-sm text-green-600">Total Advance Held</p>
              <p className="text-2xl font-bold text-green-600">₹{totalAdvanceHeld.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-red-100 shadow-sm">
              <p className="text-sm text-red-600">Total Udhar Owed</p>
              <p className="text-2xl font-bold text-red-600">₹{totalUdharOwed.toLocaleString()}</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-white border-0 ring-1 ring-gray-200 rounded-lg py-2.5 text-sm focus:ring-2 focus:ring-primary-500 shadow-sm"
              />
            </div>
          </div>

          {/* Customers List */}
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-lg">No export customers yet</p>
              <p className="text-gray-400 text-sm mt-2">Add your first export customer to start tracking</p>
              <button onClick={() => setIsNewModalOpen(true)} className="btn btn-primary mt-4">
                + Add Customer
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <Avatar name={customer.name || '?'} />
                          <div>
                            <p className="font-semibold text-gray-900">{customer.name || 'Unknown'}</p>
                            {customer.email && <p className="text-xs text-gray-500">{customer.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{customer.address || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div>
                          <span className={`text-xs font-semibold uppercase ${customer.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {customer.balance >= 0 ? 'Advance' : 'Udhar'}
                          </span>
                          <p className={`text-lg font-bold ${customer.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{Math.abs(customer.balance).toLocaleString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openCustomerModal(customer)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          Open Khata
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Khata Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedCustomer(null); setIsEditingProfile(false); }}
          title={`${selectedCustomer?.name || 'Customer'} — Khata`}
          size="lg"
        >
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Profile Header */}
              {!isEditingProfile ? (
                <div className="flex items-start justify-between bg-gray-50 p-4 rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Avatar name={selectedCustomer.name || '?'} />
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{selectedCustomer.name}</h3>
                        <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                      </div>
                      <button onClick={() => {
                        setIsEditingProfile(true)
                        setEditProfileData({
                          name: selectedCustomer.name || '',
                          email: selectedCustomer.email || '',
                          address: selectedCustomer.address || ''
                        })
                      }} className="text-xs text-primary-600 hover:underline ml-2">Edit</button>
                    </div>
                    {selectedCustomer.email && <p className="text-sm text-gray-500">Email: {selectedCustomer.email}</p>}
                    {selectedCustomer.address && <p className="text-sm text-gray-500">Address: {selectedCustomer.address}</p>}
                  </div>
                  <div className="text-right">
                    {(() => {
                      const balance = getBalance()
                      return (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            {balance >= 0 ? 'Advance' : 'Udhar'}
                          </p>
                          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{Math.abs(balance).toFixed(2)}
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-700">Edit Profile</h3>
                    <button type="button" onClick={() => setIsEditingProfile(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Name</label>
                      <input type="text" value={editProfileData.name} onChange={e => setEditProfileData({...editProfileData, name: e.target.value})} className="input text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Email</label>
                      <input type="email" value={editProfileData.email} onChange={e => setEditProfileData({...editProfileData, email: e.target.value})} className="input text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700">Address</label>
                      <textarea value={editProfileData.address} onChange={e => setEditProfileData({...editProfileData, address: e.target.value})} className="input text-sm" rows="2" />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary text-sm">Save Profile</button>
                </form>
              )}

              {/* Add Entry Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {editingTransaction ? '✏️ Edit Entry' : '📝 New Entry'}
                  </h4>
                  {editingTransaction && (
                    <button
                      onClick={() => {
                        setEditingTransaction(null)
                        setNewTransaction({ type: 'advance', amount: '', description: '' })
                      }}
                      className="text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <form onSubmit={handleSaveTransaction} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={newTransaction.type}
                      onChange={e => setNewTransaction({...newTransaction, type: e.target.value})}
                    >
                      <option value="advance">Advance Received</option>
                      <option value="udhar">Udhar (Credit Given)</option>
                      <option value="withdraw">Cash Withdraw (Return Advance)</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={newTransaction.amount}
                      onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={newTransaction.description}
                      onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                      placeholder="Notes..."
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="submit"
                      className={`w-full text-white py-2 px-4 rounded-md text-sm font-medium transition-colors ${editingTransaction ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-primary-600 hover:bg-primary-700'}`}
                    >
                      {editingTransaction ? 'Update Entry' : 'Add Entry'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Transaction History */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Khata History</h4>
                  <button
                    onClick={() => setTransactionSortAsc(!transactionSortAsc)}
                    className="flex items-center text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    Date: {transactionSortAsc ? 'Oldest First' : 'Newest First'}
                  </button>
                </div>
                <div className="overflow-hidden border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactionLoading ? (
                        <tr><td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                      ) : transactions.length === 0 ? (
                        <tr><td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">No entries yet.</td></tr>
                      ) : (
                        [...transactions].sort((a, b) => {
                          const dateA = new Date(a.transaction_date)
                          const dateB = new Date(b.transaction_date)
                          return transactionSortAsc ? dateA - dateB : dateB - dateA
                        }).map((t) => (
                          <tr key={t.id} className={editingTransaction?.id === t.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 text-sm text-gray-600">{new Date(t.transaction_date).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                ${t.type === 'advance' ? 'bg-green-100 text-green-800' : t.type === 'withdraw' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                                {t.type === 'advance' ? 'ADVANCE' : t.type === 'withdraw' ? 'WITHDRAW' : 'UDHAR'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">{t.description || '-'}</td>
                            <td className={`px-4 py-2 text-sm font-medium text-right ${t.type === 'advance' ? 'text-green-600' : t.type === 'withdraw' ? 'text-orange-600' : 'text-red-600'}`}>
                              {t.type === 'advance' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-medium space-x-2">
                              <button onClick={() => handleEditClick(t)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                              <button onClick={() => handleDeleteTransaction(t.id)} className="text-red-400 hover:text-red-600">Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* New Customer Modal */}
        <Modal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Add Export Customer"
          size="md"
        >
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={newCustomerData.name}
                onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                value={newCustomerData.phone}
                onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value.replace(/\D/g, '')})}
                className="input"
                maxLength="10"
                placeholder="10-digit phone number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newCustomerData.email}
                onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={newCustomerData.address}
                onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})}
                className="input"
                rows="2"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <button type="submit" className="btn btn-primary flex-1">Save Customer</button>
              <button type="button" onClick={() => setIsNewModalOpen(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      </Layout>
    </ProtectedRoute>
  )
}
