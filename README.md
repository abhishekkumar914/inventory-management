# Inventory Management Dashboard

A modern, responsive web-based admin dashboard for managing inventory, sales, and analytics built with **Next.js**, **JavaScript**, and **Supabase**.

## 🚀 Features

### 🔐 Authentication
- Simple admin authentication with hardcoded credentials
- Secure login validation against environment variables
- No user signup required

### 📦 Inventory Management
- Complete CRUD operations for products
- Product fields: name, SKU, stock, unit price, active status
- Restock functionality with inventory tracking
- Stock validation to prevent overselling
- Soft delete with active/inactive status

### 🧾 Sales Management
- Multi-product sales transactions
- Customer information capture (name, phone, Aadhaar)
- Aadhaar photo upload to Supabase Storage
- Sale notes and custom JSONB fields
- Automatic inventory deduction on sale
- Detailed sale view with all information

### 📊 Dashboard & Analytics
- **Summary Metrics**: Total sales, revenue, top products, low-stock alerts
- **Bar Chart**: Product-wise total quantity sold
- **Time-Series Line Chart**: Sales trends over time with multi-product comparison
- Customizable time ranges (7, 14, 30, 90 days)
- Top selling products ranking
- Low stock alerts (< 10 units)

### 📈 Inventory Movement Tracking
- Audit trail for all stock changes
- Movement types: sale, restock, correction, return
- Reference tracking for transactions

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, JavaScript
- **Backend**: Supabase (PostgreSQL + Storage)
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **Database**: PostgreSQL with JSONB support

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git (optional)

## 🔧 Installation

### 1. Clone or Download the Repository

```bash
cd "c:\Codes\BUILDS\abhishek inventory"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** > **API** and copy:
   - Project URL
   - Anon/Public Key

#### 3.1 Create Database Tables

Go to **SQL Editor** in Supabase and run the migrations:

**First, run `001_initial_schema.sql`:**
```sql
-- (Copy content from supabase/migrations/001_initial_schema.sql)
```

**Then, run `002_security_policies.sql`:**
```sql
-- (Copy content from supabase/migrations/002_security_policies.sql)
```

#### 3.2 Create Storage Bucket

1. Go to **Storage** in Supabase
2. Create a new bucket named `documents`
3. Set it to **Public** access
4. Add the following policy:

```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Allow authenticated uploads
CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');
```

### 4. Configure Environment Variables

1. Copy the example file:
```bash
copy .env.local.example .env.local
```

2. Edit `.env.local` and add your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
```

### 5. Update Next.js Config

Edit `next.config.js` and update the domain:

```javascript
images: {
  domains: ['your-project.supabase.co'],
},
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Usage

### Login
1. Navigate to `http://localhost:3000`
2. Enter admin credentials (set in `.env.local`)
3. Click **Login**

### Managing Products
1. Go to **Products** page
2. Click **+ Add Product** to create new products
3. Use **Edit** to modify product details
4. Use **Restock** to add inventory
5. Use **Deactivate** to soft-delete products

### Creating Sales
1. Go to **Sales** page
2. Click **+ New Sale**
3. Fill in customer information
4. Add products and quantities
5. Optionally upload Aadhaar photo
6. Add notes and custom fields
7. Click **Create Sale**

### Viewing Analytics
1. Go to **Dashboard**
2. View summary metrics at the top
3. Check top-selling products
4. Review low-stock alerts
5. Analyze bar chart for product-wise sales
6. Use time-series chart to compare products over time
7. Select specific products to compare
8. Change time range (7, 14, 30, 90 days)

## 📁 Project Structure

```
abhishek inventory/
├── components/          # React components
│   ├── Layout.js       # Main layout with sidebar
│   ├── Modal.js        # Reusable modal component
│   └── ProtectedRoute.js # Auth protection wrapper
├── lib/
│   ├── supabase.js     # Supabase client
│   └── utils.js        # Validation & utility functions
├── pages/
│   ├── api/
│   │   └── auth/       # Authentication APIs
│   ├── _app.js         # Next.js app wrapper
│   ├── index.js        # Login page
│   ├── dashboard.js    # Dashboard with analytics
│   ├── products.js     # Product management
│   └── sales.js        # Sales management
├── styles/
│   └── globals.css     # Global styles with Tailwind
├── supabase/
│   └── migrations/     # Database migration files
├── .env.local.example  # Environment variables template
├── next.config.js      # Next.js configuration
├── package.json        # Dependencies
└── README.md          # This file
```

## 🗄️ Database Schema

### Tables

**products**
- id (UUID, PK)
- name (VARCHAR)
- sku (VARCHAR, UNIQUE)
- current_stock (INTEGER)
- unit_price (DECIMAL)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)

**sales**
- id (UUID, PK)
- customer_name (VARCHAR)
- phone (VARCHAR)
- aadhaar_number (VARCHAR)
- aadhaar_photo_url (TEXT)
- notes (TEXT)
- custom_fields (JSONB)
- created_at (TIMESTAMP)

**sale_items**
- id (UUID, PK)
- sale_id (UUID, FK)
- product_id (UUID, FK)
- quantity (INTEGER)
- price_at_sale (DECIMAL)
- created_at (TIMESTAMP)

**inventory_movements**
- id (UUID, PK)
- product_id (UUID, FK)
- type (VARCHAR: sale/restock/correction/return)
- quantity_change (INTEGER)
- reference_id (UUID)
- notes (TEXT)
- created_at (TIMESTAMP)

### Key Features
- Automatic inventory deduction on sale (via triggers)
- Stock validation before sale
- Audit trail for all inventory changes
- JSONB for flexible custom fields

## 🔒 Security

- Admin credentials stored in environment variables
- Row Level Security (RLS) enabled on all tables
- Secure file uploads to Supabase Storage
- Input validation on client and server side
- Protected routes with authentication check

## 🚢 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Build for Production

```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### Images not loading
- Ensure Supabase storage bucket is public
- Verify domain in `next.config.js`

### Authentication fails
- Check `.env.local` credentials
- Ensure environment variables are loaded

### Database errors
- Verify migrations are run correctly
- Check Supabase project URL and keys

### Low stock alerts not showing
- Products must be active
- Stock must be < 10 units

## 📝 Future Enhancements

- Export sales data to CSV/Excel
- Email notifications for low stock
- Barcode scanning for products
- Return/refund management
- Multiple warehouse support
- Role-based access control
- Print invoices
- Advanced filtering and search

## 📄 License

This project is created for internal use. Modify as needed for your requirements.

## 👨‍💻 Support

For issues or questions, please refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🎉 Getting Started Checklist

- [ ] Install Node.js
- [ ] Create Supabase project
- [ ] Run database migrations
- [ ] Create storage bucket
- [ ] Configure environment variables
- [ ] Install dependencies (`npm install`)
- [ ] Run development server (`npm run dev`)
- [ ] Login with admin credentials
- [ ] Add sample products
- [ ] Create test sale
- [ ] View dashboard analytics

---

**Built with ❤️ for efficient inventory management**
