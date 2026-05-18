# mibu

minimal personal investment + income tracker.

## setup

1. `npm install`
2. create a supabase project, run `supabase/schema.sql` in the sql editor
3. create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   TWELVE_DATA_API_KEY=...
   NEXT_PUBLIC_LOGO_DEV_TOKEN=...   # optional, for stock logos
   ```
4. `npm run dev`

## data

- holdings + transactions + incomes — supabase
- us stocks — twelve data
- india stocks — nse india (live) + twelve data (history)
- crypto — coingecko

everything is cached on device (localStorage) so cold loads render instantly while fresh data fetches in the background.
