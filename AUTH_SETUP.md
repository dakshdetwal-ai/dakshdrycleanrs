# Customer authentication setup

The customer account pages are connected to Supabase project `Daksh Laundry`.

## Pages added
- `signup.html` — customer registration
- `login.html` — email/password sign-in
- `forgot-password.html` and `reset-password.html` — password recovery
- `dashboard.html` — customer profile, pickup requests, order list and support requests
- `auth.js` — browser auth and dashboard logic
- `supabase-config.js` — project URL and public publishable key
- `account.css` — responsive account page styling

## Required Supabase dashboard settings

Open the [Daksh Laundry Supabase project](https://supabase.com/dashboard/project/hhworbeolrhgnoylfqaj).

1. Go to **Authentication → URL Configuration**.
2. Set the **Site URL** to `https://dakshdrycleaners.detwal.in` (the current repository CNAME).
3. Add these **Redirect URLs**:
   - `https://dakshdrycleaners.detwal.in/**`
   - `http://localhost:5500/**`
   - `http://127.0.0.1:5500/**`
4. In **Authentication → Providers → Email**, keep email/password sign-in enabled. Email confirmation is recommended for production. New customers must confirm their email before they can sign in if confirmation is enabled.
5. In **Project Settings → API → Data API**, make sure the `public` schema is exposed to the Data API. Supabase's newer projects may not expose newly created tables automatically. The required tables are `profiles`, `orders`, and `support_tickets`.

## Database security already applied

The Supabase migration creates:
- `profiles` — customer name and phone
- `orders` — customer pickup/service requests and their status
- `support_tickets` — customer support requests

Row Level Security is enabled on all three tables. Customers can read only their own records. Customers can create their own orders and support tickets. Customers cannot edit order status or view another customer's records.

A database trigger creates a profile when a Supabase Auth user is created. No password is stored in the profiles table.

## Important security notes
- `supabase-config.js` contains only the public publishable key. This is expected for a browser app when RLS is enabled.
- Never put a Supabase service-role/secret key or Telegram bot token in frontend files.
- Customer dashboard pickup requests are written directly to the `orders` table. The older public homepage request form still uses the existing Cloudflare Worker and Telegram flow; it has not yet been unified with the customer order table.
- The shop/admin dashboard and staff-only status update workflow are not included in this customer-auth release.
