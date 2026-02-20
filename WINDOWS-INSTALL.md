# Windows Installation Guide

## Step-by-Step Installation for Windows

### Prerequisites

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Choose LTS version (18.x or higher)
   - Run installer and follow prompts
   - ✅ Verify installation:
   ```cmd
   node --version
   npm --version
   ```

### Installation Steps

#### 1. Navigate to Project Folder
Open Command Prompt or PowerShell:
```cmd
cd "c:\Codes\BUILDS\abhishek inventory"
```

#### 2. Install Dependencies
```cmd
npm install
```
Wait for all packages to download (may take 2-3 minutes).

#### 3. Create Environment File
```cmd
copy .env.local.example .env.local
```

#### 4. Edit Environment File
Open `.env.local` in Notepad or VS Code and update:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourPassword123!
```

#### 5. Run Development Server
```cmd
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

#### 6. Open Browser
Navigate to: http://localhost:3000

---

## Supabase Setup (Windows)

### 1. Create Account
- Go to https://supabase.com
- Sign up for free account
- Verify your email

### 2. Create New Project
- Click "New Project"
- Fill in:
  - Name: "inventory-management"
  - Database Password: (save this!)
  - Region: (choose closest)
- Click "Create new project"
- Wait 2-3 minutes for setup

### 3. Get API Credentials
- Click on project
- Go to ⚙️ Settings → API
- Copy these values:
  - **Project URL** (starts with https://)
  - **anon/public key** (long string)

### 4. Run Database Migrations

**Option A: Using Supabase Web UI**
1. Go to SQL Editor (left sidebar)
2. Click "+ New query"
3. Open `supabase\migrations\001_initial_schema.sql` in Notepad
4. Copy all content
5. Paste into SQL Editor
6. Click "Run" or press F5
7. Wait for "Success" message
8. Repeat for `002_security_policies.sql`

**Option B: Copy-Paste Commands**

Open each file and copy the SQL:

**File 1:** `supabase\migrations\001_initial_schema.sql`
**File 2:** `supabase\migrations\002_security_policies.sql`

Paste and run each in Supabase SQL Editor.

### 5. Create Storage Bucket
1. Click "Storage" in left sidebar
2. Click "New Bucket"
3. Enter name: `documents`
4. Toggle "Public bucket" to ON
5. Click "Create bucket"

### 6. Set Storage Policies
1. Click on `documents` bucket
2. Click "Policies" tab
3. Click "New Policy"
4. Select "For full customization"
5. Paste this SQL:
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');
```
6. Click "Review" then "Save policy"
7. Click "New Policy" again
8. Paste:
```sql
CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');
```
9. Click "Review" then "Save policy"

---

## Troubleshooting (Windows)

### Error: "npm is not recognized"
**Solution:** 
1. Reinstall Node.js
2. Make sure to check "Add to PATH" during installation
3. Restart Command Prompt

### Error: "Cannot find module"
**Solution:**
```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Error: Port 3000 already in use
**Solution:**
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or use different port
set PORT=3001
npm run dev
```

### Error: "Failed to fetch products"
**Solution:**
1. Check Supabase project is running
2. Verify API keys in `.env.local`
3. Check database migrations are completed
4. Look at browser console (F12) for errors

### Error: Images not loading
**Solution:**
1. Verify storage bucket is created
2. Make sure bucket is public
3. Check storage policies are set
4. Update `next.config.js` with correct domain

### Error: Cannot login
**Solution:**
1. Check `.env.local` file exists in project root
2. Verify credentials match what you set
3. Restart dev server (Ctrl+C then `npm run dev`)

---

## Windows-Specific Tips

### Using PowerShell
If using PowerShell instead of Command Prompt:
```powershell
# Navigate to project
cd "c:\Codes\BUILDS\abhishek inventory"

# Copy environment file
Copy-Item .env.local.example .env.local

# Run dev server
npm run dev
```

### Using VS Code on Windows
1. Open VS Code
2. File → Open Folder
3. Select "abhishek inventory" folder
4. Open integrated terminal (Ctrl + `)
5. Run: `npm run dev`

### File Paths
- Use quotes for paths with spaces
- Use backslash `\` or forward slash `/`
- Example: `"c:\Codes\BUILDS\abhishek inventory"`

---

## Next Steps After Installation

1. ✅ Verify server is running at http://localhost:3000
2. ✅ Login with admin credentials
3. ✅ Add a test product
4. ✅ Create a test sale
5. ✅ View dashboard

---

## Optional: Sample Data

To add test products:
1. Open Supabase → SQL Editor
2. Click "New query"
3. Open `supabase\sample-data.sql` in Notepad
4. Copy and paste content
5. Click "Run"
6. Check Products page - you'll see 15 sample products

---

## Production Build (Windows)

When ready to deploy:
```cmd
# Build the project
npm run build

# Test production build locally
npm start
```

---

## Useful Windows Commands

```cmd
# Check if server is running
netstat -ano | findstr :3000

# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest

# Check Node.js version
node -v

# Check npm version
npm -v
```

---

## Getting Help

1. Check error messages in Command Prompt
2. Open browser console (F12) for client errors
3. Check Supabase logs in dashboard
4. Review README.md for detailed docs
5. Verify all environment variables are set

---

**Installation complete! Happy coding on Windows! 🚀**
