import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'

// Helper Components
const Badge = ({ type }) => {
  const styles = {
    returning: 'bg-yellow-100 text-yellow-800',
    new: 'bg-green-100 text-green-800',
    vip: 'bg-purple-100 text-purple-800',
    banned: 'bg-red-100 text-red-800',
    active: 'bg-blue-100 text-blue-800'
  }
  
  const labels = {
    returning: 'Returning',
    new: 'New',
    vip: 'VIP',
    banned: 'Banned',
    active: 'Active'
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type] || 'bg-gray-100'}`}>
      {labels[type] || type}
    </span>
  )
}

const Avatar = ({ name }) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
    
  // Generate a strictly consistent color based on name length/char
  const colors = [
    'bg-red-200 text-red-800',
    'bg-blue-200 text-blue-800',
    'bg-green-200 text-green-800',
    'bg-yellow-200 text-yellow-800',
    'bg-purple-200 text-purple-800',
    'bg-pink-200 text-pink-800'
  ]
  const colorIndex = name.length % colors.length
  
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colors[colorIndex]}`}>
      {initials}
    </div>
  )
}

const StarRating = ({ rating }) => (
  <div className="flex text-yellow-400 text-xs space-x-0.5">
    <span>★</span>
    <span className="text-gray-600 font-medium ml-1">{rating.toFixed(1)}</span>
  </div>
)

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    fetchCustomers()
  }, [])

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // New Customer Modal State
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '', aadhaar_number: '', address: '' })

  const [zoomImage, setZoomImage] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [newTransaction, setNewTransaction] = useState({ type: 'advance', amount: '', description: '' })
  const [editingTransaction, setEditingTransaction] = useState(null)
  
  // State for profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editProfileData, setEditProfileData] = useState({ name: '', email: '', aadhaar_number: '', address: '' })
  const [editPhoto, setEditPhoto] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  
  // Transaction date sort state
  const [transactionSortAsc, setTransactionSortAsc] = useState(false)

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    if (!newCustomerData.phone || newCustomerData.phone.length !== 10) {
        alert("Please enter a valid 10-digit phone number")
        return
    }

    try {
        const { error } = await supabase
            .from('customers')
            .insert([{
                name: newCustomerData.name,
                phone: newCustomerData.phone,
                email: newCustomerData.email,
                aadhaar_number: newCustomerData.aadhaar_number,
                address: newCustomerData.address
            }])
        
        if (error) throw error

        setIsNewCustomerModalOpen(false)
        setNewCustomerData({ name: '', phone: '', email: '', aadhaar_number: '', address: '' })
        fetchCustomers()
        alert("Customer created successfully!")
    } catch (err) {
        console.error("Error creating customer:", err)
        alert("Failed to create customer: " + err.message)
    }
  }

  const openCustomerModal = async (customer) => {
      let profileId = customer.profile_id

      // Ensure customer exists in DB
      if (!profileId) {
          try {
              // Try to find existing first
              const { data: existing, error: findError } = await supabase
                  .from('customers')
                  .select('id')
                  .eq('phone', customer.phone)
                  .single()

              if (existing) {
                  profileId = existing.id
              } else {
                  // If not found, create new
                  const payload = { 
                      phone: customer.phone, 
                      name: customer.customer_name 
                  }
                  if (customer.aadhaar_number) {
                      payload.aadhaar_number = customer.aadhaar_number
                  }
                  if (customer.address) {
                      payload.address = customer.address
                  }

                  const { data, error } = await supabase
                      .from('customers')
                      .insert([payload])
                      .select()
                      .single()
                  
                  if (error) throw error
                  profileId = data.id
              }
              
              // Update local state to avoid re-creation
              customer.profile_id = profileId
              
              // Refresh main list quietly
              fetchCustomers()
          } catch (err) {
              console.error("Error creating/finding customer profile:", err)
              alert(`Could not initialize customer profile. Error: ${err.message || JSON.stringify(err)}`)
              return
          }
      }

      setSelectedCustomer({ ...customer, profile_id: profileId })
      setEditProfileData({
          name: customer.customer_name || '',
          email: customer.email || '',
          aadhaar_number: customer.aadhaar_number || '',
          address: customer.address || ''
      })
      setIsEditingProfile(false)
      setIsModalOpen(true)
      fetchTransactions(profileId)
      setEditingTransaction(null)
      setNewTransaction({ type: 'payment_in', amount: '', description: '' })
  }

  const handlePhotoUpload = async (file) => {
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

  const handleUpdateProfile = async (e) => {
      e.preventDefault()
      try {
          setUploadingPhoto(true)
          let photoUrl = selectedCustomer.aadhaar_photo_url

          // Upload new photo if selected
          if (editPhoto) {
              photoUrl = await handlePhotoUpload(editPhoto)
          }

          const updateData = {
              name: editProfileData.name,
              email: editProfileData.email,
              aadhaar_number: editProfileData.aadhaar_number,
              address: editProfileData.address
          }
          if (photoUrl) {
              updateData.aadhaar_photo_url = photoUrl
          }

          const { error } = await supabase
              .from('customers')
              .update(updateData)
              .eq('id', selectedCustomer.profile_id)

          if (error) throw error

          // Update local state immediately
          setSelectedCustomer(prev => ({
              ...prev,
              customer_name: editProfileData.name,
              email: editProfileData.email,
              aadhaar_number: editProfileData.aadhaar_number,
              address: editProfileData.address,
              aadhaar_photo_url: photoUrl || prev.aadhaar_photo_url
          }))
          
          setIsEditingProfile(false)
          setEditPhoto(null)
          fetchCustomers() // Refresh main list
      } catch (err) {
          console.error("Error updating profile:", err)
          alert("Failed to update profile: " + err.message)
      } finally {
          setUploadingPhoto(false)
      }
  }

  const fetchTransactions = async (customerId) => {
      setTransactionLoading(true)
      const { data, error } = await supabase
          .from('customer_transactions')
          .select('*')
          .eq('customer_id', customerId)
          .order('transaction_date', { ascending: false })
      
      if (data) setTransactions(data)
      setTransactionLoading(false)
  }

  const handleSaveTransaction = async (e) => {
      e.preventDefault()
      if (!selectedCustomer?.profile_id || !newTransaction.amount) return

      try {
          if (editingTransaction) {
             // Update existing
             const { error } = await supabase
              .from('customer_transactions')
              .update({
                  type: newTransaction.type,
                  amount: parseFloat(newTransaction.amount),
                  description: newTransaction.description
              })
              .eq('id', editingTransaction.id)

             if (error) throw error
          } else {
             // Create new
             const { error } = await supabase
              .from('customer_transactions')
              .insert([{
                  customer_id: selectedCustomer.profile_id,
                  type: newTransaction.type,
                  amount: parseFloat(newTransaction.amount),
                  description: newTransaction.description,
                  transaction_date: new Date().toISOString()
              }])

             if (error) throw error
          }
          
          setNewTransaction({ type: 'advance', amount: '', description: '' })
          setEditingTransaction(null)
          fetchTransactions(selectedCustomer.profile_id)
      } catch (err) {
          console.error("Error saving transaction:", err)
          alert("Failed to save transaction")
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

  const fetchCustomers = async () => {
    try {
      // 1. Fetch Sales Data
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (*)
          )
        `)
        .order('created_at', { ascending: false })

      if (salesError) throw salesError

      // 2. Fetch Real Customer Profiles (if table exists)
      const { data: profiles, error: profileError } = await supabase
        .from('customers')
        .select('*')
      
      // If table doesn't exist yet, profiles will be null/error, which we can ignore
      const profileMap = new Map()
      if (profiles) {
        profiles.forEach(p => profileMap.set(p.phone, p))
      }

      // Process for Activity Log (Last 10 sales)
      const activity = salesData.slice(0, 10).map(sale => ({
        id: sale.id,
        user: sale.customer_name,
        action: 'made a purchase',
        amount: sale.sale_items.reduce((s, i) => s + (i.price_at_sale * i.quantity), 0),
        time: new Date(sale.created_at)
      }))
      setRecentActivity(activity)

      // Group by Customer from Sales
      const customerMap = new Map()

      salesData?.forEach(sale => {
        const key = sale.phone
        
        if (!customerMap.has(key)) {
          // Initialize with real profile data if available
          const profile = profileMap.get(key) || {}
          
          customerMap.set(key, {
            id: key, // phone as ID for grouping
            profile_id: profile.id, // Real UUID from DB
            customer_name: profile.name || sale.customer_name, // Prefer profile name
            phone: sale.phone,
            email: profile.email || '', 
            aadhaar_number: profile.aadhaar_number || sale.aadhaar_number || '',
            aadhaar_photo_url: profile.aadhaar_photo_url || sale.aadhaar_photo_url || null,
            address: profile.address || '',
            purchases: [],
            totalSpent: 0,
            totalPurchases: 0,
            rating: profile.rating || 5.0, // Use real rating or default
            notes: profile.notes || '',
            is_vip: profile.is_vip || false,
            is_banned: profile.is_banned || false,
            lastOrderDate: null
          })
        }

        const customer = customerMap.get(key)
        const saleTotal = sale.sale_items.reduce((sum, item) => sum + (item.price_at_sale * item.quantity), 0)

        customer.purchases.push({ ...sale, total: saleTotal })
        customer.totalSpent += saleTotal
        customer.totalPurchases += 1
        
        const saleDate = new Date(sale.created_at)
        if (!customer.lastOrderDate || saleDate > customer.lastOrderDate) {
          customer.lastOrderDate = saleDate
        }
      })

      // Add badges and finalize
      const processedCustomers = Array.from(customerMap.values()).map(c => {
        const badges = []
        
        // Logic for badges
        if (c.is_banned) badges.push('banned')
        else if (c.is_vip) badges.push('vip') // Explicit VIP from DB
        else if (c.totalPurchases > 1) badges.push('returning')
        else badges.push('new')
        
        // Auto-VIP logic if not set in DB
        if (!c.is_vip && c.totalSpent > 10000) badges.push('vip')
        
        // Determine favorite items
        const itemCounts = {}
        c.purchases.forEach(p => {
            p.sale_items.forEach(item => {
                const pName = item.products?.name || 'Unknown Item'
                itemCounts[pName] = (itemCounts[pName] || 0) + item.quantity
            })
        })
        const FavoriteItems = Object.entries(itemCounts)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name]) => name)

        return { ...c, badges, FavoriteItems }
      }).sort((a, b) => b.lastOrderDate - a.lastOrderDate)

      setCustomers(processedCustomers)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleBlockCustomer = async (customer, e) => {
    if (e) e.stopPropagation()
    const newStatus = !customer.is_banned
    const action = newStatus ? 'block' : 'unblock'
    if (!confirm(`Are you sure you want to ${action} ${customer.customer_name}?`)) return

    try {
      if (customer.profile_id) {
        const { error } = await supabase
          .from('customers')
          .update({ is_banned: newStatus })
          .eq('id', customer.profile_id)
        if (error) throw error
      } else {
        // Create a customer profile if one doesn't exist
        const { error } = await supabase
          .from('customers')
          .insert({ name: customer.customer_name, phone: customer.phone, is_banned: newStatus })
        if (error) throw error
      }
      fetchCustomers()
    } catch (err) {
      console.error('Error blocking customer:', err)
      alert('Failed to update customer status')
    }
  }

  const exportCustomersCSV = () => {
    const rows = [
      ['Name', 'Phone', 'Email', 'Aadhaar', 'Purchases', 'Total Spent', 'Status', 'Last Order'].join(',')
    ]
    filteredCustomers.forEach(c => {
      rows.push([
        `"${c.customer_name}"`,
        c.phone,
        c.email || '',
        c.aadhaar_number || '',
        c.totalPurchases,
        c.totalSpent.toFixed(2),
        c.is_banned ? 'Blocked' : (c.is_vip ? 'VIP' : 'Active'),
        c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : ''
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-export-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredCustomers = customers.filter(c => 
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  // Stats
  const totalCustomers = customers.length
  const newToday = customers.filter(c => {
    const today = new Date()
    const last = new Date(c.lastOrderDate)
    return c.totalPurchases === 1 && 
           last.getDate() === today.getDate() && 
           last.getMonth() === today.getMonth()
  }).length
  const returningCount = customers.filter(c => c.totalPurchases > 1).length

  return (
    <ProtectedRoute>
      <Layout>
        <div className="flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto min-h-[calc(100vh-100px)]">
          
          {/* LEFT COLUMN - MAIN LIST */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                <div className="bg-gray-100 rounded-lg p-1 flex text-sm">
                  <button className="px-3 py-1 bg-white shadow-sm rounded-md font-medium text-gray-900">Returning & New</button>
                  {/* Uncomment to add simplified filter tabs if needed */}
                  {/* <button className="px-3 py-1 text-gray-500 hover:text-gray-900">Banned</button> */}
                </div>
              </div>
              <button 
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="text-primary-600 font-semibold hover:text-primary-700 flex items-center"
              >
                <span className="text-xl mr-1">+</span> New Customer
              </button>
              <button 
                onClick={exportCustomersCSV}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 border border-gray-200 bg-gray-50 rounded-md px-3 py-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
               <div className="relative max-w-md">
                 <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </span>
                 <input 
                    type="text" 
                    placeholder="Search customers..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full bg-white border-0 ring-1 ring-gray-200 rounded-lg py-2.5 text-sm focus:ring-2 focus:ring-primary-500 shadow-sm"
                 />
               </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
               <div className="col-span-4">Name</div>
               <div className="col-span-2 text-center">Rating</div>
               <div className="col-span-2 text-center">Orders</div>
               <div className="col-span-2 text-right">LTV</div>
               <div className="col-span-2 text-right">Last Order</div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-10 text-gray-500">Loading customer data...</div>
              ) : filteredCustomers.map(customer => (
                <div key={customer.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm transition-all duration-200 ${expandedId === customer.id ? 'ring-2 ring-primary-50/50 shadow-md' : 'hover:shadow-md'}`}>
                  
                  {/* Row Main Content */}
                  <div 
                    onClick={() => toggleExpand(customer.id)}
                    className="grid grid-cols-12 gap-4 px-4 py-4 items-center cursor-pointer group"
                  >
                    {/* Name & Badges */}
                    <div className="col-span-4 flex items-center space-x-3">
                      <div className="flex-shrink-0">
                         <Avatar name={customer.customer_name} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{customer.customer_name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {customer.badges.map(b => <Badge key={b} type={b} />)}
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="col-span-2 flex justify-center">
                       <StarRating rating={customer.rating} />
                    </div>

                    {/* Orders */}
                    <div className="col-span-2 text-center text-sm font-medium text-gray-900">
                      {customer.totalPurchases}
                    </div>

                    {/* LTV */}
                    <div className="col-span-2 text-right text-sm font-medium text-gray-900">
                      ₹{customer.totalSpent.toLocaleString()}
                    </div>

                    {/* Last Order & Expand Icon */}
                    <div className="col-span-2 flex items-center justify-end space-x-3">
                      <div className="text-right">
                         <p className="text-sm text-gray-500">{new Date(customer.lastOrderDate).toLocaleDateString()}</p>
                         <p className="text-xs text-gray-400">
                             {Math.floor((new Date() - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24))}d ago
                         </p>
                      </div>
                      <div className={`transform transition-transform duration-200 text-gray-300 group-hover:text-gray-500 ${expandedId === customer.id ? 'rotate-180' : ''}`}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedId === customer.id && (
                    <div className="px-4 pb-6 pt-2 border-t border-gray-50 bg-gray-50/30 rounded-b-xl flex flex-col md:flex-row gap-8 animate-fadeIn">
                       {/* Left: Orders List */}
                       <div className="flex-1">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Orders</h4>
                          <div className="space-y-2">
                             {customer.purchases.slice(0, 5).map(order => (
                                <div key={order.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-100">
                                   <div className="flex items-center space-x-3">
                                      <span className="text-gray-500">#{order.id.toString().slice(0,6)}</span>
                                      <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs rounded">Completed</span>
                                   </div>
                                   <div className="flex items-center space-x-4">
                                       <span className="text-gray-600 font-medium">₹{order.total}</span>
                                       <span className="text-gray-400 text-xs">{new Date(order.created_at).toLocaleDateString()}</span>
                                   </div>
                                </div>
                             ))}
                             {customer.purchases.length > 5 && (
                                <button className="text-xs text-primary-600 hover:text-primary-800 font-medium mt-1">
                                    Show all {customer.purchases.length} orders
                                </button>
                             )}
                          </div>
                       </div>

                       {/* Right: Insights */}
                       <div className="w-full md:w-1/3 space-y-4">
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact Info</h4>
                             
                             {/* Customer Image */}
                             {customer.aadhaar_photo_url && (
                                <div className="mb-4 group relative cursor-pointer" onClick={() => setZoomImage(customer.aadhaar_photo_url)}>
                                    <img 
                                        src={customer.aadhaar_photo_url} 
                                        alt={customer.customer_name} 
                                        className="w-full h-32 object-cover rounded-lg border border-gray-200 transition-opacity group-hover:opacity-90"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                                        <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                    </div>
                                </div>
                             )}

                             <div className="space-y-1">
                                <p className="text-sm text-gray-700 flex items-center">
                                   <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                   {customer.phone}
                                </p>
                                {customer.email && (
                                   <p className="text-sm text-gray-700 flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                      {customer.email}
                                   </p>
                                )}
                                {customer.aadhaar_number && (
                                   <p className="text-sm text-gray-700 flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                      Aadhaar: {customer.aadhaar_number}
                                   </p>
                                )}
                             </div>
                          </div>
 
                          {/* Address info */}
                          {customer.address && (
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Address</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.address}</p>
                            </div>
                          )}

                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h4>
                            {customer.notes ? (
                                <p className="text-sm text-gray-600 italic">"{customer.notes}"</p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No notes added.</p>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Favorite Items</h4>
                            <div className="flex flex-wrap gap-2">
                                {customer.FavoriteItems.map(item => (
                                    <span key={item} className="px-2 py-1 bg-white border border-gray-200 text-gray-600 text-xs rounded hover:bg-gray-50 transition-colors">
                                        {item}
                                    </span>
                                ))}
                            </div>
                          </div>

                          <div className="flex space-x-2 pt-2">
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openCustomerModal(customer);
                                }}
                                className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                              >
                                View Payment History
                              </button>
                              <button 
                                onClick={(e) => handleBlockCustomer(customer, e)}
                                className={`px-3 py-1.5 text-xs font-medium rounded border ${
                                  customer.is_banned 
                                    ? 'text-green-600 bg-white border-gray-300 hover:bg-green-50' 
                                    : 'text-red-600 bg-white border-gray-300 hover:bg-red-50'
                                }`}
                              >
                                {customer.is_banned ? 'Unblock' : 'Block'}
                              </button>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN - STATS SIDEBAR */}
          <div className="w-full lg:w-80 space-y-8 pl-0 lg:pl-8 lg:border-l border-gray-200">
            {/* Overview Section */}
            <div>
               <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Overview</h3>
               
               <div className="space-y-6">
                 <div>
                    <div className="text-sm text-gray-500 mb-1">Total Customers</div>
                    <div className="text-3xl font-bold text-gray-900">{totalCustomers.toLocaleString()}</div>
                 </div>

                 <div>
                    <div className="text-sm text-gray-500 mb-1">New Today</div>
                    <div className="flex items-baseline space-x-2">
                       <span className="text-3xl font-bold text-gray-900">{newToday}</span>
                    </div>
                 </div>

                 <div>
                    <div className="text-sm text-gray-500 mb-1">Returning</div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-bold text-gray-900">{returningCount}</span>
                    </div>
                 </div>
               </div>
            </div>

            {/* Activity Log */}
            <div>
               <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 border-t pt-8">Activity Log</h3>
               <div className="space-y-6 relative">
                  {/* Vertical line filler */}
                  <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-gray-100 -z-10"></div>
                  
                  {recentActivity.map((log, i) => (
                    <div key={i} className="flex space-x-3 relative bg-gray-50/0">
                       <div className="flex-shrink-0 mt-1">
                          <div className={`w-3 h-3 rounded-full border-2 border-white ring-1 ${i === 0 ? 'bg-primary-500 ring-primary-100' : 'bg-gray-300 ring-gray-100'}`}></div>
                       </div>
                       <div>
                          <p className="text-sm text-gray-600 leading-snug">
                             <span className="font-medium text-gray-900">{log.user}</span> has {log.action}
                             {log.amount > 0 && <span className="text-gray-900 font-medium"> ₹{log.amount}</span>}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                             {Math.floor((new Date() - log.time) / 1000 / 60)} min ago
                          </p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
        
      {/* Customer Ledger Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCustomer ? `Payment History: ${selectedCustomer.customer_name}` : 'Customer Details'}
        size="lg"
      >
        {selectedCustomer && (
          <div className="space-y-6">
             {/* Header Info / Edit Profile */}
             <div className="bg-gray-50 p-4 rounded-lg">
                {!isEditingProfile ? (
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.customer_name}</h3>
                                <button onClick={() => setIsEditingProfile(true)} className="text-xs text-white bg-red-500 p-1 rounded-md hover:underline">Edit Profile</button>
                            </div>
                            <p className="text-sm text-gray-500">Phone: <span className="text-gray-900 font-medium">{selectedCustomer.phone}</span></p>
                            {selectedCustomer.aadhaar_number && <p className="text-sm text-gray-500">Aadhaar: <span className="text-gray-900 font-medium">{selectedCustomer.aadhaar_number}</span></p>}
                            <p className="text-sm text-gray-500">Email: <span className="text-gray-900 font-medium">{selectedCustomer.email || '-'}</span></p>
                            {selectedCustomer.address && (
                                <p className="text-sm text-gray-500 mt-1">
                                    Address: <span className="text-gray-900 font-medium">{selectedCustomer.address}</span>
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                        {(() => {
                            const totalAdvance = transactions.filter(t => ['advance', 'credit', 'payment_in'].includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
                            const totalDeductions = transactions.filter(t => ['udhar', 'debit', 'payment_out', 'withdraw'].includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
                            const balance = totalAdvance - totalDeductions; 
                            
                            return (
                                <div className="text-right">
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
                    <form onSubmit={handleUpdateProfile} className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-700">Edit Profile</h3>
                            <button type="button" onClick={() => { setIsEditingProfile(false); setEditPhoto(null); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Name</label>
                                <input 
                                    type="text" 
                                    value={editProfileData.name} 
                                    onChange={e => setEditProfileData({...editProfileData, name: e.target.value})}
                                    className="w-full text-sm border-gray-300 rounded p-1"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Email</label>
                                <input 
                                    type="email" 
                                    value={editProfileData.email} 
                                    onChange={e => setEditProfileData({...editProfileData, email: e.target.value})}
                                    className="w-full text-sm border-gray-300 rounded p-1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Aadhaar</label>
                                <input 
                                    type="text" 
                                    value={editProfileData.aadhaar_number} 
                                    onChange={e => setEditProfileData({...editProfileData, aadhaar_number: e.target.value})}
                                    className="w-full text-sm border-gray-300 rounded p-1"
                                    maxLength="12"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Photo</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={e => {
                                        const file = e.target.files[0]
                                        if (file) {
                                            if (!file.type.startsWith('image/')) {
                                                alert('Please upload an image file')
                                                return
                                            }
                                            if (file.size > 5 * 1024 * 1024) {
                                                alert('File size must be less than 5MB')
                                                return
                                            }
                                            setEditPhoto(file)
                                        }
                                    }}
                                    className="w-full text-xs border-gray-300 rounded p-1"
                                />
                                {selectedCustomer.aadhaar_photo_url && !editPhoto && (
                                    <p className="text-xs text-green-600 mt-1">✓ Existing photo on file</p>
                                )}
                                {editPhoto && (
                                    <p className="text-xs text-blue-600 mt-1">New photo selected: {editPhoto.name}</p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700">Address</label>
                                <textarea 
                                    value={editProfileData.address} 
                                    onChange={e => setEditProfileData({...editProfileData, address: e.target.value})}
                                    className="w-full text-sm border-gray-300 rounded p-1"
                                    rows="2"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={uploadingPhoto} className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50">
                                {uploadingPhoto ? 'Uploading...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
             </div>

             {/* Add Transaction Form */}
             <div className={`border rounded-lg p-4 ${editingTransaction ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                 <div className="flex justify-between items-center mb-3">
                    <h4 className={`text-sm font-semibold ${editingTransaction ? 'text-yellow-800' : 'text-gray-900'}`}>
                        {editingTransaction ? 'Edit Transaction' : 'Add Entry'}
                    </h4>
                    {editingTransaction && (
                        <button 
                            onClick={() => {
                                setEditingTransaction(null)
                                setNewTransaction({ type: 'payment_in', amount: '', description: '' })
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
                    <div className="col-span-1 md:col-span-1">
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
                    <h4 className="text-sm font-semibold text-gray-900">History</h4>
                    <button 
                        onClick={() => setTransactionSortAsc(!transactionSortAsc)}
                        className="flex items-center text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1"
                    >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                        Date: {transactionSortAsc ? 'Oldest First' : 'Newest First'}
                    </button>
                </div>
                <div className="overflow-hidden border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
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
                             <tr><td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">Loading history...</td></tr>
                         ) : transactions.length === 0 ? (
                             <tr><td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">No transactions recorded.</td></tr>
                         ) : (
                             [...transactions].sort((a, b) => {
                                 const dateA = new Date(a.transaction_date)
                                 const dateB = new Date(b.transaction_date)
                                 return transactionSortAsc ? dateA - dateB : dateB - dateA
                             }).map((t) => (
                                <tr key={t.id} className={editingTransaction?.id === t.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                                   <td className="px-4 py-2 text-sm text-gray-600">{new Date(t.transaction_date).toLocaleDateString()}</td>
                                   <td className="px-4 py-2 text-sm">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                         ${['advance', 'payment_in', 'credit'].includes(t.type) ? 'bg-green-100 text-green-800' : t.type === 'withdraw' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                                         {t.type === 'advance' || t.type === 'payment_in' || t.type === 'credit' ? 'ADVANCE' : t.type === 'withdraw' ? 'WITHDRAW' : 'UDHAR'}
                                      </span>
                                   </td>
                                   <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">{t.description || '-'}</td>
                                   <td className={`px-4 py-2 text-sm font-medium text-right ${['advance', 'payment_in', 'credit'].includes(t.type) ? 'text-green-600' : t.type === 'withdraw' ? 'text-orange-600' : 'text-red-600'}`}>
                                      {['advance', 'payment_in', 'credit'].includes(t.type) ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                                   </td>
                                   <td className="px-4 py-2 text-right text-sm font-medium">
                                      <button 
                                        onClick={() => handleEditClick(t)}
                                        className="text-indigo-600 hover:text-indigo-900"
                                      >
                                        Edit
                                      </button>
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

      {/* Image Zoom Modal */}
      <Modal
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
        title="Details"
        size="xl"
      >
        {zoomImage && (
            <div className="flex justify-center bg-black/5 rounded-lg p-2">
                <img 
                    src={zoomImage} 
                    alt="Zoomed Customer ID" 
                    className="max-h-[80vh] max-w-full rounded shadow-lg object-contain" 
                />
            </div>
        )}
      </Modal>
      {/* Create New Customer Modal */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        title="Register New Customer"
        size="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
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
                    placeholder="10 digit mobile number"
                    required 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                    type="email" 
                    value={newCustomerData.email} 
                    onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})}
                    className="input"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <input 
                    type="text" 
                    value={newCustomerData.aadhaar_number} 
                    onChange={e => setNewCustomerData({...newCustomerData, aadhaar_number: e.target.value.replace(/\D/g, '')})}
                    className="input"
                    maxLength="12"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea 
                    value={newCustomerData.address} 
                    onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})}
                    className="input"
                    rows="3"
                />
            </div>
            <div className="pt-2 flex justify-end gap-3">
                <button 
                    type="button" 
                    onClick={() => setIsNewCustomerModalOpen(false)}
                    className="btn btn-secondary"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    className="btn btn-primary"
                >
                    Register Customer
                </button>
            </div>
        </form>
      </Modal>

      </Layout>
    </ProtectedRoute>
  )
}
