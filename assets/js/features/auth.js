/* Login, registration, logout, password change */
"use strict";

function showLogin() { $("registerForm").classList.add("hidden"); $("loginForm").classList.remove("hidden"); }
function showRegister() {
  $("loginForm").classList.add("hidden"); $("registerForm").classList.remove("hidden");
  ["regName", "regUser", "regPass"].forEach(id => $(id).value = "");
}
async function register() {
  try {
    await api("register", { name: $("regName").value, username: $("regUser").value, password: $("regPass").value });
    showLogin(); toast("Account created! You can now sign in.");
  } catch (e) { toast(e.message); }
}
async function login() {
  const username = $("loginUser").value.trim(), password = $("loginPass").value;
  if (!username || !password) return toast("Enter your username and password.");
  $("loginBtn").disabled = true;
  try {
    await api("login", { username, password });
    $("loginPass").value = "";
    await reload();
    openApp();
    toast("Welcome, " + currentUser.name + "!");
  } catch (e) { toast(e.message); }
  $("loginBtn").disabled = false;
}
function openApp() {
  $("loginScreen").classList.add("hidden"); $("publicScreen").classList.add("hidden"); $("app").classList.remove("hidden");
  $("sideUser").textContent = currentUser.name; $("sideRole").textContent = currentUser.role;
  $("userAvatar").textContent = currentUser.name.charAt(0).toUpperCase();
  $("currentDate").textContent = new Date().toLocaleDateString();
  applyPermissions(); showPage("dashboard"); lastActivity = Date.now();
}
function showLoggedOut(message) {
  stopScanner(); currentUser = null;
  $("app").classList.add("hidden"); $("loginScreen").classList.remove("hidden");
  $("loginUser").value = ""; $("loginPass").value = ""; showLogin();
  if (message) toast(message);
}
async function logout() {
  try { await api("logout", {}); } catch (e) {}
  showLoggedOut("You have successfully logged out.");
}
function applyPermissions() {
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin()));
}
async function changePassword() {
  const old = $("oldPassword").value, next = $("newPassword").value;
  if (next !== $("confirmPassword").value) return toast("Passwords do not match.");
  try {
    await api("changePassword", { old, next });
    ["oldPassword", "newPassword", "confirmPassword"].forEach(id => $(id).value = "");
    toast("Password changed successfully."); await reload();
  } catch (e) { toast(e.message); }
}
