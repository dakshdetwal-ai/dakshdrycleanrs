// Public browser configuration only. Never place a Supabase secret/service-role key here.
window.DAKSH_SUPABASE_URL = "https://hhworbeolrhgnoylfqaj.supabase.co";
window.DAKSH_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_hEwnseMNFu5-Xqv1XzlYzw_UJBwESNb";
window.dakshSupabase = window.supabase.createClient(
  window.DAKSH_SUPABASE_URL,
  window.DAKSH_SUPABASE_PUBLISHABLE_KEY,
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
);
