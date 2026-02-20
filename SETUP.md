# Setup Guide

## Quick Start

Follow these steps to get your inventory management system up and running:

### Step 1: Install Node.js
Download and install Node.js from [nodejs.org](https://nodejs.org/) (version 18 or higher)

### Step 2: Install Dependencies
Open terminal in the project folder and run:
```bash
npm install
```

### Step 3: Set Up Supabase

1. **Create Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account
   - Create a new project

2. **Get API Credentials**
   - Go to Project Settings (⚙️ icon)
   - Click on "API" in the sidebar
   - Copy:
     - Project URL
     - anon/public key

3. **Run Database Migrations**
   - In Supabase, go to "SQL Editor"
   - Click "New Query"
   - Copy and paste content from `supabase/migrations/001_initial_schema.sql`
   - Click "Run"
   - Repeat for `002_security_policies.sql`

4. **Create Storage Bucket**
   - Go to "Storage" in Supabase
   - Click "New Bucket"
   - Name: `documents`
   - Make it **Public**
   - Create the bucket

5. **Set Storage Policies**
   - Click on the `documents` bucket
   - Go to "Policies" tab
   - Click "New Policy"
   - Use this SQL:
   ```sql
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'documents');
   
   CREATE POLICY "Authenticated uploads"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'documents');
   ```

### Step 4: Configure Environment Variables

1. Copy the example file:
   ```bash
   copy .env.local.example .env.local
   ```

2. Open `.env.local` in a text editor

3. Replace the placeholder values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-key-here
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=YourSecurePassword123!
   ```

### Step 5: Update Next.js Config

1. Open `next.config.js`
2. Update the domain to match your Supabase project:
   ```javascript
   images: {
     domains: ['xxxxx.supabase.co'], // Replace with your project ID
   },
   ```

### Step 6: Run the Application

```bash
npm run dev
```

Open your browser and go to: [http://localhost:3000](http://localhost:3000)

### Step 7: Login

Use the credentials you set in `.env.local`:
- Username: `admin` (or whatever you set)
- Password: (the password you set)

## First Time Setup

After logging in:

1. **Add Products**
   - Go to Products page
   - Click "+ Add Product"
   - Fill in: Name, SKU, Initial Stock, Unit Price
   - Save

2. **Create a Sale**
   - Go to Sales page
   - Click "+ New Sale"
   - Fill in customer details
   - Select products and quantities
   - Submit

3. **View Dashboard**
   - Go to Dashboard
   - See your analytics and charts

## Common Issues

### "Missing Supabase environment variables"
- Make sure `.env.local` file exists
- Check that all values are filled in
- Restart the dev server

### "Failed to fetch products"
- Verify database migrations are run
- Check Supabase project is active
- Verify API keys are correct

### Images not uploading
- Make sure storage bucket is created
- Verify bucket is set to Public
- Check storage policies are in place

### Cannot login
- Verify credentials in `.env.local`
- Make sure you're using the correct username/password
- Check browser console for errors

## Production Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - ADMIN_USERNAME
   - ADMIN_PASSWORD
5. Deploy

### Manual Build

```bash
npm run build
npm start
```

## Need Help?

- Check the main README.md for detailed documentation
- Review Supabase logs in the dashboard
- Check browser console for errors
- Verify all environment variables are set correctly

---

Happy inventory management! 🎉
