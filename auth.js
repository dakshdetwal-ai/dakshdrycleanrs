(() => {
  const supabase = window.dakshSupabase;
  const $ = (selector, root = document) => root.querySelector(selector);
  const showMessage = (element, message, isError = false) => {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? "#b54747" : "#167d72";
  };
  const setBusy = (button, busy, label) => {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? "Please wait…" : label;
  };
  const redirectTo = path => new URL(path, window.location.origin).toString();

  async function currentSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  const signupForm = $("#signupForm");
  if (signupForm) {
    const passwordInput = $('input[name="password"]', signupForm);
    const confirmInput = $('input[name="confirm_password"]', signupForm);
    const phoneInput = $('input[name="phone"]', signupForm);
    const signupButton = $('button[type="submit"]', signupForm);
    const message = $("#authMessage");
    const strengthText = $("#passwordStrengthText");
    const strengthBar = $("#passwordStrengthBar");
    const matchText = $("#passwordMatch");
    let signupInProgress = false;

    document.querySelectorAll("[data-password-toggle]").forEach(toggle => toggle.addEventListener("click", () => {
      const field = document.getElementById(toggle.dataset.passwordToggle);
      if (!field) return;
      const reveal = field.type === "password";
      field.type = reveal ? "text" : "password";
      toggle.textContent = reveal ? "Hide" : "Show";
      toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      toggle.setAttribute("aria-pressed", String(reveal));
    }));

    function updatePasswordStrength() {
      const value = passwordInput?.value || "";
      let score = 0;
      if (value.length >= 8) score++;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
      if (/\d/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;
      const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
      if (strengthText) strengthText.textContent = value ? labels[score] : "Use 8+ characters with a mix of letters and numbers.";
      if (strengthBar) {
        strengthBar.style.width = (score * 25) + "%";
        strengthBar.dataset.level = String(score);
      }
    }
    function updatePasswordMatch() {
      if (!matchText || !confirmInput) return;
      if (!confirmInput.value) { matchText.textContent = ""; matchText.className = "field-hint"; return; }
      const matches = confirmInput.value === (passwordInput?.value || "");
      matchText.textContent = matches ? "Passwords match." : "Passwords do not match.";
      matchText.className = matches ? "field-hint is-valid" : "field-hint is-invalid";
    }
    passwordInput?.addEventListener("input", () => { updatePasswordStrength(); updatePasswordMatch(); });
    confirmInput?.addEventListener("input", updatePasswordMatch);
    updatePasswordStrength();

    signupForm.querySelectorAll("input").forEach(input => input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      if (message) { message.textContent = ""; message.classList.remove("is-error"); }
    }));

    signupForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (signupInProgress) return;
      const form = new FormData(signupForm);
      const fullName = String(form.get("full_name") || "").trim();
      const rawPhone = String(form.get("phone") || "").trim();
      const phoneDigits = rawPhone.replace(/\D/g, "");
      const phone = phoneDigits.length === 12 && phoneDigits.startsWith("91") ? phoneDigits.slice(2) : phoneDigits;
      const email = String(form.get("email") || "").trim().toLowerCase();
      const password = String(form.get("password") || "");
      const confirm = String(form.get("confirm_password") || "");
      if (!fullName) { showMessage(message, "Please enter your full name.", true); return; }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        phoneInput?.setAttribute("aria-invalid", "true");
        showMessage(message, "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.", true);
        phoneInput?.focus(); return;
      }
      if (password.length < 8) { showMessage(message, "Use a password with at least 8 characters.", true); passwordInput?.focus(); return; }
      if (password !== confirm) {
        confirmInput?.setAttribute("aria-invalid", "true");
        showMessage(message, "Your passwords don't match. Please check both fields.", true);
        confirmInput?.focus(); return;
      }
      if (!form.get("terms")) { showMessage(message, "Please accept the account terms to continue.", true); return; }

      signupInProgress = true;
      signupButton?.classList.add("is-loading");
      if (signupButton) {
        signupButton.disabled = true;
        signupButton.querySelector(".signup-button-label").textContent = "Creating account…";
      }
      showMessage(message, "Creating your customer account…");
      try {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: fullName, phone },
            emailRedirectTo: redirectTo("login.html?verified=1")
          }
        });
        if (error) throw error;
        if (data.session) {
          signupForm.hidden = true;
          document.querySelector(".signup-card .auth-subtitle")?.setAttribute("hidden", "");
          document.querySelector(".signup-card .auth-switch")?.setAttribute("hidden", "");
          document.querySelector(".signup-card .auth-foot")?.setAttribute("hidden", "");
          const welcomePanel = $("#signupWelcome");
          if (welcomePanel) welcomePanel.hidden = false;
          return;
        }
        if (data.user?.identities?.length === 0) {
          throw new Error("An account with this email may already exist. Try signing in or resetting your password.");
        }
        signupForm.hidden = true;
        document.querySelector(".signup-card .auth-subtitle")?.setAttribute("hidden", "");
        document.querySelector(".signup-card .auth-switch")?.setAttribute("hidden", "");
        document.querySelector(".signup-card .auth-foot")?.setAttribute("hidden", "");
        const verifyPanel = $("#signupVerify");
        const emailLabel = $("#verificationEmail");
        if (emailLabel) emailLabel.textContent = email;
        if (verifyPanel) verifyPanel.hidden = false;
        signupForm.reset();
        updatePasswordStrength();
        updatePasswordMatch();
      } catch (error) {
        const raw = String(error?.message || "").toLowerCase();
        const friendly = raw.includes("already registered") || raw.includes("user already exists")
          ? "An account with this email may already exist. Try signing in or resetting your password."
          : raw.includes("password") && raw.includes("weak")
            ? "Please choose a stronger password."
            : "We couldn't create your account right now. Please check your details and try again.";
        showMessage(message, friendly, true);
        message?.classList.add("is-error");
      } finally {
        signupInProgress = false;
        signupButton?.classList.remove("is-loading");
        if (signupButton) {
          signupButton.disabled = false;
          signupButton.querySelector(".signup-button-label").textContent = "Create account";
        }
      }
    });
  }

  const resendVerificationButton = $("#resendVerification");
  if (resendVerificationButton) {
    const resendMessage = $("#resendMessage");
    const verificationEmail = $("#verificationEmail");
    let resendTimer = null;
    let resendSeconds = 0;
    function startResendCooldown(seconds = 30) {
      resendSeconds = seconds;
      resendVerificationButton.disabled = true;
      resendVerificationButton.textContent = `Resend available in ${resendSeconds}s`;
      if (resendTimer) clearInterval(resendTimer);
      resendTimer = setInterval(() => {
        resendSeconds -= 1;
        if (resendSeconds <= 0) {
          clearInterval(resendTimer);
          resendTimer = null;
          resendVerificationButton.disabled = false;
          resendVerificationButton.textContent = "Resend verification";
        } else {
          resendVerificationButton.textContent = `Resend available in ${resendSeconds}s`;
        }
      }, 1000);
    }
    resendVerificationButton.addEventListener("click", async () => {
      const email = verificationEmail?.textContent?.trim();
      if (!email || resendVerificationButton.disabled) return;
      resendVerificationButton.disabled = true;
      resendVerificationButton.textContent = "Sending…";
      if (resendMessage) resendMessage.textContent = "";
      try {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        if (error) throw error;
        if (resendMessage) resendMessage.textContent = "A new verification email has been sent. Please check your inbox.";
        startResendCooldown(30);
      } catch (error) {
        const raw = String(error?.message || "").toLowerCase();
        if (resendMessage) resendMessage.textContent = raw.includes("rate") || raw.includes("limit")
          ? "Please wait a little before requesting another email."
          : "We couldn't resend the email right now. Please try again shortly.";
        startResendCooldown(30);
      }
    });
  }

  const loginForm = $("#loginForm");
  if (loginForm) {
    const params = new URLSearchParams(window.location.search);
    const emailInput = $('input[name="email"]', loginForm);
    const passwordInput = $('input[name="password"]', loginForm);
    const rememberEmail = $("#rememberEmail");
    const authMessage = $("#authMessage");
    const loginButton = $('button[type="submit"]', loginForm);
    const savedEmail = localStorage.getItem("dakshRememberedEmail") || "";
    if (savedEmail && emailInput) {
      emailInput.value = savedEmail;
      if (rememberEmail) rememberEmail.checked = true;
    }
    if (params.get("verified") === "1") showMessage(authMessage, "Email confirmed. You can now sign in.");
    loginForm.querySelectorAll("input").forEach(input => input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      if (authMessage) { authMessage.textContent = ""; authMessage.classList.remove("is-error"); }
    }));
    document.querySelectorAll("[data-password-toggle]").forEach(toggle => toggle.addEventListener("click", () => {
      const field = document.getElementById(toggle.dataset.passwordToggle);
      if (!field) return;
      const reveal = field.type === "password";
      field.type = reveal ? "text" : "password";
      toggle.textContent = reveal ? "Hide" : "Show";
      toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      toggle.setAttribute("aria-pressed", String(reveal));
    }));
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const email = String(emailInput?.value || "").trim().toLowerCase();
      const password = String(passwordInput?.value || "");
      if (!email || !emailInput.checkValidity()) {
        emailInput?.setAttribute("aria-invalid", "true");
        showMessage(authMessage, "Enter a valid email address.", true);
        authMessage?.classList.add("is-error");
        emailInput?.focus();
        return;
      }
      if (!password || password.length < 8) {
        passwordInput?.setAttribute("aria-invalid", "true");
        showMessage(authMessage, "Enter your password (at least 8 characters).", true);
        authMessage?.classList.add("is-error");
        passwordInput?.focus();
        return;
      }
      if (rememberEmail?.checked) localStorage.setItem("dakshRememberedEmail", email);
      else localStorage.removeItem("dakshRememberedEmail");
      loginButton?.classList.add("is-loading");
      if (loginButton) {
        loginButton.disabled = true;
        loginButton.querySelector(".button-label").textContent = "Signing in…";
      }
      showMessage(authMessage, "Checking your account…");
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "dashboard.html";
      } catch (error) {
        const raw = String(error?.message || "").toLowerCase();
        const message = raw.includes("invalid login credentials") || raw.includes("invalid credentials")
          ? "Email or password is incorrect. Please check your details and try again."
          : raw.includes("email not confirmed")
            ? "Please confirm your email address before signing in."
            : "We couldn't sign you in right now. Please try again.";
        showMessage(authMessage, message, true);
        authMessage?.classList.add("is-error");
      } finally {
        loginButton?.classList.remove("is-loading");
        if (loginButton) {
          loginButton.disabled = false;
          loginButton.querySelector(".button-label").textContent = "Sign in";
        }
      }
    });
  }

  const forgotForm = $("#forgotForm");
  if (forgotForm) forgotForm.addEventListener("submit", async event => {
    event.preventDefault();
    const email = String(new FormData(forgotForm).get("email") || "").trim().toLowerCase();
    const button = $('button[type="submit"]', forgotForm);
    setBusy(button, true, "Send reset link →");
    showMessage($("#authMessage"), "Sending password reset email…");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo("reset-password.html") });
      if (error) throw error;
      showMessage($("#authMessage"), "If an account exists for that email, a password reset link has been sent. Check your inbox.");
      forgotForm.reset();
    } catch (error) {
      showMessage($("#authMessage"), error.message || "Could not send the reset email.", true);
    } finally { setBusy(button, false, "Send reset link →"); }
  });

  const resetForm = $("#resetForm");
  if (resetForm) {
    let recoveryReady = false;
    supabase.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryReady = true;
        showMessage($("#authMessage"), "Recovery link verified. Choose your new password.");
      }
    });
    currentSession().then(session => {
      if (session) recoveryReady = true;
    }).catch(() => {});
    resetForm.addEventListener("submit", async event => {
      event.preventDefault();
      const form = new FormData(resetForm);
      const password = String(form.get("password") || "");
      const confirm = String(form.get("confirm_password") || "");
      if (password.length < 8) return showMessage($("#authMessage"), "Use at least 8 characters.", true);
      if (password !== confirm) return showMessage($("#authMessage"), "The passwords do not match.", true);
      const button = $('button[type="submit"]', resetForm);
      setBusy(button, true, "Update password →");
      try {
        if (!recoveryReady && !(await currentSession())) throw new Error("This reset link is invalid or expired. Request a new one.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        showMessage($("#authMessage"), "Password updated successfully. You can now sign in.");
        resetForm.reset();
        setTimeout(() => { window.location.href = "login.html"; }, 1400);
      } catch (error) {
        showMessage($("#authMessage"), error.message || "Could not update password.", true);
      } finally { setBusy(button, false, "Update password →"); }
    });
  }

  const dashboard = $("#ordersList");
  if (dashboard) initDashboard().catch(error => {
    console.error(error);
    window.location.href = "login.html";
  });

  async function initDashboard() {
    const session = await currentSession();
    if (!session) { window.location.href = "login.html"; return; }
    const user = session.user;
    const profileResult = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
    if (profileResult.error) throw profileResult.error;
    const profile = profileResult.data;
    $("#welcomeName").textContent = profile.full_name || user.email || "customer";
    $("#profileForm [name=full_name]").value = profile.full_name || "";
    $("#profileForm [name=phone]").value = profile.phone || "";
    $("#profileEmail").value = user.email || "";
    await Promise.all([loadOrders(user.id), loadTickets(user.id)]);

    $("#logoutButton").addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();
      if (!error) window.location.href = "login.html";
    });

    $("#profileForm").addEventListener("submit", async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const updates = {
        full_name: String(form.get("full_name") || "").trim(),
        phone: String(form.get("phone") || "").trim()
      };
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
      showMessage($("#profileMessage"), error ? error.message : "Profile saved.");
      if (!error) $("#welcomeName").textContent = updates.full_name;
    });

    $("#customerOrderForm").addEventListener("submit", async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const row = {
        user_id: user.id,
        item_description: String(form.get("item_description") || "").trim(),
        service: String(form.get("service") || ""),
        quantity: Number(form.get("quantity")),
        pickup_date: form.get("pickup_date") || null,
        address: String(form.get("address") || "").trim(),
        notes: String(form.get("notes") || "").trim()
      };
      const button = $('button[type="submit"]', event.currentTarget);
      setBusy(button, true, "Submit request →");
      const { error } = await supabase.from("orders").insert(row);
      showMessage($("#orderMessage"), error ? error.message : "Request submitted. The shop will contact you to confirm it.", !!error);
      if (!error) { event.currentTarget.reset(); await loadOrders(user.id); }
      setBusy(button, false, "Submit request →");
    });

    $("#supportForm").addEventListener("submit", async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const row = { user_id: user.id, subject: String(form.get("subject") || "").trim(), message: String(form.get("message") || "").trim() };
      const button = $('button[type="submit"]', event.currentTarget);
      setBusy(button, true, "Send message →");
      const { error } = await supabase.from("support_tickets").insert(row);
      showMessage($("#supportMessage"), error ? error.message : "Support request sent.", !!error);
      if (!error) { event.currentTarget.reset(); await loadTickets(user.id); }
      setBusy(button, false, "Send message →");
    });
  }

  async function loadOrders(userId) {
    const container = $("#ordersList");
    const { data, error } = await supabase.from("orders").select("id,item_description,service,quantity,pickup_date,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    if (!data.length) { container.innerHTML = '<div class="empty-state">No orders yet. Your pickup requests will appear here.</div>'; return; }
    container.replaceChildren(...data.map(order => {
      const card = document.createElement("article"); card.className = "dash-item";
      const title = document.createElement("strong"); title.textContent = order.item_description;
      const details = document.createElement("small"); details.textContent = order.service + " · " + order.quantity + " piece(s)" + (order.pickup_date ? " · Pickup " + order.pickup_date : "");
      const status = document.createElement("span"); status.className = "status-pill"; status.textContent = order.status;
      card.append(title, details, status); return card;
    }));
  }

  async function loadTickets(userId) {
    const container = $("#ticketsList");
    const { data, error } = await supabase.from("support_tickets").select("subject,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    if (!data.length) { container.innerHTML = '<div class="empty-state">No support requests yet.</div>'; return; }
    container.replaceChildren(...data.map(ticket => {
      const card = document.createElement("article"); card.className = "dash-item";
      const title = document.createElement("strong"); title.textContent = ticket.subject;
      const status = document.createElement("small"); status.textContent = ticket.status + " · " + new Date(ticket.created_at).toLocaleDateString();
      card.append(title, status); return card;
    }));
  }
})();
