export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log("[db] supabase not configured");
    return;
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key }
    });
    if (res.ok) {
      console.log(`[db] supabase connected · ${new URL(url).host}`);
    } else {
      console.log(`[db] supabase unreachable · http ${res.status}`);
    }
  } catch (e) {
    console.log(`[db] supabase unreachable · ${(e as Error).message}`);
  }
}
