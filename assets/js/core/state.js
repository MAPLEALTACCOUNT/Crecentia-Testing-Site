/* Shared application state and tiny accessors */
"use strict";

let data = { rooms: [], items: [], transfers: [], inspections: [], history: [] };
let currentUser = null, charts = {}, scanner = null, lastActivity = Date.now(), toastTimer = null;
const $ = id => document.getElementById(id);
const qty = i => Number(i.qtyPhysical ?? i.quantity) || 0;
const isAdmin = () => currentUser?.role === "Admin";
