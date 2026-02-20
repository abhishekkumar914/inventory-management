# Quick Start Guide - Inventory Management Dashboard

## 🚀 Get Started in 5 Minutes

### Prerequisites
- [ ] Node.js 18+ installed ([Download](https://nodejs.org/))
- [ ] Supabase account ([Sign up free](https://supabase.com))

### Step 1: Install Dependencies (1 min)
```bash
npm install
```

### Step 2: Supabase Setup (2 min)

1. **Create Project** at supabase.com
2. **Get Credentials**: Project Settings → API
   - Copy Project URL
   - Copy anon/public key

3. **Run Migrations**: SQL Editor → New Query
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_security_policies.sql`

4. **Create Storage**: Storage → New Bucket
   - Name: `documents`
   - Public: ✅ Yes

### Step 3: Environment Setup (1 min)

```bash
# Copy template
copy .env.local.example .env.local

# Edit .env.local with your values
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourPassword123!
```

### Step 4: Update Config (30 sec)

Edit `next.config.js`:
```javascript
images: {
  domains: ['xxxxx.supabase.co'], // Your Supabase project ID
},
```

### Step 5: Launch (30 sec)

```bash
npm run dev
```

Open: **http://localhost:3000**

---

## 🎯 First Actions

### 1. Login
- Username: `admin` (from .env.local)
- Password: (from .env.local)

### 2. Add Your First Product
1. Go to **Products** page
2. Click **+ Add Product**
3. Fill in:
   - Name: "Sample Product"
   - SKU: "PROD-001"
   - Stock: 100
   - Price: 999
4. Click **Add Product**

### 3. Create Your First Sale
1. Go to **Sales** page
2. Click **+ New Sale**
3. Fill in customer details:
   - Name: "John Doe"
   - Phone: "9876543210"
   - Aadhaar: "123456789012"
4. Select product and quantity
5. Click **Create Sale**

### 4. View Analytics
1. Go to **Dashboard**
2. See your metrics and charts
3. Explore sales trends

---

## 📚 Quick Reference

### File Upload Requirements
- **Format**: JPG, PNG, WEBP
- **Max Size**: 5MB
- **Use**: Aadhaar photos

### Validation Rules
- **Phone**: Exactly 10 digits
- **Aadhaar**: Exactly 12 digits
- **SKU**: Alphanumeric, min 3 chars
- **Stock**: Non-negative integer
- **Price**: Non-negative decimal

### Low Stock Threshold
- Products with < 10 units show alerts

---

## 🔧 Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check for linting issues
npm run lint
```

---

## 📊 What You Get

✅ **Products Management**
- Add, edit, restock
- Track inventory levels
- Soft delete (deactivate)

✅ **Sales Management**
- Multi-product transactions
- Customer data + Aadhaar photo
- Automatic stock deduction
- Custom fields (JSONB)

✅ **Analytics Dashboard**
- Total sales & revenue
- Top selling products
- Low stock alerts
- Product comparison charts
- Time-based trends (7/14/30/90 days)

✅ **Inventory Tracking**
- Complete audit trail
- Movement types (sale/restock/return)
- Reference tracking

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't login | Check credentials in `.env.local` |
| Database errors | Verify migrations are run |
| Images not loading | Check storage bucket is public |
| Products not showing | Check Supabase connection |
| Stock not deducting | Verify triggers are created |

---

## 🎓 Learn More

- **Full Documentation**: See `README.md`
- **Setup Guide**: See `SETUP.md`
- **File Structure**: See `FILE-STRUCTURE.md`

---

## 📦 Optional: Sample Data

Want to test with sample products?

1. Go to Supabase → SQL Editor
2. Run `supabase/sample-data.sql`
3. Refresh Products page
4. See 15 sample products added

---

## 🎉 You're All Set!

Your inventory management system is ready to use.

**Next Steps:**
1. Customize the admin credentials
2. Add your actual products
3. Start recording sales
4. Monitor your analytics

**Need Help?**
- Check `README.md` for detailed docs
- Review code comments in source files
- Verify Supabase logs for errors

---

**Happy Managing! 🚀**
