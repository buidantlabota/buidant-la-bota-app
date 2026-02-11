# 🗄️ Database Setup Guide - Buidant la Bota

## ⚠️ Important: Database Not Yet Created

The application code is complete, but the `bolos` table needs to be created in your Supabase database.

## 📋 Step-by-Step Instructions

### 1. Log into Supabase
1. Go to https://supabase.com
2. Log in with:
   - Email: `buidantlabota@gmail.com`
   - Password: `X@rangaBota2024`

### 2. Select Your Project
- Click on your project (should be named something like "buidant-la-bota" or similar)

### 3. Open SQL Editor
1. In the left sidebar, click on **SQL Editor** (database icon)
2. Click **New query** button

### 4. Copy and Paste the Schema
Copy the entire SQL code below and paste it into the SQL Editor:

```sql
-- Create the bolos table
create table bolos (
  id bigint primary key generated always as identity,
  nom_poble text not null,
  data_bolo date not null,
  estat text not null check (estat in ('Pendent', 'Confirmat', 'Realitzat', 'Cancel·lat')),
  pressupost numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table bolos enable row level security;

-- Create policies
-- For now, we'll allow authenticated users (admins) to do everything.
-- In a real app with multiple roles, you'd restrict this.

create policy "Enable read access for authenticated users"
on bolos for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on bolos for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on bolos for update
to authenticated
using (true);

create policy "Enable delete access for authenticated users"
on bolos for delete
to authenticated
using (true);
```

### 5. Run the Query
1. Click the **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. You should see a success message: "Success. No rows returned"

### 6. Verify the Table
1. In the left sidebar, click on **Table Editor**
2. You should now see the `bolos` table listed
3. Click on it to see the columns (it will be empty initially)

### 7. Create Your First Admin User
Since you already have the login credentials (`buidantlabota@gmail.com` / `Marc2004`), you need to create this user in Supabase:

1. In the left sidebar, click on **Authentication**
2. Click on **Users** tab
3. Click **Add user** → **Create new user**
4. Fill in:
   - Email: `buidantlabota@gmail.com`
   - Password: `Marc2004`
   - Auto Confirm User: **Yes** (check this box)
5. Click **Create user**

## ✅ Testing the Application

Once you've completed the above steps:

1. Go back to http://localhost:3000/login
2. Log in with:
   - Email: `buidantlabota@gmail.com`
   - Password: `Marc2004`
3. You should be redirected to the dashboard
4. Click **Nou Bolo** to create your first entry
5. Fill in the form and click **Crear Bolo**
6. You should see your new bolo appear in the list!

## 🔍 Troubleshooting

### If login fails:
- Make sure you created the user in Supabase Authentication
- Check that "Auto Confirm User" was enabled
- Try logging out and back in

### If creating a bolo fails:
- Make sure the SQL schema was executed successfully
- Check the browser console for error messages
- Verify the table exists in Table Editor

### If you see "Could not find the 'data_bolo' column":
- The table wasn't created properly
- Re-run the SQL schema from step 4

## 📞 Need Help?
If you encounter any issues, check:
1. Supabase project is active (not paused)
2. Environment variables in `.env.local` match your project
3. User is created and confirmed in Authentication
4. Table exists in Table Editor
