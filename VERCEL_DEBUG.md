# How to Debug Vercel 404 Errors

## Step 1: Access Vercel Dashboard
1. Open browser and go to: https://vercel.com/dashboard
2. Login if needed
3. Find and click on **battenjournal** project

## Step 2: Check Latest Deployment
1. You'll see a list of deployments
2. Click on the TOP deployment (most recent)
3. Look at the status:
   - 🟢 Green "Ready" = Build succeeded
   - 🔴 Red "Error" or "Failed" = Build failed
   - 🟡 Yellow "Building" = Still building

## Step 3: View Build Logs
1. Look for tabs near the top: **"Building"** or **"Logs"** or **"Deployment"**
2. Click on the **"Building"** or **"Logs"** tab
3. Scroll through the logs and look for:
   - Red error messages
   - Lines starting with "Error:"
   - "Failed to compile"
   - "Command failed"

## Step 4: Check Environment Variables
1. Go back to project (click project name at top)
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in sidebar
4. Check that these are set for **Production**:
   - `DATABASE_URL` - Your PostgreSQL URL
   - `AUTH_SECRET` - Random string (generate with: openssl rand -base64 32)
   - `AUTH_URL` - Your production URL (e.g., https://your-app.vercel.app)

## Step 5: Check Build Command
1. Still in Settings
2. Click **"General"** in sidebar
3. Scroll to **"Build & Development Settings"**
4. Should show:
   - Framework Preset: **Next.js**
   - Build Command: (should be auto-detected or use vercel.json)
   - Output Directory: (should be blank or `.next`)

## What to Share
Take screenshots or copy/paste:
- The deployment status (Ready/Error/Failed)
- Any RED error messages from build logs
- The last 20-30 lines of the build logs
