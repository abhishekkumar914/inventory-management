// Validation utilities

export const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/
  return phoneRegex.test(phone)
}

export const validateAadhaar = (aadhaar) => {
  const aadhaarRegex = /^\d{12}$/
  return aadhaarRegex.test(aadhaar)
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateSKU = (sku) => {
  // SKU should be alphanumeric and at least 3 characters
  const skuRegex = /^[A-Za-z0-9]{3,}$/
  return skuRegex.test(sku)
}

export const validatePrice = (price) => {
  const numPrice = parseFloat(price)
  return !isNaN(numPrice) && numPrice >= 0
}

export const validateStock = (stock) => {
  const numStock = parseInt(stock)
  return !isNaN(numStock) && numStock >= 0 && Number.isInteger(numStock)
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// File validation
export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!file) {
    return { valid: false, error: 'No file selected' }
  }

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or WEBP.' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' }
  }

  return { valid: true }
}

// Error handling
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)

  // Handle specific error codes
  if (error.code === '23505') {
    return 'This record already exists. Please use a different identifier.'
  }

  if (error.code === '23503') {
    return 'Cannot complete operation due to related records.'
  }

  if (error.message.includes('Insufficient stock')) {
    return error.message
  }

  return error.message || 'An unexpected error occurred'
}
