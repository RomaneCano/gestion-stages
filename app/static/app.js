"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I = {
  all: ico('<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>'),
  en_cours: ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  a_venir: ico('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>'),
  termine: ico('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>'),
  edit: ico('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  del: ico('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/>'),
  view: ico('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  copy: ico('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  ok: ico('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>'),
  ko: ico('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'),
  check: ico('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  dot: ico('<circle cx="12" cy="12" r="4"/>'),
  star: ico('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>'),
  alert: ico('<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>'),
  info: ico('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  doc: ico('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  report: ico('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>'),
  user: ico('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  pin: ico('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  building: ico('<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/>'),
  cap: ico('<path d="M2 9l10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>'),
  cloud: ico('<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19.5 10a4 4 0 0 1-.5 8H7Z"/>'),
  box: ico('<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  api: ico('<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>'),
  docs: ico('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  eye: ico('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  loop: ico('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
};

const STATUTS = {
  en_cours: { label: "En cours" },
  a_venir: { label: "À venir" },
  termine: { label: "Terminé" },
};
const FILIERES_PAR_DEFAUT = ["Informatique", "Data & IA", "Cybersécurité", "Systèmes d'information", "Santé numérique"];

const DAY = 86400000;
const parseDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysBetween = (a, b) => Math.round((b - a) / DAY);
const fmt = (iso) => parseDate(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const fmtLong = (iso) => parseDate(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fmtMois = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }); };
const plural = (n, un, plus) => `${n} ${n > 1 ? plus || un + "s" : un}`;

function analyse(s) {
  const t = today(), d0 = parseDate(s.date_debut), d1 = parseDate(s.date_fin);
  const total = daysBetween(d0, d1) + 1;
  if (t < d0) {
    const n = daysBetween(t, d0);
    return { statut: "a_venir", pct: 0, label: n === 1 ? "Débute demain" : `Débute dans ${plural(n, "jour")}` };
  }
  if (t > d1) {
    const n = daysBetween(d1, t);
    return { statut: "termine", pct: 100, label: `Terminé depuis ${plural(n, "jour")} · durée ${plural(total, "jour")}` };
  }
  const jour = daysBetween(d0, t) + 1, reste = daysBetween(t, d1);
  return {
    statut: "en_cours", pct: Math.round((jour / total) * 100),
    label: reste === 0 ? `Dernier jour (${jour}/${total})` : `Jour ${jour} sur ${total} · reste ${plural(reste, "jour")}`,
  };
}

class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }

function detailLisible(data, status) {
  const d = data && data.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => String(e.msg).replace(/^Value error, /, "")).join(" · ");
  return `Erreur ${status}`;
}

let wakeTimer = null, pending = 0;
function suivreLenteur(debut) {
  if (debut) {
    pending++;
    if (!wakeTimer) wakeTimer = setTimeout(() => banner("Le serveur gratuit se réveille… patientez quelques secondes (jusqu'à une minute après une période d'inactivité)."), 3500);
  } else if (--pending <= 0) {
    pending = 0; clearTimeout(wakeTimer); wakeTimer = null; banner(null);
  }
}

async function request(method, url, body, timeout = 70000) {
  const ctrl = new AbortController();
  const kill = setTimeout(() => ctrl.abort(), timeout);
  suivreLenteur(true);
  try {
    const res = await fetch(url, {
      method, signal: ctrl.signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, detailLisible(data, res.status));
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "Impossible de joindre l'API. Vérifiez votre connexion ou réessayez dans un instant.");
  } finally {
    clearTimeout(kill); suivreLenteur(false);
  }
}
const api = {
  list: () => request("GET", "/stages?limit=500&tri=-date_debut"),
  create: (s) => request("POST", "/stages", s),
  update: (id, s) => request("PUT", `/stages/${id}`, s),
  patch: (id, champs) => request("PATCH", `/stages/${id}`, champs),
  remove: (id) => request("DELETE", `/stages/${id}`),
  stats: () => request("GET", "/stats"),
  alertes: () => request("GET", "/alertes"),
};

const state = {
  stages: [], alertes: [], stats: null, loaded: false, error: null, view: "stages",
  filter: "all", q: "", sort: "-date_debut", filiere: "", entreprise: "", alertsOpen: false, openId: null, flashId: null,
};

function banner(msg, ko) {
  const b = $("#banner");
  b.hidden = !msg; b.className = "banner" + (ko ? " ko" : ""); b.textContent = msg || "";
}
function toast(msg, ko) {
  const t = document.createElement("div");
  t.className = "toast" + (ko ? " ko" : "");
  t.innerHTML = (ko ? I.ko : I.ok) + `<span>${esc(msg)}</span>`;
  $("#toasts").append(t);
  setTimeout(() => t.remove(), ko ? 6000 : 3800);
}
const AVATARS = ["#5a35e0", "#8e1aa3", "#d04fb8", "#e08a00", "#2f7bea", "#0fb5a3", "#17a572"];
const avatarColor = (name) => AVATARS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length];
const initiales = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const find = (id) => state.stages.find((s) => s.id === id);
const avatar = (s, cls = "") => `<span class="avatar ${cls}" style="--av:${avatarColor(s.nom_etudiant)}">${esc(initiales(s.nom_etudiant))}</span>`;
const uniques = (cle) => [...new Set(state.stages.map((s) => s[cle]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));

const ILLU = `<svg class="illu" viewBox="0 0 150 120" aria-hidden="true"><rect x="22" y="18" width="106" height="84" rx="14" fill="var(--primary-soft)"/><rect x="36" y="34" width="52" height="8" rx="4" fill="var(--primary)" opacity=".75"/><rect x="36" y="50" width="78" height="6" rx="3" fill="var(--line)"/><rect x="36" y="64" width="64" height="6" rx="3" fill="var(--line)"/><rect x="36" y="78" width="40" height="6" rx="3" fill="var(--line)"/><circle cx="116" cy="88" r="20" fill="var(--pink)"/><path d="M116 79v18M107 88h18" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`;
const videHtml = (titre, texte, boutons) => `<div class="empty">${ILLU}<h2>${titre}</h2><p>${texte}</p><div class="btns">${boutons}</div></div>`;
const BTN_NEW = `<button class="btn btn-primary" data-act="new">${I.plus}Ajouter un stage</button>`;
const BTN_DEMO = `<button class="btn btn-ghost" data-act="demo">Charger des exemples</button>`;

function compter() {
  const c = { all: state.stages.length, en_cours: 0, a_venir: 0, termine: 0 };
  state.stages.forEach((s) => c[analyse(s).statut]++);
  return c;
}

function renderCartes() {
  const c = compter();
  const cartes = [["all", "Stages au total"], ["en_cours", "En cours"], ["a_venir", "À venir"], ["termine", "Terminés"]];
  $("#stats").innerHTML = cartes.map(([k, l]) => `
    <button class="stat s-${k}" data-filter="${k}" aria-pressed="${state.filter === k}">
      <span class="stat-ico">${I[k]}</span><span><b>${c[k]}</b><span>${l}</span></span>
    </button>`).join("");
  $("#filters").innerHTML = [["all", "Tous"], ["en_cours", "En cours"], ["a_venir", "À venir"], ["termine", "Terminés"]]
    .map(([k, l]) => `<button data-filter="${k}" aria-pressed="${state.filter === k}">${l} <small>${c[k]}</small></button>`).join("");
}

const ALERTE_ICONES = { urgent: I.alert, info: I.info };
function renderAlertes() {
  const box = $("#alerts");
  if (!state.stages.length) { box.hidden = true; return; }
  box.hidden = false;
  const a = state.alertes;
  if (!a.length) {
    box.className = "alerts ok";
    box.innerHTML = `<div class="alerts-ok">${I.ok}<span><b>Tout est à jour.</b> Aucune action à mener pour le moment.</span></div>`;
    return;
  }
  box.className = "alerts";
  const urgentes = a.filter((x) => x.niveau === "urgent").length;
  const affichees = state.alertsOpen ? a : a.slice(0, 3);
  box.innerHTML = `
    <div class="alerts-head"><h2>${I.alert}À surveiller <span class="count">${a.length}</span></h2>
      ${urgentes ? `<span class="tag urgent">${plural(urgentes, "urgente")}</span>` : ""}
      ${a.length > 3 ? `<button class="btn btn-text btn-sm" data-act="alerts-toggle">${state.alertsOpen ? "Réduire" : `Tout voir (${a.length})`}</button>` : ""}</div>
    <ul class="alerts-list">${affichees.map((x) => `
      <li><button class="alert alert-${x.niveau}" data-act="open" data-id="${x.stage_id}">
        <span class="alert-ico">${ALERTE_ICONES[x.niveau]}</span>
        <span><b>${esc(x.nom_etudiant)}</b><small>${esc(x.message)}</small></span><span class="chev">›</span></button></li>`).join("")}</ul>`;
}

function renderFiltres() {
  const remplir = (sel, tous, valeurs, courant) => {
    const el = $(sel);
    el.innerHTML = `<option value="">${tous}</option>` + valeurs.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    el.value = valeurs.includes(courant) ? courant : "";
    return el.value;
  };
  state.filiere = remplir("#f-filiere", "Toutes les filières", uniques("filiere"), state.filiere);
  state.entreprise = remplir("#f-entreprise", "Toutes les entreprises", uniques("entreprise"), state.entreprise);
  $("#entreprises").innerHTML = uniques("entreprise").map((e) => `<option value="${esc(e)}">`).join("");
  $("#villes").innerHTML = uniques("ville").map((e) => `<option value="${esc(e)}">`).join("");
  const filieres = [...new Set([...FILIERES_PAR_DEFAUT, ...uniques("filiere")])].sort((a, b) => a.localeCompare(b, "fr"));
  $("#filieres").innerHTML = filieres.map((e) => `<option value="${esc(e)}">`).join("");
}

function visibles() {
  const q = state.q.trim().toLowerCase();
  const desc = state.sort.startsWith("-"), champ = state.sort.replace("-", "");
  return state.stages
    .filter((s) => state.filter === "all" || analyse(s).statut === state.filter)
    .filter((s) => !state.filiere || s.filiere === state.filiere)
    .filter((s) => !state.entreprise || s.entreprise === state.entreprise)
    .filter((s) => !q || [s.nom_etudiant, s.entreprise, s.intitule, s.ville, s.filiere].some((v) => (v || "").toLowerCase().includes(q)))
    .sort((a, b) => (a[champ] < b[champ] ? -1 : a[champ] > b[champ] ? 1 : a.id - b.id) * (desc ? -1 : 1));
}

const mini = (ok, label) => `<span class="mini ${ok ? "ok" : "todo"}" title="${label} : ${ok ? "oui" : "à faire"}">${ok ? I.check : I.dot}${label}</span>`;

function ligne(s) {
  const a = analyse(s);
  const barre = a.statut === "en_cours" ? `<div class="progress" role="progressbar" aria-valuenow="${a.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avancement du stage"><i style="width:${a.pct}%"></i></div>` : "";
  return `<tr data-id="${s.id}" tabindex="0">
    <td class="c-who"><div class="who">${avatar(s)}
      <span>${esc(s.nom_etudiant)}<div class="cell-sub">${s.filiere ? `<span class="tagline">${esc(s.filiere)}</span>` : `Stage n° ${s.id}`}</div></span></div></td>
    <td class="c-ent">${esc(s.entreprise)}${s.ville ? `<div class="cell-sub">${esc(s.ville)}</div>` : ""}</td>
    <td class="c-int">${esc(s.intitule)}${s.maitre_stage ? `<div class="cell-sub">Maître de stage : ${esc(s.maitre_stage)}</div>` : ""}</td>
    <td class="c-per"><div class="period">${fmt(s.date_debut)} → ${fmt(s.date_fin)}</div>${barre}<div class="progress-label">${esc(a.label)}</div></td>
    <td class="c-status"><span class="badge s-${a.statut}">${STATUTS[a.statut].label}</span>
      <div class="extras">${mini(s.convention_signee, "Convention")}${mini(s.rapport_remis, "Rapport")}${s.note != null ? `<span class="mini note" title="Note finale">${I.star}${s.note}/20</span>` : ""}</div></td>
    <td class="c-act"><div class="actions">
      <button class="icon-btn" data-act="open" data-id="${s.id}" title="Voir la fiche" aria-label="Voir la fiche de ${esc(s.nom_etudiant)}">${I.view}</button>
      <button class="icon-btn" data-act="edit" data-id="${s.id}" title="Modifier" aria-label="Modifier le stage de ${esc(s.nom_etudiant)}">${I.edit}</button>
      <button class="icon-btn del" data-act="del" data-id="${s.id}" title="Supprimer" aria-label="Supprimer le stage de ${esc(s.nom_etudiant)}">${I.del}</button>
    </div></td></tr>`;
}

function renderList() {
  const zone = $("#list-area");
  if (state.error) {
    zone.innerHTML = videHtml("Impossible de charger les stages", esc(state.error), '<button class="btn btn-primary" id="btn-retry">Réessayer</button>');
    return;
  }
  if (!state.loaded) { zone.innerHTML = '<div class="skeleton"></div>'.repeat(4); return; }
  if (!state.stages.length) {
    zone.innerHTML = videHtml("Aucun stage pour l'instant", "Créez votre premier stage, ou chargez quelques exemples fictifs pour découvrir l'application.", BTN_NEW + BTN_DEMO);
    return;
  }
  const rows = visibles();
  if (!rows.length) {
    zone.innerHTML = videHtml("Aucun résultat", "Aucun stage ne correspond à votre recherche ou aux filtres choisis.", '<button class="btn btn-ghost" data-act="reset">Effacer les filtres</button>');
    return;
  }
  zone.innerHTML = `<div class="table-card"><table>
    <thead><tr><th>Étudiant</th><th>Entreprise</th><th>Intitulé</th><th>Période</th><th>Suivi</th><th></th></tr></thead>
    <tbody>${rows.map(ligne).join("")}</tbody></table>
    <div class="count-line">${plural(rows.length, "stage")} affiché${rows.length > 1 ? "s" : ""} sur ${state.stages.length}</div></div>`;
  if (state.flashId) {
    const tr = $(`tr[data-id="${state.flashId}"]`);
    if (tr) { tr.classList.add("flash"); tr.scrollIntoView({ block: "nearest" }); }
    state.flashId = null;
  }
}

function render() { renderCartes(); renderAlertes(); renderFiltres(); renderList(); }

function majVues() {
  if (state.view === "planning") renderPlanning();
  if (state.view === "stats") chargerStats();
  if (dlgDetail.open) renderFiche();
}

async function rafraichirAlertes() {
  try { state.alertes = await api.alertes(); } catch { state.alertes = []; }
}

async function charger() {
  state.error = null;
  try {
    const [stages, alertes] = await Promise.all([api.list(), api.alertes()]);
    state.stages = stages; state.alertes = alertes;
  } catch (e) { state.error = e.message; }
  state.loaded = true;
  render(); majVues();
  return !state.error;
}

const dlgDetail = $("#dlg-detail");
const dlgForm = $("#dlg-form"), form = $("#form");
let formCtx = { id: null, retour: false, enregistre: false };

function anneau(note) {
  const c = 2 * Math.PI * 26, plein = note == null ? 0 : (note / 20) * c;
  return `<svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${note == null ? "Pas de note" : `Note ${note} sur 20`}">
    <circle class="bgc" cx="32" cy="32" r="26"/>
    ${plein ? `<circle cx="32" cy="32" r="26" stroke="var(--accent)" stroke-linecap="round" stroke-dasharray="${plein} ${c}" transform="rotate(-90 32 32)"/>` : ""}
    <text x="32" y="36">${note == null ? "—" : note + "/20"}</text></svg>`;
}

function renderFiche() {
  const s = find(state.openId);
  if (!s) { if (dlgDetail.open) dlgDetail.close(); return; }
  const a = analyse(s);
  const info = (icone, label, valeur, cls = "") => valeur ? `<div class="${cls}">${I[icone]}<span><dt>${label}</dt><dd>${esc(valeur)}</dd></span></div>` : "";
  const aujourdhui = a.statut === "en_cours" ? `<b style="left:${a.pct}%" title="Aujourd'hui"></b>` : "";
  $("#detail").innerHTML = `
    <header class="dlg-head drawer-head">
      <div class="who">${avatar(s, "lg")}<div><h2>${esc(s.nom_etudiant)}</h2><div class="muted">${s.filiere ? esc(s.filiere) + " · " : ""}Stage n° ${s.id}</div></div></div>
      <button type="button" class="icon-btn" data-close aria-label="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </header>
    <div class="drawer-body">
      <div class="d-status"><span class="badge s-${a.statut}">${STATUTS[a.statut].label}</span><span class="muted">${esc(a.label)}</span></div>
      <div class="timeline">
        <div class="tl-dates"><span>${fmtLong(s.date_debut)}</span><span>${fmtLong(s.date_fin)}</span></div>
        <div class="tl-bar"><i style="width:${a.pct}%"></i>${aujourdhui}</div>
        <div class="tl-sub">${plural(s.duree_jours, "jour")} · environ ${plural(Math.max(1, Math.round(s.duree_jours / 7)), "semaine")} · ${a.pct}% effectué</div>
      </div>
      <section><h3>Informations</h3><dl class="info">
        ${info("building", "Entreprise", s.entreprise)}${info("pin", "Ville", s.ville)}
        ${info("doc", "Intitulé", s.intitule, "full")}
        ${info("cap", "Tuteur à l'école", s.tuteur_ecole)}${info("user", "Maître de stage", s.maitre_stage)}
      </dl></section>
      <section><h3>Suivi administratif</h3><div class="suivi">
        <label class="switch"><input type="checkbox" data-toggle="convention_signee" ${s.convention_signee ? "checked" : ""}><span class="slider"></span><span>Convention de stage signée</span></label>
        <label class="switch"><input type="checkbox" data-toggle="rapport_remis" ${s.rapport_remis ? "checked" : ""}><span class="slider"></span><span>Rapport de stage remis</span></label>
        <div class="note-box">${anneau(s.note)}<div class="note-edit"><label for="note-input">Note finale</label>
          <input id="note-input" type="number" min="0" max="20" step="1" inputmode="numeric" value="${s.note ?? ""}" placeholder="—">
          <button class="btn btn-ghost btn-sm" data-act="save-note">Enregistrer</button></div></div>
      </div></section>
      ${s.commentaire ? `<section><h3>Commentaire</h3><div class="comment">${esc(s.commentaire)}</div></section>` : ""}
      <div class="api-call">${I.api}<span>Appel API :</span><code>GET /stages/${s.id}</code><a href="/stages/${s.id}" target="_blank" rel="noopener">Voir le JSON</a></div>
    </div>
    <footer class="dlg-foot">
      <button class="btn btn-danger-ghost" data-act="del" data-id="${s.id}">${I.del}Supprimer</button>
      <div><button class="btn btn-ghost" data-act="dup" data-id="${s.id}">${I.copy}Dupliquer</button>
      <button class="btn btn-primary" data-act="edit" data-id="${s.id}">${I.edit}Modifier</button></div>
    </footer>`;
}

function ouvrirFiche(id) {
  state.openId = id;
  renderFiche();
  if (!dlgDetail.open) dlgDetail.showModal();
}
dlgDetail.addEventListener("close", () => { if (!dlgForm.open && !dlgConfirm.open) state.openId = null; });

async function patcher(id, champs, message) {
  try {
    const maj = await api.patch(id, champs);
    state.stages = state.stages.map((s) => (s.id === id ? maj : s));
    await rafraichirAlertes();
    render(); majVues(); renderFiche();
    toast(message);
  } catch (e) { toast(e.message, true); renderFiche(); }
}

function ouvrirForm(stage, options = {}) {
  const copie = options.copie;
  const source = stage || copie || null;
  formCtx = { id: stage ? stage.id : null, retour: !!options.retour, enregistre: false };
  form.reset();
  $$(".field", form).forEach((f) => f.classList.remove("invalid"));
  $("#form-error").hidden = true;
  $("#form-title").textContent = stage ? "Modifier le stage" : copie ? "Dupliquer le stage" : "Nouveau stage";
  $("#btn-save").textContent = stage ? "Enregistrer les modifications" : "Créer le stage";
  if (source) {
    for (const k of ["nom_etudiant", "entreprise", "intitule", "date_debut", "date_fin", "filiere", "ville", "tuteur_ecole", "maitre_stage", "commentaire"]) form.elements[k].value = source[k] ?? "";
    form.elements.note.value = source.note ?? "";
    form.elements.convention_signee.checked = !!source.convention_signee;
    form.elements.rapport_remis.checked = !!source.rapport_remis;
    if (copie) { form.elements.nom_etudiant.value = ""; form.elements.note.value = ""; form.elements.rapport_remis.checked = false; }
  }
  dlgForm.showModal();
  form.elements.nom_etudiant.focus();
}

function lireForm() {
  const f = form.elements, txt = (n) => f[n].value.trim(), opt = (n) => txt(n) || null;
  return {
    nom_etudiant: txt("nom_etudiant"), entreprise: txt("entreprise"), intitule: txt("intitule"),
    date_debut: txt("date_debut"), date_fin: txt("date_fin"),
    filiere: opt("filiere"), ville: opt("ville"), tuteur_ecole: opt("tuteur_ecole"), maitre_stage: opt("maitre_stage"),
    convention_signee: f.convention_signee.checked, rapport_remis: f.rapport_remis.checked,
    note: txt("note") === "" ? null : Number(txt("note")), commentaire: opt("commentaire"),
  };
}

function valider(v) {
  const err = {};
  if (!v.nom_etudiant) err.nom_etudiant = "Indiquez le nom de l'étudiant.";
  if (!v.entreprise) err.entreprise = "Indiquez l'entreprise d'accueil.";
  if (!v.intitule) err.intitule = "Indiquez l'intitulé du stage.";
  if (!v.date_debut) err.date_debut = "Choisissez une date de début.";
  if (!v.date_fin) err.date_fin = "Choisissez une date de fin.";
  if (v.date_debut && v.date_fin && v.date_fin < v.date_debut) err.date_fin = "La fin doit être après le début.";
  if (v.note != null && (!Number.isInteger(v.note) || v.note < 0 || v.note > 20)) err.note = "Entrez une note entière entre 0 et 20.";
  $$(".field", form).forEach((f) => {
    const input = $("input, textarea", f), m = err[input.name];
    f.classList.toggle("invalid", !!m);
    const e = $(".err", f); if (e) e.textContent = m || "";
  });
  const premier = Object.keys(err)[0];
  if (premier) form.elements[premier].focus();
  return !premier;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = lireForm();
  if (!valider(data)) return;
  const btn = $("#btn-save"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Enregistrement…"; $("#form-error").hidden = true;
  try {
    const saved = formCtx.id ? await api.update(formCtx.id, data) : await api.create(data);
    const edition = !!formCtx.id;
    formCtx.enregistre = true;
    dlgForm.close();
    state.flashId = saved.id;
    await charger();
    toast(edition ? "Stage modifié" : "Stage créé");
    if (formCtx.retour) ouvrirFiche(saved.id);
  } catch (err) {
    const p = $("#form-error"); p.textContent = err.message; p.hidden = false;
  } finally { btn.disabled = false; btn.textContent = label; }
});
dlgForm.addEventListener("close", () => { if (formCtx.retour && !formCtx.enregistre && find(formCtx.id)) ouvrirFiche(formCtx.id); });

$$(".field input, .field textarea", form).forEach((i) => i.addEventListener("input", () => i.closest(".field").classList.remove("invalid")));
$$(".chip", form).forEach((c) => c.addEventListener("click", () => {
  const deb = form.elements.date_debut;
  if (!deb.value) deb.value = toIso(today());
  const d = parseDate(deb.value);
  d.setMonth(d.getMonth() + Number(c.dataset.months));
  form.elements.date_fin.value = toIso(addDays(d, -1));
  form.elements.date_fin.closest(".field").classList.remove("invalid");
}));

const dlgConfirm = $("#dlg-confirm");
let deletingId = null;
function demanderSuppression(id) {
  const s = find(id);
  if (!s) return;
  deletingId = id;
  $("#confirm-text").textContent = `Le stage de ${s.nom_etudiant} chez ${s.entreprise} sera définitivement supprimé.`;
  dlgConfirm.showModal();
  $("#btn-confirm").focus();
}
$("#btn-confirm").addEventListener("click", async () => {
  const btn = $("#btn-confirm"); btn.disabled = true;
  try {
    await api.remove(deletingId);
    dlgConfirm.close();
    if (state.openId === deletingId) { state.openId = null; dlgDetail.close(); }
    await charger(); toast("Stage supprimé");
  } catch (e) { dlgConfirm.close(); toast(e.message, true); if (e.status === 404) charger(); }
  finally { btn.disabled = false; }
});

const EXEMPLES = [
  ["Camille Durand", "Altéa Systems", "Développeur API REST", -40, 50, "Informatique", "Toulouse", "Mme Lefèvre", "M. Garnier", true, false, null, "Mission autour d'une API de facturation en Python."],
  ["Louis Petit", "Novaterra", "Ingénieur DevOps – CI/CD", -15, 75, "Informatique", "Lyon", "M. Bertrand", "Mme Roche", true, false, null, null],
  ["Inès Moreau", "Cobalt Labs", "Data analyst junior", 20, 130, "Data & IA", "Paris", "Mme Lefèvre", "M. Vidal", false, false, null, "Convention en attente de signature de l'entreprise."],
  ["Hugo Lambert", "Helios Énergie", "Assistant cybersécurité", 60, 200, "Cybersécurité", "Nantes", "M. Bertrand", "Mme Faure", false, false, null, null],
  ["Sarah Benali", "Kairos Data", "Ingénieure cloud – Kubernetes", -210, -40, "Informatique", "Lille", "Mme Lefèvre", "M. Perrin", true, true, 17, "Très bonne autonomie, déploiement complet sur Kubernetes."],
  ["Nathan Roux", "Pixelforge", "Développeur mobile", -300, -120, "Informatique", "Montpellier", "M. Bertrand", "Mme Chevalier", true, true, null, null],
  ["Léa Fontaine", "Altéa Systems", "Testeuse QA automatisation", -80, 4, "Systèmes d'information", "Toulouse", "Mme Lefèvre", "M. Garnier", true, false, null, null],
  ["Maxime Girard", "Helios Énergie", "Analyste données énergie", -160, -35, "Data & IA", "Nantes", "M. Bertrand", "Mme Faure", true, false, null, "Rapport à relancer."],
  ["Emma Lopez", "Novaterra", "Interopérabilité en santé numérique", 8, 120, "Santé numérique", "Paris", "Mme Lefèvre", "M. Vidal", true, false, null, null],
  ["Yanis Haddad", "Cobalt Labs", "Développeur front-end", -25, 95, "Systèmes d'information", "Paris", "M. Bertrand", "M. Vidal", true, false, null, null],
  ["Chloé Marchand", "Pixelforge", "Développeuse web", -330, -150, "Systèmes d'information", "Lille", "Mme Lefèvre", "Mme Chevalier", true, true, 14, null],
  ["Tom Renaud", "Altéa Systems", "Administrateur systèmes", -320, -140, "Informatique", "Toulouse", "M. Bertrand", "M. Garnier", true, true, 15, null],
  ["Jade Colin", "Novaterra", "Analyste cybersécurité", -280, -100, "Cybersécurité", "Lyon", "M. Bertrand", "Mme Roche", true, true, 18, "Excellent rapport, soutenance remarquée."],
];
async function chargerExemples() {
  $$('[data-act="demo"]').forEach((b) => { b.disabled = true; b.textContent = "Chargement…"; });
  try {
    for (const [n, e, i, d0, d1, fil, ville, tut, mai, conv, rap, note, com] of EXEMPLES) {
      await api.create({
        nom_etudiant: n, entreprise: e, intitule: i, date_debut: toIso(addDays(today(), d0)), date_fin: toIso(addDays(today(), d1)),
        filiere: fil, ville, tuteur_ecole: tut, maitre_stage: mai, convention_signee: conv, rapport_remis: rap, note, commentaire: com,
      });
    }
    await charger(); toast(`${EXEMPLES.length} stages d'exemple ajoutés`);
  } catch (e) { toast(e.message, true); await charger(); }
}

function exporter() {
  const p = new URLSearchParams();
  if (state.filter !== "all") p.set("statut", state.filter);
  if (state.q.trim()) p.set("q", state.q.trim());
  if (state.filiere) p.set("filiere", state.filiere);
  if (state.entreprise) p.set("entreprise", state.entreprise);
  const a = document.createElement("a");
  a.href = "/stages/export.csv" + (p.toString() ? "?" + p : "");
  document.body.append(a); a.click(); a.remove();
  toast("Export CSV téléchargé (ouvrable dans Excel)");
}

const VUES = ["stages", "planning", "stats", "api"];
function setView(v) {
  for (const n of VUES) {
    $(`#view-${n}`).hidden = n !== v;
    $(`#tab-${n}`).setAttribute("aria-selected", String(n === v));
  }
  state.view = v;
  try { history.replaceState(null, "", "#" + v); } catch {}
  if (v === "api") renderApiView();
  if (v === "planning") renderPlanning();
  return v === "stats" ? chargerStats() : Promise.resolve();
}
$$(".tab").forEach((t) => t.addEventListener("click", () => { setView(t.dataset.view); window.scrollTo({ top: 0 }); }));

function renderPlanning() {
  const box = $("#gantt");
  if (!state.loaded) { box.innerHTML = '<div class="skeleton"></div>'.repeat(3); return; }
  if (!state.stages.length) {
    box.innerHTML = videHtml("Rien à afficher pour l'instant", "Le planning apparaît dès que des stages existent.", BTN_NEW + BTN_DEMO);
    return;
  }
  const liste = [...state.stages].sort((a, b) => (a.date_debut < b.date_debut ? -1 : a.date_debut > b.date_debut ? 1 : a.id - b.id));
  const t = today();
  let debut = parseDate(liste.map((s) => s.date_debut).sort()[0]);
  let fin = parseDate(liste.map((s) => s.date_fin).sort().at(-1));
  if (t < debut) debut = t;
  if (t > fin) fin = t;
  debut = new Date(debut.getFullYear(), debut.getMonth(), 1);
  fin = new Date(fin.getFullYear(), fin.getMonth() + 1, 0);
  const mois = [];
  for (let d = new Date(debut); d <= fin; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    mois.push({ d: new Date(d), jours: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() });
  }
  const total = daysBetween(debut, addDays(fin, 1));
  const pos = (d) => (daysBetween(debut, d) / total) * 100;
  const gabarit = mois.map((m) => `${m.jours}fr`).join(" ");
  const courant = (m) => m.d.getFullYear() === t.getFullYear() && m.d.getMonth() === t.getMonth();
  const entete = mois.map((m, i) => `<div class="g-month ${courant(m) ? "cur" : ""}"><b>${m.d.toLocaleDateString("fr-FR", { month: "short" })}</b>${i === 0 || m.d.getMonth() === 0 ? m.d.getFullYear() : "&nbsp;"}</div>`).join("");
  const lignes = liste.map((s) => {
    const d0 = parseDate(s.date_debut), d1 = parseDate(s.date_fin), a = analyse(s);
    const largeur = ((daysBetween(d0, d1) + 1) / total) * 100;
    const titre = `${s.nom_etudiant} · ${s.intitule} (${fmt(s.date_debut)} → ${fmt(s.date_fin)})`;
    return `<div class="g-row">
      <button class="g-label" data-act="open" data-id="${s.id}" title="${esc(titre)}">${avatar(s)}<span><span class="nm">${esc(s.nom_etudiant)}</span><small>${esc(s.entreprise)}</small></span></button>
      <div class="g-track"><button class="bar ${a.statut}" data-act="open" data-id="${s.id}" title="${esc(titre)}" style="left:${pos(d0)}%;width:${largeur}%">
        ${a.statut === "en_cours" ? `<i style="width:${a.pct}%"></i>` : ""}<span>${esc(s.intitule)}</span></button></div></div>`;
  }).join("");
  const ligneAujourdhui = t >= debut && t <= fin ? `<div class="g-today" style="left:calc(var(--lab) + (100% - var(--lab)) * ${pos(t) / 100})"></div>` : "";
  box.innerHTML = `<div class="gantt-card"><div class="gantt" style="min-width:${230 + mois.length * 84}px">
    <div class="g-head"><div class="g-corner">Étudiant</div><div class="g-months" style="grid-template-columns:${gabarit}">${entete}</div></div>
    <div class="g-body"><div class="g-grid" style="grid-template-columns:${gabarit}">${mois.map((m) => `<i class="${courant(m) ? "cur" : ""}"></i>`).join("")}</div>${ligneAujourdhui}${lignes}</div></div></div>`;
  requestAnimationFrame(() => {
    const carte = $(".gantt-card");
    if (!carte || t < debut || t > fin) return;
    const largeur = carte.scrollWidth - 230;
    carte.scrollLeft = Math.max(0, 230 + (pos(t) / 100) * largeur - carte.clientWidth * 0.45);
  });
}

const COULEURS_STATUT = { en_cours: "var(--accent)", a_venir: "var(--amber)", termine: "var(--slate)" };

function donut(par) {
  const total = Object.values(par).reduce((a, b) => a + b, 0);
  let cumul = 0;
  const arcs = ["en_cours", "a_venir", "termine"].filter((k) => par[k]).map((k) => {
    const p = (par[k] / total) * 100, arc = `<circle cx="21" cy="21" r="15.9155" stroke="${COULEURS_STATUT[k]}" stroke-dasharray="${p} ${100 - p}" stroke-dashoffset="${25 - cumul}" stroke-linecap="butt"/>`;
    cumul += p; return arc;
  }).join("");
  const legende = ["en_cours", "a_venir", "termine"].map((k) => `<li style="--c:${COULEURS_STATUT[k]}"><i></i>${STATUTS[k].label}<b>${par[k]}</b></li>`).join("");
  return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Répartition des stages par statut">
    <circle class="bgc" cx="21" cy="21" r="15.9155"/>${arcs}<text class="big" x="21" y="23.5">${total}</text><text class="sm" x="21" y="28">stages</text></svg>
    <ul class="d-legend">${legende}</ul></div>`;
}
function barres(liste, vide) {
  if (!liste.length) return `<p class="chart-empty">${vide}</p>`;
  const max = Math.max(...liste.map((x) => x.total));
  return `<div class="hbars">${liste.map((x) => `<div class="hbar"><span title="${esc(x.nom)}">${esc(x.nom)}</span><div class="track"><i style="width:${(x.total / max) * 100}%"></i></div><b>${x.total}</b></div>`).join("")}</div>`;
}
function colonnes(valeurs, libelle, extra = () => "") {
  const max = Math.max(1, ...valeurs.map((v) => v.valeur));
  return `<div class="cols">${valeurs.map((v) => `<div class="col ${extra(v)}" title="${esc(v.titre)}"><span class="v">${v.valeur}</span><div class="b" style="height:${(v.valeur / max) * 100}%"></div><span>${esc(libelle(v))}</span></div>`).join("")}</div>`;
}
const meter = (titre, n, d, sous) => `<div class="meter"><b><span>${titre}</span><span>${d ? Math.round((n / d) * 100) + "%" : "—"}</span></b><div class="track"><i style="width:${d ? (n / d) * 100 : 0}%"></i></div><small>${sous}</small></div>`;
const kpi = (k, icone, valeur, label, sous = "") => `<div class="kpi k-${k}"><span class="k-ico">${I[icone]}</span><b>${valeur}</b><span>${label}</span>${sous ? `<small>${sous}</small>` : ""}</div>`;

function renderStatsView() {
  const st = state.stats, kp = $("#kpis"), ch = $("#charts");
  if (!st) { kp.innerHTML = ""; ch.innerHTML = '<div class="skeleton"></div>'.repeat(2); return; }
  if (!st.total) {
    kp.innerHTML = "";
    ch.innerHTML = `<div class="wide">${videHtml("Pas encore de statistiques", "Les indicateurs se calculent dès que des stages sont enregistrés.", BTN_NEW + BTN_DEMO)}</div>`;
    return;
  }
  const semaines = st.duree_moyenne_jours ? Math.round(st.duree_moyenne_jours / 7) : null;
  kp.innerHTML = [
    kpi(1, "all", st.total, "Stages enregistrés", `${st.par_statut.en_cours} en cours`),
    kpi(2, "building", st.entreprises, "Entreprises d'accueil"),
    kpi(3, "a_venir", semaines ? `${semaines} sem.` : "—", "Durée moyenne", st.duree_moyenne_jours ? `${Math.round(st.duree_moyenne_jours)} jours` : ""),
    kpi(4, "doc", st.convention_signee_pct == null ? "—" : st.convention_signee_pct + "%", "Conventions signées", `${st.conventions_signees} sur ${st.total}`),
    kpi(5, "report", st.rapport_remis_pct == null ? "—" : st.rapport_remis_pct + "%", "Rapports remis", `${st.rapports_remis} sur ${st.stages_termines} terminés`),
    kpi(6, "star", st.note_moyenne == null ? "—" : st.note_moyenne.toFixed(1).replace(".", ",") + "/20", "Note moyenne"),
  ].join("");
  const maintenant = toIso(today()).slice(0, 7);
  const mois = st.par_mois.map((m) => ({ valeur: m.actifs, mois: m.mois, titre: `${fmtMois(m.mois)} : ${plural(m.actifs, "stage actif", "stages actifs")}, ${plural(m.debuts, "début")}` }));
  const notes = st.notes.map((n) => ({ valeur: n.total, tranche: n.tranche, titre: `Notes ${n.tranche} : ${plural(n.total, "étudiant")}` }));
  ch.innerHTML = `
    <article class="card"><h2>Répartition par statut</h2><p class="muted">Calculé d'après les dates de début et de fin.</p>${donut(st.par_statut)}</article>
    <article class="card"><h2>Suivi administratif</h2><p class="muted">Documents à obtenir pour chaque stage.</p><div class="meters">
      ${meter("Conventions signées", st.conventions_signees, st.total, `${st.conventions_signees} sur ${st.total} stages`)}
      ${meter("Rapports remis", st.rapports_remis, st.stages_termines, `${st.rapports_remis} sur ${st.stages_termines} stages terminés`)}</div></article>
    <article class="card wide"><h2>Stages actifs mois par mois</h2><p class="muted">Nombre de stages en cours chaque mois. Le mois courant est en couleur chaude.</p>
      ${colonnes(mois, (v) => fmtMois(v.mois), (v) => (v.mois === maintenant ? "cur" : ""))}</article>
    <article class="card"><h2>Entreprises d'accueil</h2><p class="muted">Nombre de stages par entreprise.</p>${barres(st.top_entreprises, "Aucune entreprise.")}</article>
    <article class="card"><h2>Filières</h2><p class="muted">Répartition des étudiants par filière.</p>${barres(st.par_filiere, "Aucune filière renseignée.")}</article>
    <article class="card"><h2>Villes</h2><p class="muted">Lieux de stage les plus fréquents.</p>${barres(st.par_ville, "Aucune ville renseignée.")}</article>
    <article class="card"><h2>Distribution des notes</h2><p class="muted">Notes finales sur 20.</p>${notes.some((n) => n.valeur) ? colonnes(notes, (v) => v.tranche, () => "hist") : '<p class="chart-empty">Aucune note saisie.</p>'}</article>`;
}

async function chargerStats() {
  try { state.stats = await api.stats(); }
  catch (e) { state.stats = null; $("#charts").innerHTML = videHtml("Impossible de charger les statistiques", esc(e.message), ""); return; }
  renderStatsView();
}

const ENDPOINTS = [
  ["GET", "/stages", "Lister les stages (filtres : q, statut, entreprise, filiere, ville, tri, limit, offset)", ["200"], 'curl "{u}/stages?statut=en_cours&tri=date_fin"'],
  ["POST", "/stages", "Créer un stage (JSON dans le corps de la requête)", ["201", "422"],
    `curl -X POST {u}/stages -H "Content-Type: application/json" -d '{"nom_etudiant":"Camille Durand","entreprise":"Altéa Systems","intitule":"Développeur API REST","date_debut":"2027-03-01","date_fin":"2027-08-27","ville":"Toulouse"}'`],
  ["GET", "/stages/{id}", "Consulter un stage", ["200", "404"], "curl {u}/stages/1"],
  ["PUT", "/stages/{id}", "Remplacer toutes les données d'un stage", ["200", "404", "422"],
    `curl -X PUT {u}/stages/1 -H "Content-Type: application/json" -d '{"nom_etudiant":"Camille Durand","entreprise":"Altéa Systems","intitule":"Ingénieur DevOps","date_debut":"2027-03-01","date_fin":"2027-08-27"}'`],
  ["PATCH", "/stages/{id}", "Modifier quelques champs (ex. convention signée)", ["200", "404", "422"],
    `curl -X PATCH {u}/stages/1 -H "Content-Type: application/json" -d '{"convention_signee":true,"note":16}'`],
  ["DELETE", "/stages/{id}", "Supprimer un stage", ["204", "404"], "curl -X DELETE {u}/stages/1"],
  ["GET", "/stages/export.csv", "Exporter la sélection en CSV (Excel)", ["200"], 'curl -O -J "{u}/stages/export.csv"'],
  ["GET", "/stats", "Indicateurs : statuts, entreprises, filières, mois, notes", ["200"], "curl {u}/stats"],
  ["GET", "/alertes", "Actions à mener : conventions, rapports, échéances", ["200"], "curl {u}/alertes"],
  ["GET", "/health", "Santé du service (supervision)", ["200"], "curl {u}/health"],
];
const NOTIONS = [
  ["cloud", "Cloud public & PaaS", "L'application tourne chez Render : aucun serveur à administrer, accessible depuis Internet en HTTPS."],
  ["box", "Conteneur Docker", "Dockerfile → image → conteneur : l'application et ses dépendances s'exécutent à l'identique partout."],
  ["api", "API REST", "Une URI unique par ressource, le CRUD via GET / POST / PUT / PATCH / DELETE, des échanges en JSON."],
  ["docs", "OpenAPI / Swagger", "La spécification et la documentation interactive sont générées automatiquement par FastAPI."],
  ["eye", "Traçabilité & supervision", "Chaque requête est journalisée (méthode, statut, durée, X-Request-ID) et /health permet la supervision."],
  ["loop", "DevOps · CI/CD", "GitHub Actions teste et construit l'image ; Render redéploie à chaque push sur la branche principale."],
];
let apiViewDone = false;
function renderApiView() {
  $("#base-url").textContent = location.origin;
  if (apiViewDone) return;
  apiViewDone = true;
  $("#endpoints").innerHTML = ENDPOINTS.map(([m, p, d, codes, curl]) => `
    <div class="ep"><span class="method m-${m}">${m}</span><code class="path">${esc(p)}</code><span class="desc">${esc(d)}</span>
      <span class="codes">${codes.map((c) => `<span class="code ${c[0] === "2" ? "ok" : "ko"}">${c}</span>`).join("")}</span>
      <button class="btn btn-ghost btn-sm" data-curl="${esc(curl)}" title="Copier la commande curl">curl</button></div>`).join("");
  $("#notions").innerHTML = NOTIONS.map(([i, t, d]) => `<div class="notion"><b>${I[i]}${esc(t)}</b><p>${esc(d)}</p></div>`).join("");
}
async function copier(texte, message) {
  try { await navigator.clipboard.writeText(texte); toast(message); }
  catch {
    const ta = document.createElement("textarea"); ta.value = texte; document.body.append(ta); ta.select();
    try { document.execCommand("copy"); toast(message); } catch { toast("Copie impossible", true); }
    ta.remove();
  }
}

async function sonderApi(premiere) {
  const pill = $("#api-pill");
  try {
    const h = await request("GET", "/health", null, premiere ? 70000 : 10000);
    pill.className = "pill pill-ok";
    pill.innerHTML = `<i class="dot"></i><span>API en ligne · v${esc(h.version)}</span>`;
    pill.title = `${h.stages} stage(s) en base`;
    return true;
  } catch {
    pill.className = "pill pill-ko";
    pill.innerHTML = '<i class="dot"></i><span>API injoignable</span>';
    return false;
  }
}

const TOUR_KEY = "stages.tour.v2";
const ETAPES = [
  { title: "Bienvenue à l'ISIS 👋", body: "Cette application suit les stages des étudiants : dates, entreprises, conventions, rapports et notes. Elle s'appuie sur une API REST hébergée dans le cloud. La visite dure moins de deux minutes.", extra: true },
  { target: "#stats", title: "La vue d'ensemble", body: "Nombre de stages au total, en cours, à venir et terminés. Cliquez sur une carte pour filtrer la liste." },
  { target: "#alerts", title: "À surveiller", body: "L'application repère pour vous ce qui demande une action : convention non signée, stage qui se termine, rapport non remis, note à saisir. Cliquez sur une alerte pour ouvrir la fiche." },
  { target: "#btn-new", title: "Créer un stage", body: "Renseignez l'étudiant, l'entreprise, l'intitulé et les dates. Les durées rapides (2, 4 ou 6 mois) remplissent la date de fin. L'encadrement et le suivi sont facultatifs." },
  { target: "#toolbar", title: "Retrouver un stage", body: "Recherchez par nom, entreprise, ville ou filière, filtrez par statut, filière ou entreprise, et choisissez l'ordre de tri. Astuce : la touche « / » active la recherche, « n » crée un stage." },
  { target: "#list-area", title: "Ouvrir la fiche d'un stage", body: "Cliquez sur une ligne pour ouvrir la fiche : progression, contacts, cases à cocher pour la convention et le rapport, note finale. Les boutons à droite permettent de modifier ou supprimer." },
  { target: "#btn-export", title: "Exporter vers Excel", body: "Téléchargez la sélection affichée au format CSV, directement ouvrable dans Excel." },
  { target: "#gantt", view: "planning", title: "Le planning", body: "Tous les stages sur une frise chronologique, avec la ligne « Aujourd'hui ». Cliquez sur une barre pour ouvrir la fiche." },
  { target: "#kpis", view: "stats", title: "Les statistiques", body: "Durée moyenne, conventions signées, rapports remis, note moyenne, activité mois par mois, entreprises, filières et villes : tout est calculé par l'API." },
  { target: "#api-links", view: "api", title: "API & Cloud", body: "Adresse de base, documentation Swagger, endpoints à copier en curl, architecture et notions du cours mises en œuvre." },
  { target: "#btn-help", view: "stages", title: "Besoin d'aide ?", body: "Ce bouton relance la visite guidée à tout moment. Bonne découverte !" },
];
let tourIndex = 0, tourActive = false;
const tour = $("#tour");

function demarrerTour() {
  tourActive = true; tourIndex = 0; tour.hidden = false;
  $("#tour-dots").innerHTML = ETAPES.map(() => "<i></i>").join("");
  afficherEtape();
}
function finirTour(terminee) {
  tourActive = false; tour.hidden = true;
  store.set(TOUR_KEY, "done");
  setView("stages"); window.scrollTo({ top: 0 });
  if (terminee) toast("Visite terminée. Le bouton « ? » permet de la relancer.");
}
async function afficherEtape() {
  const e = ETAPES[tourIndex], index = tourIndex;
  $("#tour-count").textContent = `Étape ${tourIndex + 1} sur ${ETAPES.length}`;
  $("#tour-title").textContent = e.title;
  $("#tour-body").textContent = e.body;
  $$("#tour-dots i").forEach((d, i) => d.classList.toggle("on", i === tourIndex));
  $("#tour-prev").hidden = tourIndex === 0;
  $("#tour-next").textContent = tourIndex === ETAPES.length - 1 ? "Terminer" : tourIndex === 0 ? "Commencer" : "Suivant";
  const extra = $("#tour-extra");
  extra.hidden = !(e.extra && !state.stages.length);
  extra.textContent = "Charger des exemples pour la visite";
  await setView(e.view || "stages");
  if (index !== tourIndex || !tourActive) return;
  requestAnimationFrame(() => placerEtape(true));
  $("#tour-next").focus({ preventScroll: true });
}
function placerEtape(scroller) {
  if (!tourActive) return;
  const e = ETAPES[tourIndex], pop = $("#tour-pop"), hole = $("#tour-hole");
  const el = e.target ? $(e.target) : null;
  const vw = innerWidth, vh = innerHeight, gap = 16, m = 12;
  if (!el || !el.offsetParent) {
    Object.assign(hole.style, { top: vh / 2 + "px", left: vw / 2 + "px", width: "0px", height: "0px" });
    pop.style.left = Math.max(m, (vw - pop.offsetWidth) / 2) + "px";
    pop.style.top = Math.max(m, (vh - pop.offsetHeight) / 2) + "px";
    return;
  }
  if (scroller) el.scrollIntoView({ block: el.getBoundingClientRect().height > vh * 0.5 ? "start" : "center", behavior: "instant" });
  const r = el.getBoundingClientRect(), pad = 8;
  const hauteur = Math.min(r.height, vh * 0.62);
  Object.assign(hole.style, { top: r.top - pad + "px", left: r.left - pad + "px", width: r.width + pad * 2 + "px", height: hauteur + pad * 2 + "px" });
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let top = r.top + hauteur + pad + gap;
  if (top + ph > vh - m) top = r.top - pad - gap - ph;
  if (top < m) top = Math.max(m, vh - ph - m);
  pop.style.top = top + "px";
  pop.style.left = Math.min(Math.max(m, r.left + r.width / 2 - pw / 2), vw - pw - m) + "px";
}
$("#tour-next").addEventListener("click", () => { if (tourIndex === ETAPES.length - 1) finirTour(true); else { tourIndex++; afficherEtape(); } });
$("#tour-prev").addEventListener("click", () => { if (tourIndex > 0) { tourIndex--; afficherEtape(); } });
$("#tour-skip").addEventListener("click", () => finirTour(false));
$("#tour-extra").addEventListener("click", async () => {
  const b = $("#tour-extra"); b.disabled = true; b.textContent = "Chargement…";
  await chargerExemples();
  b.disabled = false; b.hidden = true;
  placerEtape(false);
});
addEventListener("resize", () => placerEtape(false));
addEventListener("keydown", (e) => {
  if (!tourActive) return;
  if (e.key === "Escape") finirTour(false);
  else if (e.key === "ArrowRight") $("#tour-next").click();
  else if (e.key === "ArrowLeft") $("#tour-prev").click();
});
$("#btn-help").addEventListener("click", () => { if (dlgDetail.open) dlgDetail.close(); setView("stages"); window.scrollTo({ top: 0 }); demarrerTour(); });

function appliquerTheme(t) { document.documentElement.dataset.theme = t; store.set("stages.theme", t); }
appliquerTheme(store.get("stages.theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
$("#btn-theme").addEventListener("click", () => appliquerTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

$("#btn-new").addEventListener("click", () => ouvrirForm());
$("#btn-export").addEventListener("click", exporter);
$("#q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); });
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderList(); });
$("#f-filiere").addEventListener("change", (e) => { state.filiere = e.target.value; renderList(); });
$("#f-entreprise").addEventListener("change", (e) => { state.entreprise = e.target.value; renderList(); });
function filtrer(k) { state.filter = k; renderCartes(); renderList(); }

document.addEventListener("click", (e) => {
  const t = e.target.closest("button, [data-close]");
  if (!t) {
    const tr = e.target.closest("tr[data-id]");
    if (tr) ouvrirFiche(Number(tr.dataset.id));
    return;
  }
  const id = Number(t.dataset.id);
  if (t.dataset.filter) filtrer(state.filter === t.dataset.filter && t.classList.contains("stat") ? "all" : t.dataset.filter);
  else if (t.dataset.act === "new") ouvrirForm();
  else if (t.dataset.act === "demo") chargerExemples();
  else if (t.dataset.act === "reset") { state.q = ""; state.filiere = ""; state.entreprise = ""; $("#q").value = ""; filtrer("all"); renderFiltres(); }
  else if (t.dataset.act === "open") ouvrirFiche(id);
  else if (t.dataset.act === "edit") { const depuis = dlgDetail.open; if (depuis) dlgDetail.close(); ouvrirForm(find(id), { retour: depuis }); }
  else if (t.dataset.act === "dup") { dlgDetail.close(); ouvrirForm(null, { copie: find(id) }); }
  else if (t.dataset.act === "del") demanderSuppression(id);
  else if (t.dataset.act === "alerts-toggle") { state.alertsOpen = !state.alertsOpen; renderAlertes(); }
  else if (t.dataset.act === "save-note") {
    const brut = $("#note-input").value.trim(), note = brut === "" ? null : Number(brut);
    if (note !== null && (!Number.isInteger(note) || note < 0 || note > 20)) { toast("La note doit être un entier entre 0 et 20", true); return; }
    patcher(state.openId, { note }, note === null ? "Note effacée" : "Note enregistrée");
  }
  else if (t.id === "btn-retry") { state.loaded = false; renderList(); charger(); }
  else if (t.dataset.copy) copier($(t.dataset.copy).textContent, "Adresse copiée");
  else if (t.dataset.curl) copier(t.dataset.curl.replaceAll("{u}", location.origin), "Commande curl copiée");
  else if (t.hasAttribute("data-close")) t.closest("dialog").close();
});
document.addEventListener("change", (e) => {
  const c = e.target.closest("[data-toggle]");
  if (!c) return;
  const champ = c.dataset.toggle;
  const messages = {
    convention_signee: c.checked ? "Convention marquée comme signée" : "Convention marquée non signée",
    rapport_remis: c.checked ? "Rapport marqué comme remis" : "Rapport marqué non remis",
  };
  patcher(state.openId, { [champ]: c.checked }, messages[champ]);
});
for (const d of $$("dialog")) d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("tr[data-id]")) ouvrirFiche(Number(e.target.dataset.id));
  if (tourActive || e.metaKey || e.ctrlKey || e.altKey || $$("dialog").some((d) => d.open)) return;
  if (e.target.matches("input, textarea, select")) return;
  if (e.key === "/") { e.preventDefault(); setView("stages"); $("#q").focus(); }
  else if (e.key === "n") { e.preventDefault(); ouvrirForm(); }
});

(async function init() {
  const depart = location.hash.slice(1);
  setView(VUES.includes(depart) ? depart : "stages");
  render();
  const [, ok] = await Promise.all([sonderApi(true), charger()]);
  setInterval(() => sonderApi(false), 30000);
  if (ok && store.get(TOUR_KEY) !== "done") setTimeout(demarrerTour, 500);
})();
