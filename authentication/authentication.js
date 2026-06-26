"use strict";

function $(id) { return document.getElementById(id); }

// ── HELPERS ──
function setError(fieldId, msg) {
  const fg  = $(`fg-${fieldId}`);
  const err = $(`err-${fieldId}`);
  if (fg)  { fg.classList.add("has-error"); fg.classList.remove("is-valid"); }
  if (err) err.textContent = msg;
}
function setValid(fieldId) {
  const fg  = $(`fg-${fieldId}`);
  const err = $(`err-${fieldId}`);
  if (fg)  { fg.classList.remove("has-error"); fg.classList.add("is-valid"); }
  if (err) err.textContent = "";
}
function clearField(fieldId) {
  const fg  = $(`fg-${fieldId}`);
  const err = $(`err-${fieldId}`);
  if (fg)  fg.classList.remove("has-error", "is-valid");
  if (err) err.textContent = "";
}
function showAlert(type, msg) {
  const el = $("formAlert");
  if (!el) return;
  el.className = `form-alert ${type}`;
  el.textContent = msg;
}
function setLoading(on) {
  const btn = $("submitBtn");
  if (!btn) return;
  btn.disabled = on;
  btn.classList.toggle("loading", on);
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

// ── PASSWORD TOGGLE ──
const togglePw = $("togglePw");
if (togglePw) {
  togglePw.addEventListener("click", () => {
    const pw = $("password");
    if (!pw) return;
    pw.type = pw.type === "password" ? "text" : "password";
  });
}

// ── PASSWORD STRENGTH (signup only) ──
const pwInput = $("password");
const fill    = $("strengthFill");
const label   = $("strengthLabel");

if (pwInput && fill && label) {
  pwInput.addEventListener("input", () => {
    const s = getStrength(pwInput.value);
    const levels = [
      { w: "0%",   c: "transparent", l: ""        },
      { w: "25%",  c: "#ef4444",     l: "Weak"    },
      { w: "50%",  c: "#f59e0b",     l: "Fair"    },
      { w: "75%",  c: "#3b82f6",     l: "Good"    },
      { w: "100%", c: "#10b981",     l: "Strong"  },
    ];
    fill.style.width      = levels[s].w;
    fill.style.background = levels[s].c;
    label.textContent     = pwInput.value ? levels[s].l : "";
    label.style.color     = levels[s].c;
  });
}

// ── SOCIAL LOGIN ──
window.socialLogin = function(provider) {
  showAlert("success", `${provider} login coming soon!`);
};

// ── LOGIN FORM ──
const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email    = $("email")?.value.trim()  || "";
    const password = $("password")?.value      || "";
    let valid = true;

    clearField("email");
    if (!email)                { setError("email", "Email is required.");           valid = false; }
    else if (!isValidEmail(email)) { setError("email", "Enter a valid email."); valid = false; }
    else                       setValid("email");

    clearField("password");
    if (!password)             { setError("password", "Password is required.");     valid = false; }
    else if (password.length < 6) { setError("password", "Min. 6 characters.");    valid = false; }
    else                       setValid("password");

    if (!valid) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 900));

    const users = JSON.parse(localStorage.getItem("ca_users") || "[]");
    const user  = users.find(u => u.email === email && u.password === btoa(password));

    if (!user) {
      showAlert("error", "Invalid email or password.");
      setLoading(false);
      return;
    }

    localStorage.setItem("ca_session", JSON.stringify({
      name:     user.firstname + " " + user.lastname,
      email:    user.email,
      loggedIn: true,
    }));

    showAlert("success", `✓ Welcome back, ${user.firstname}! Redirecting...`);
    setTimeout(() => { window.location.href = "../index.html"; }, 1200);
    setLoading(false);
  });
}

// ── SIGNUP FORM ──
const signupForm = $("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstname = $("firstname")?.value.trim() || "";
    const lastname  = $("lastname")?.value.trim()  || "";
    const email     = $("email")?.value.trim()     || "";
    const password  = $("password")?.value         || "";
    const confirm   = $("confirm")?.value          || "";
    const terms     = $("terms")?.checked;
    let valid = true;

    clearField("firstname");
    if (!firstname) { setError("firstname", "First name required."); valid = false; }
    else setValid("firstname");

    clearField("lastname");
    if (!lastname) { setError("lastname", "Last name required."); valid = false; }
    else setValid("lastname");

    clearField("email");
    if (!email)                    { setError("email", "Email is required.");     valid = false; }
    else if (!isValidEmail(email)) { setError("email", "Enter a valid email.");   valid = false; }
    else setValid("email");

    clearField("password");
    if (!password)              { setError("password", "Password is required.");  valid = false; }
    else if (password.length < 8) { setError("password", "Min. 8 characters.");  valid = false; }
    else if (getStrength(password) < 2) { setError("password", "Too weak.");      valid = false; }
    else setValid("password");

    clearField("confirm");
    if (!confirm)            { setError("confirm", "Please confirm password.");   valid = false; }
    else if (confirm !== password) { setError("confirm", "Passwords don't match."); valid = false; }
    else setValid("confirm");

    const errTerms = $("err-terms");
    if (!terms) {
      if (errTerms) errTerms.textContent = "You must accept the terms.";
      valid = false;
    } else {
      if (errTerms) errTerms.textContent = "";
    }

    if (!valid) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 900));

    const users = JSON.parse(localStorage.getItem("ca_users") || "[]");
    if (users.find(u => u.email === email)) {
      showAlert("error", "An account with this email already exists.");
      setLoading(false);
      return;
    }

    users.push({ firstname, lastname, email, password: btoa(password), createdAt: new Date().toISOString() });
    localStorage.setItem("ca_users", JSON.stringify(users));
    localStorage.setItem("ca_session", JSON.stringify({
      name: firstname + " " + lastname,
      email, loggedIn: true,
    }));

    showAlert("success", `✓ Account created! Welcome, ${firstname}!`);
    setTimeout(() => { window.location.href = "../index.html"; }, 1300);
    setLoading(false);
  });

  // live confirm check
  $("confirm")?.addEventListener("input", () => {
    const pw  = $("password")?.value || "";
    const cfm = $("confirm")?.value  || "";
    if (!cfm) return clearField("confirm");
    cfm === pw ? setValid("confirm") : setError("confirm", "Passwords don't match.");
  });
}