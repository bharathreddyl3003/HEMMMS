# HEMMMS: Vercel + Supabase Deployment Guide

This guide walks you through deploying the HEMMMS Heavy Equipment Management application to **Vercel** with **Supabase (PostgreSQL)** as the database backend.

---

## Architecture Overview

```mermaid
flowchart LR
    Client["Client (Desktop & Mobile)"] --> Vercel["Vercel (Next.js 16 App Router)"]
    Vercel -->|Prisma Client via Transaction Pooler| SupabasePool["Supabase Connection Pooler (Port 6543)"]
    SupabasePool --> Postgres[("Supabase PostgreSQL Database")]
    CLI["Prisma CLI (Migrations & Seeding)"] -->|Direct Connection| Postgres
```

- **Frontend & Serverless Backend**: Hosted on **Vercel** (Next.js 16, React 19, Server Actions, Proxy).
- **Database**: Cloud **PostgreSQL** hosted on **Supabase** with built-in connection pooling.
- **ORM**: **Prisma** with dual-URL support (`DATABASE_URL` pooled for serverless functions, `DIRECT_URL` for direct schema management).

---

## Step 1: Create Your Free Supabase Project & Get Connection Strings

1. Log in to [supabase.com](https://supabase.com) and click **"New Project"**.
2. Fill in the details:
   - **Name**: `hemmms-fleet` (or any name you prefer)
   - **Database Password**: Choose a strong password (save this safely!)
   - **Region**: Choose the closest region (e.g. `ap-south-1` Mumbai or `ap-southeast-1` Singapore)
3. Wait 1–2 minutes while Supabase finishes setting up your project.

### How to Find Your Connection Strings (2 Quick Ways):

#### Method A: The "Connect" Button (Easiest & Fastest)
1. At the very top of your Supabase project dashboard (in the top header bar), click the **"Connect"** button (or **"Connect to project"**).
2. A popup window will appear:
   - Click the **"ORM"** tab (or **"Prisma"**).
   - Supabase will literally display the exact format for Prisma!
   - Under **Mode**, you will see:
     - **Transaction** (Port `6543`) -> Copy this for `DATABASE_URL`
     - **Session / Direct** (Port `5432`) -> Copy this for `DIRECT_URL`
   - *Remember to replace `[YOUR-PASSWORD]` with your actual database password.*

#### Method B: Via Sidebar
Depending on your Supabase dashboard version:
- **New UI**: In the left sidebar, click the **Database** icon (looks like a cylinder/stack of disks) > click **Connection Pooling** or **Settings**.
- **Alternative UI**: Click the **Gear icon (Project Settings)** at the very bottom of the left sidebar > click **Database** in the settings sub-menu. Scroll down to the **Connection strings** section.

---

## Step 2: Configure Local Environment & Provision Database

1. Open your `.env` file in the project root:
   ```env
   DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   JWT_SECRET="replace-with-a-random-32-char-secret-string"
   ```
   *(Replace `[YOUR-PROJECT-REF]` and `[YOUR-PASSWORD]` with your actual Supabase credentials).*

2. Push the database schema to Supabase:
   ```bash
   npx prisma db push
   ```
   > This automatically creates all 7 tables in Supabase Postgres (`Machine`, `Subassembly`, `MaintenanceRecord`, `SparePart`, `PurchaseRequisition`, `User`, `ScheduledMaintenance`).

3. Populate the initial fleet data into Supabase:
   ```bash
   npm run db:seed
   ```
   > This seeds:
   > - **5 Drills**: DM11, DM12, DM14 (IDM30) & DM15, DM16 (REL650).
   > - **Subassemblies**: Engine, Compressor, Hydraulic Pump, Rotary Head for each drill.
   > - **Scheduled Maintenance**: 250h (Engine), 500h (Compressor), 1000h (Hydraulic).
   > - **Spare Parts**: Engine Filter, Hydraulic Oil 20L, Rotary Seal Kit, Compressor Valve.
   > - **Default Users**:
   >   - `admin` (Password: `admin123`) - Full administrative permissions.
   >   - `user` (Password: `user123`) - Standard operator permissions.

---

## Step 3: Deploy to Vercel

### Option A: Via GitHub / GitLab / Bitbucket (Recommended)
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Configure project for Vercel and Supabase"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com), log in, and click **"Add New..." > "Project"**.
3. Select your `HEMMMS` repository and click **Import**.
4. In the **Environment Variables** section, add the following 3 variables:
   | Variable Name | Value | Purpose |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@[HOST]:6543/postgres?pgbouncer=true` | Supabase Transaction Pooler |
   | `DIRECT_URL` | `postgresql://postgres.[REF]:[PASS]@[HOST]:5432/postgres` | Supabase Direct Connection |
   | `JWT_SECRET` | `your-random-32-char-secret` | JWT Session Encryption |
5. Click **Deploy**. Vercel will run `postinstall: prisma generate` and `build`, deploying your production site in under 60 seconds!

### Option B: Via Vercel CLI
If you prefer deploying directly from your terminal:
```bash
npm i -g vercel
vercel
```
Follow the interactive prompts and add your environment variables when prompted.

---

## Step 4: Verification Checklist

- [ ] Open your live Vercel URL (`https://your-project.vercel.app`).
- [ ] Log in with `admin` / `admin123`.
- [ ] Verify Fleet Overview displays all 5 drills (DM11, DM12, DM14, DM15, DM16).
- [ ] Click **Maintenance Status** tab to verify hours left calculations.
- [ ] Open the site on mobile phone Safari or Chrome to test responsive UI.
- [ ] Add a test daily log or record a scheduled maintenance event.
- [ ] Check Supabase Table Editor at [supabase.com](https://supabase.com) to see live PostgreSQL rows updating in real time!
