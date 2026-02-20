import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Modal from '@/components/Modal'
import { supabase } from '@/lib/supabase'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [restockProduct, setRestockProduct] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    current_stock: 0,
    unit_price: 0
  })

  const [restockAmount, setRestockAmount] = useState(0)
  const [restockCost, setRestockCost] = useState('')

  // Product history state
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyProduct, setHistoryProduct] = useState(null)
  const [productHistory, setProductHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySortAsc, setHistorySortAsc] = useState(false)
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      setError('Failed to fetch products: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductHistory = async (product) => {
    setHistoryLoading(true)
    setHistoryProduct(product)
    setShowHistoryModal(true)
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          *,
          sales (
            id,
            customer_name,
            phone,
            created_at
          )
        `)
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProductHistory(data || [])
    } catch (err) {
      console.error('Failed to fetch product history:', err)
      setProductHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const getFilteredHistory = () => {
    let filtered = [...productHistory]
    
    if (historyDateFrom) {
      filtered = filtered.filter(item => new Date(item.sales?.created_at) >= new Date(historyDateFrom))
    }
    if (historyDateTo) {
      const toDate = new Date(historyDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(item => new Date(item.sales?.created_at) <= toDate)
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.sales?.created_at)
      const dateB = new Date(b.sales?.created_at)
      return historySortAsc ? dateA - dateB : dateB - dateA
    })
    
    return filtered
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            unit_price: parseFloat(formData.unit_price)
          })
          .eq('id', editingProduct.id)

        if (error) throw error
        setSuccess('Product updated successfully!')
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert([{
            name: formData.name,
            sku: formData.sku,
            current_stock: parseInt(formData.current_stock),
            unit_price: parseFloat(formData.unit_price)
          }])

        if (error) throw error
        setSuccess('Product created successfully!')
      }

      fetchProducts()
      resetForm()
      setShowModal(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRestock = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      // Update stock
      const { error: updateError } = await supabase
        .from('products')
        .update({
          current_stock: restockProduct.current_stock + parseInt(restockAmount)
        })
        .eq('id', restockProduct.id)

      if (updateError) throw updateError

      // Record movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert([{
          product_id: restockProduct.id,
          type: 'restock',
          quantity_change: parseInt(restockAmount),
          unit_cost: restockCost ? parseFloat(restockCost) : null,
          notes: 'Manual restock'
        }])

      if (movementError) throw movementError

      setSuccess(`Restocked ${restockAmount} units successfully!`)
      fetchProducts()
      setShowRestockModal(false)
      setRestockProduct(null)
      setRestockAmount(0)
      setRestockCost('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeactivate = async (product) => {
    if (!confirm(`Are you sure you want to deactivate "${product.name}"?`)) return

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', product.id)

      if (error) throw error
      setSuccess('Product deactivated successfully!')
      fetchProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleActivate = async (product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: true })
        .eq('id', product.id)

      if (error) throw error
      setSuccess('Product activated successfully!')
      fetchProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      current_stock: product.current_stock,
      unit_price: product.unit_price
    })
    setShowModal(true)
  }

  const openRestockModal = (product) => {
    setRestockProduct(product)
    setRestockAmount(0)
    setRestockCost('')
    setShowRestockModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      current_stock: 0,
      unit_price: 0
    })
    setEditingProduct(null)
  }

  const exportProductsCSV = () => {
    const rows = [
      ['Name', 'SKU', 'Current Stock', 'Unit Price', 'Est. Value', 'Status'].join(',')
    ]
    products.forEach(p => {
      rows.push([
        `"${p.name}"`,
        p.sku || '',
        p.current_stock,
        parseFloat(p.unit_price).toFixed(2),
        (p.current_stock * parseFloat(p.unit_price)).toFixed(2),
        p.is_active ? 'Active' : 'Inactive'
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-export-${new Date().toISOString().slice(0,10)}.csv`
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
              <h1 className="text-3xl font-bold text-gray-900">Products</h1>
              <p className="text-gray-600 mt-1">Manage your inventory</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportProductsCSV}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 border border-gray-200 bg-gray-50 rounded-md px-3 py-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
                className="btn btn-primary"
              >
                + Add Product
              </button>
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


          {/* Products Grid/Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                 <p className="mt-4 text-gray-500">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
                <div className="mt-6">
                  <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
                    + Add Product
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Value</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => {
                       const stockValue = product.current_stock * product.unit_price;
                       const stockStatus = product.current_stock === 0 ? 'out' : product.current_stock < 10 ? 'low' : 'good';
                       const statusColors = {
                          out: 'bg-red-100 text-red-800',
                          low: 'bg-yellow-100 text-yellow-800',
                          good: 'bg-green-100 text-green-800'
                       };
                       const statusLabels = {
                          out: 'Out of Stock',
                          low: `Low Stock (${product.current_stock})`,
                          good: `${product.current_stock} in Stock`
                       };

                       return (
                      <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${!product.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                        {/* Info */}
                        <td className="px-6 py-4">
                           <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-500">
                                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                              </div>
                              <div className="ml-4">
                                 <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                 <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                              </div>
                           </div>
                        </td>
                        
                        {/* Stock */}
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[stockStatus]}`}>
                              {statusLabels[stockStatus]}
                           </span>
                           {!product.is_active && <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">Inactive</span>}
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                           ₹{parseFloat(product.unit_price).toFixed(2)}
                        </td>

                        {/* Value */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                           ₹{stockValue.toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <div className="flex justify-end space-x-3">
                              {product.is_active ? (
                                <>
                                  <button onClick={() => fetchProductHistory(product)} className="text-indigo-600 hover:text-indigo-900 flex items-center" title="Sales History">
                                     <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                     History
                                  </button>
                                  <button onClick={() => openRestockModal(product)} className="text-green-600 hover:text-green-900 flex items-center" title="Restock">
                                     <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                     Restock
                                  </button>
                                  <button onClick={() => openEditModal(product)} className="text-blue-600 hover:text-blue-900 flex items-center" title="Edit">
                                     <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                  <button onClick={() => handleDeactivate(product)} className="text-gray-400 hover:text-red-600" title="Deactivate">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </button>
                                </>
                              ) : (
                                  <button onClick={() => handleActivate(product)} className="text-green-600 hover:text-green-900 flex items-center">
                                     Activate
                                  </button>
                              )}
                           </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add/Edit Product Modal */}
          <Modal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false)
              resetForm()
            }}
            title={editingProduct ? 'Edit Product' : 'Add New Product'}
            size="lg"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="bg-gray-50 -mx-6 -mt-4 px-6 py-4 border-b border-gray-100 flex items-center space-x-3 mb-6">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <div>
                      <p className="text-sm font-medium text-gray-900">Product Details</p>
                      <p className="text-xs text-gray-500">Basic information about the item</p>
                  </div>
               </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Product Name
                    </label>
                    <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g. Basmati Rice (5kg)"
                    required
                    />
                </div>

                <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    SKU / Barcode
                    </label>
                    <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className={`w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 ${editingProduct ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="e.g. BR-001"
                    disabled={!!editingProduct}
                    required
                    />
                </div>

                <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Unit Price (₹)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                        type="number"
                        step="0.01"
                        value={formData.unit_price}
                        onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 pl-7"
                        placeholder="0.00"
                        min="0"
                        required
                        />
                    </div>
                </div>

                 {!editingProduct && (
                    <div className="col-span-2 bg-yellow-50 p-3 rounded-md border border-yellow-100 flex items-start space-x-3">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-yellow-800 uppercase tracking-wider mb-1">
                                Initial Stock
                            </label>
                            <input
                                type="number"
                                value={formData.current_stock}
                                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                                className="w-full text-sm border-yellow-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 bg-white"
                                placeholder="0"
                                min="0"
                                required
                            />
                            <p className="text-xs text-yellow-700 mt-1">Starting inventory count.</p>
                        </div>
                    </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Restock Modal */}
          <Modal
            isOpen={showRestockModal}
            onClose={() => {
              setShowRestockModal(false)
              setRestockProduct(null)
              setRestockAmount(0)
            }}
            title="Restock Product"
            size="sm"
          >
            {restockProduct && (
              <form onSubmit={handleRestock} className="space-y-5">
                <div className="bg-gray-50 -mx-6 -mt-4 px-6 py-4 border-b border-gray-100 mb-2">
                   <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{restockProduct.name}</p>
                        <p className="text-xs text-gray-500">Current Stock: {restockProduct.current_stock} units</p>
                      </div>
                      <div className="bg-white px-2 py-1 rounded border border-gray-200 text-xs font-mono text-gray-600">
                         {restockProduct.sku}
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Units to Add
                        </label>
                        <div className="flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                +
                            </span>
                            <input
                                type="number"
                                value={restockAmount}
                                onChange={(e) => setRestockAmount(e.target.value)}
                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-green-500 focus:border-green-500 sm:text-sm text-green-700 font-bold"
                                min="1"
                                placeholder="0"
                                required
                            />
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Unit Cost (Optional)
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₹</span>
                            </div>
                            <input
                            type="number"
                            step="0.01"
                            value={restockCost}
                            onChange={(e) => setRestockCost(e.target.value)}
                            className="block w-full pl-7 px-3 py-2 border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            placeholder="0.00"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">Your purchase price per unit.</p>
                    </div>
                </div>

                {restockAmount > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-green-700 font-medium uppercase tracking-wider">New Stock Level</p>
                        <p className="text-xs text-green-600 mt-0.5">After restocking</p>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {restockProduct.current_stock + parseInt(restockAmount)}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestockModal(false)
                      setRestockProduct(null)
                      setRestockAmount(0)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Confirm Restock
                  </button>
                </div>
              </form>
            )}
          </Modal>

          {/* Product Sales History Modal */}
          <Modal
            isOpen={showHistoryModal}
            onClose={() => {
              setShowHistoryModal(false)
              setHistoryProduct(null)
              setProductHistory([])
              setHistoryDateFrom('')
              setHistoryDateTo('')
            }}
            title={historyProduct ? `Sales History: ${historyProduct.name}` : 'Product History'}
            size="lg"
          >
            {historyProduct && (
              <div className="space-y-4">
                {/* Product Summary */}
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">{historyProduct.name}</h3>
                    <p className="text-sm text-gray-500">SKU: {historyProduct.sku} | Current Stock: {historyProduct.current_stock}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Sold</p>
                    <p className="text-2xl font-bold text-primary-600">
                      {getFilteredHistory().reduce((sum, item) => sum + item.quantity, 0)} units
                    </p>
                    <p className="text-sm text-gray-500">
                      ₹{getFilteredHistory().reduce((sum, item) => sum + (parseFloat(item.price_at_sale) * item.quantity), 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Date Filters */}
                <div className="flex flex-wrap items-end gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                    <input 
                      type="date" 
                      value={historyDateFrom}
                      onChange={(e) => setHistoryDateFrom(e.target.value)}
                      className="text-sm border-gray-300 rounded-md p-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                    <input 
                      type="date" 
                      value={historyDateTo}
                      onChange={(e) => setHistoryDateTo(e.target.value)}
                      className="text-sm border-gray-300 rounded-md p-1.5"
                    />
                  </div>
                  <button 
                    onClick={() => setHistorySortAsc(!historySortAsc)}
                    className="flex items-center text-xs text-gray-600 hover:text-gray-800 border border-gray-200 bg-white rounded px-2 py-1.5"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    {historySortAsc ? 'Oldest First' : 'Newest First'}
                  </button>
                  {(historyDateFrom || historyDateTo) && (
                    <button 
                      onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* History Table */}
                <div className="overflow-hidden border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyLoading ? (
                        <tr><td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">Loading history...</td></tr>
                      ) : getFilteredHistory().length === 0 ? (
                        <tr><td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500">No sales found for this product.</td></tr>
                      ) : (
                        getFilteredHistory().map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {item.sales?.created_at ? new Date(item.sales.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 font-medium">{item.sales?.customer_name || '-'}</td>
                            <td className="px-4 py-2 text-sm text-center text-gray-700">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-600">₹{parseFloat(item.price_at_sale).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-green-600">₹{(parseFloat(item.price_at_sale) * item.quantity).toFixed(2)}</td>
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
