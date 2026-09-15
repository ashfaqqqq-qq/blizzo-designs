/* ==========================================================
   Blizzo Designers — Supabase configuration
   ==========================================================
   1. Create a free project at https://supabase.com
   2. Run schema.sql in the Supabase SQL editor (see SETUP.md)
   3. Paste your project URL and anon public key below
   ========================================================== */

var BLIZZO_SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"; // e.g. https://xxxxx.supabase.co
var BLIZZO_SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

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

/**
 * Wires up a container of 6 single-digit <input> boxes: auto-advance on
 * type, backspace-to-previous, and paste-splits-across-boxes. Returns
 * helpers to read/clear the combined value.
 */
window.blizzoSetupOtpBoxes = function (container) {
  var inputs = Array.prototype.slice.call(container.querySelectorAll("input"));

  inputs.forEach(function (input, idx) {
    input.addEventListener("input", function () {
      var digit = input.value.replace(/[^0-9]/g, "").slice(-1);
      input.value = digit;
      if (digit && idx < inputs.length - 1) inputs[idx + 1].focus();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });
    input.addEventListener("paste", function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "");
      if (!text) return;
      text.split("").forEach(function (ch, i) {
        if (inputs[i]) inputs[i].value = ch;
      });
      var nextIdx = Math.min(text.length, inputs.length - 1);
      inputs[nextIdx].focus();
    });
  });

  return {
    getValue: function () {
      return inputs.map(function (i) { return i.value; }).join("");
    },
    clear: function () {
      inputs.forEach(function (i) { i.value = ""; });
      inputs[0].focus();
    },
    focusFirst: function () {
      inputs[0].focus();
    }
  };
};

/**
 * Turns Supabase's deliberately-vague "Invalid login credentials" into a
 * friendlier message. Supabase doesn't distinguish "no account" from
 * "wrong password" on purpose (it stops attackers from being able to probe
 * which emails have accounts), so this can't say for certain which one it
 * is — it just points the person toward both possibilities instead of
 * showing the raw, slightly cold Supabase error text.
 */
window.blizzoFriendlyAuthError = function (error) {
  if (!error) return "Something went wrong. Please try again.";
  var msg = error.message || "";
  if (/invalid login credentials/i.test(msg)) {
    return "That email and password don't match an account here — double-check them, or create a new account if you haven't yet.";
  }
  if (/email not confirmed/i.test(msg)) {
    return "This email hasn't been verified yet — check your inbox for the code, or request a new one.";
  }
  return msg || "Something went wrong. Please try again.";
};

/**
 * Starts the Google OAuth sign-in flow. Requires the Google provider to be
 * configured in Supabase (Authentication → Providers → Google) — see
 * SETUP.md. redirectPath defaults to login.html, which already knows how
 * to route a signed-in user to the right dashboard.
 */
window.blizzoSignInWithGoogle = async function (redirectPath) {
  if (!window.blizzoSupabase) return { error: { message: "Supabase isn't configured yet." } };
  return window.blizzoSupabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, redirectPath || "login.html")
    }
  });
};
