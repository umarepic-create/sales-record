# Fal-Breeze Sales Record — Supabase Setup

This GitHub Pages app now uses Supabase for shared sales and stock data.

## 1. Create a Supabase project

Create a project in Supabase.

In the Supabase dashboard, open **SQL Editor** and run the complete contents of:

`supabase-schema.sql`

This creates:
- `profiles`
- `sales`
- `stock`
- `audit_log`
- Row Level Security policies
- Audit triggers
- Realtime for sales and stock

## 2. Configure authentication

In Supabase go to **Authentication → Providers → Email** and make sure Email/Password authentication is enabled.

Create one account for each cashier/staff member.

Recommended:
- Cashier 1: cashier1@yourrestaurant.com
- Cashier 2: cashier2@yourrestaurant.com
- Manager/Admin: manager@yourrestaurant.com

Each person should have their own account. Do not share one password if you want the audit log to identify who made a change.

If your Supabase project requires email confirmation, complete the confirmation email before signing in.

## 3. Create the first profile

After the first successful login, the website asks for the user's name and creates their profile.

By default the profile role is `cashier`.

To make a user an administrator, run this in Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'manager@yourrestaurant.com'
);
```

Replace the email with the real admin email.

## 4. Add the Supabase keys to the website

Open `config.js`.

Replace:

```js
window.SUPABASE_URL = 'PASTE_YOUR_SUPABASE_PROJECT_URL_HERE';
window.SUPABASE_PUBLISHABLE_KEY = 'PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE';
```

with the **Project URL** and **Publishable key** from the Supabase project API settings.

Example:

```js
window.SUPABASE_URL = 'https://your-project-ref.supabase.co';
window.SUPABASE_PUBLISHABLE_KEY = 'your-publishable-key';
```

Only use the publishable/anon key in this frontend.

**NEVER put the Supabase secret/service_role key in GitHub or in `config.js`.**

## 5. Push the change to GitHub

Commit the updated `config.js`.

GitHub Pages will publish the change automatically if Pages is already configured for this repository.

## 6. Test

Open the live GitHub Pages website.

1. Sign in with a Supabase email/password account.
2. Add a sale.
3. Open the website on another phone/computer.
4. Sign in with another staff account.
5. The same sale should appear.
6. Add or change stock from one device and confirm the other device updates.
7. Check `audit_log` in Supabase to see who created/changed records.

## Important

The old version stored data in browser `localStorage`. The new version stores sales and stock in Supabase.

Existing localStorage records are not automatically copied into Supabase. If the old records contain real data that you need to keep, export/migrate them before relying on the new database.

The website can remain hosted on GitHub Pages. Supabase acts as the shared database and authentication service.
