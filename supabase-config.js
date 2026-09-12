/* ==========================================================
   Blizzo Designers — Supabase configuration
   ==========================================================
   1. Create a free project at https://supabase.com
   2. Run schema.sql in the Supabase SQL editor (see SETUP.md)
   3. Paste your project URL and anon public key below
   ========================================================== */

var BLIZZO_SUPABASE_URL = "https://fozoppmlynikmlbtqgvl.supabase.co"; // e.g. https://xxxxx.supabase.co
var BLIZZO_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvem9wcG1seW5pa21sYnRxZ3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxODAwMjEsImV4cCI6MjEwNDc1NjAyMX0.LDUqzVmO3mRetw-WCQa7qzvTCo2jcGRIhWy9ra-_o7o";

window.blizzoSupabase = null;

if (
  BLIZZO_SUPABASE_URL &&
  BLIZZO_SUPABASE_URL.indexOf("YOUR_SUPABASE") === -1 &&
  window.supabase
) {
  window.blizzoSupabase = window.supabase.createClient(
    BLIZZO_SUPABASE_URL,
    BLIZZO_SUPABASE_ANON_KEY
  );
}

/**
 * Look up a user's profile row (id, role, full_name, email).
 * Returns null if not found or Supabase isn't configured yet.
 */
window.blizzoGetProfile = async function (userId) {
  if (!window.blizzoSupabase) return null;
  var res = await window.blizzoSupabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .single();
  if (res.error) return null;
  return res.data;
};

/**
 * Guard a page: redirects to login.html if there's no session,
 * or to the correct dashboard if the signed-in user has the wrong role.
 * Call this at the top of admin.html / dashboard.html.
 * Returns { session, profile } on success.
 */
window.blizzoRequireRole = async function (requiredRole) {
  if (!window.blizzoSupabase) {
    window.location.href = "login.html";
    return null;
  }
  var sessionRes = await window.blizzoSupabase.auth.getSession();
  var session = sessionRes.data && sessionRes.data.session;
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  var profile = await window.blizzoGetProfile(session.user.id);
  if (!profile) {
    window.location.href = "login.html";
    return null;
  }
  if (requiredRole && profile.role !== requiredRole) {
    window.location.href = profile.role === "admin" ? "admin.html" : "dashboard.html";
    return null;
  }
  return { session: session, profile: profile };
};

window.blizzoSignOut = async function () {
  if (window.blizzoSupabase) {
    await window.blizzoSupabase.auth.signOut();
  }
  window.location.href = "login.html";
};
