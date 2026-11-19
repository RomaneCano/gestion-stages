"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
  ok: ico('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>'),
  ko: ico('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'),
  cloud: ico('<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19.5 10a4 4 0 0 1-.5 8H7Z"/>'),
  box: ico('<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  api: ico('<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>'),
  doc: ico('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  eye: ico('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  loop: ico('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
};

const STATUTS = {
  en_cours: { label: "En cours", plural: "En cours" },
  a_venir: { label: "À venir", plural: "À venir" },
  termine: { label: "Terminé", plural: "Terminés" },
};

const DAY = 86400000;
const parseDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysBetween = (a, b) => Math.round((b - a) / DAY);
const fmt = (iso) => parseDate(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
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
  remove: (id) => request("DELETE", `/stages/${id}`),
};

const state = { stages: [], loaded: false, error: null, filter: "all", q: "", sort: "-date_debut", flashId: null };

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
const AVATARS = ["#5b5bd6", "#0fb5a3", "#e58a0d", "#d6409f", "#2f7bea", "#8a5cf0", "#17a572"];
const avatarColor = (name) => AVATARS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length];
const initiales = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

function renderStats() {
  const c = { all: state.stages.length, en_cours: 0, a_venir: 0, termine: 0 };
  state.stages.forEach((s) => c[analyse(s).statut]++);
  const cartes = [["all", "Stages au total"], ["en_cours", "En cours"], ["a_venir", "À venir"], ["termine", "Terminés"]];
  $("#stats").innerHTML = cartes.map(([k, l]) => `
    <button class="stat s-${k}" data-filter="${k}" aria-pressed="${state.filter === k}">
      <span class="stat-ico">${I[k]}</span><span><b>${c[k]}</b><span>${l}</span></span>
    </button>`).join("");
  $("#filters").innerHTML = [["all", "Tous"], ["en_cours", "En cours"], ["a_venir", "À venir"], ["termine", "Terminés"]]
    .map(([k, l]) => `<button data-filter="${k}" aria-pressed="${state.filter === k}">${l} <small>${c[k]}</small></button>`).join("");
}

function visibles() {
  const q = state.q.trim().toLowerCase();
  const desc = state.sort.startsWith("-"), champ = state.sort.replace("-", "");
  return state.stages
    .filter((s) => state.filter === "all" || analyse(s).statut === state.filter)
    .filter((s) => !q || [s.nom_etudiant, s.entreprise, s.intitule].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => (a[champ] < b[champ] ? -1 : a[champ] > b[champ] ? 1 : a.id - b.id) * (desc ? -1 : 1));
}

const ILLU = `<svg class="illu" viewBox="0 0 150 120" aria-hidden="true"><rect x="22" y="18" width="106" height="84" rx="14" fill="var(--primary-soft)"/><rect x="36" y="34" width="52" height="8" rx="4" fill="var(--primary)" opacity=".75"/><rect x="36" y="50" width="78" height="6" rx="3" fill="var(--line)"/><rect x="36" y="64" width="64" height="6" rx="3" fill="var(--line)"/><rect x="36" y="78" width="40" height="6" rx="3" fill="var(--line)"/><circle cx="116" cy="88" r="20" fill="var(--accent)"/><path d="M116 79v18M107 88h18" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`;

function renderList() {
  const zone = $("#list-area");
  if (state.error) {
    zone.innerHTML = `<div class="empty"><h2>Impossible de charger les stages</h2><p>${esc(state.error)}</p><div class="btns"><button class="btn btn-primary" id="btn-retry">Réessayer</button></div></div>`;
    return;
  }
  if (!state.loaded) { zone.innerHTML = '<div class="skeleton"></div>'.repeat(4); return; }
  if (!state.stages.length) {
    zone.innerHTML = `<div class="empty">${ILLU}<h2>Aucun stage pour l'instant</h2>
      <p>Créez votre premier stage, ou chargez quelques exemples fictifs pour découvrir l'application.</p>
      <div class="btns"><button class="btn btn-primary" data-act="new">${ico('<path d="M12 5v14M5 12h14"/>')}Ajouter un stage</button>
      <button class="btn btn-ghost" data-act="demo">Charger des exemples</button></div></div>`;
    return;
  }
  const rows = visibles();
  if (!rows.length) {
    zone.innerHTML = `<div class="empty"><h2>Aucun résultat</h2><p>Aucun stage ne correspond à votre recherche ou au filtre choisi.</p>
      <div class="btns"><button class="btn btn-ghost" data-act="reset">Effacer les filtres</button></div></div>`;
    return;
  }
  zone.innerHTML = `<div class="table-card"><table>
    <thead><tr><th>Étudiant</th><th>Entreprise</th><th>Intitulé</th><th>Période</th><th>Statut</th><th></th></tr></thead>
    <tbody>${rows.map(ligne).join("")}</tbody></table>
    <div class="count">${plural(rows.length, "stage")} affiché${rows.length > 1 ? "s" : ""} sur ${state.stages.length}</div></div>`;
  if (state.flashId) {
    const tr = $(`tr[data-id="${state.flashId}"]`);
    if (tr) { tr.classList.add("flash"); tr.scrollIntoView({ block: "nearest" }); }
    state.flashId = null;
  }
}

function ligne(s) {
  const a = analyse(s);
  const barre = a.statut === "en_cours" ? `<div class="progress" role="progressbar" aria-valuenow="${a.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avancement du stage"><i style="width:${a.pct}%"></i></div>` : "";
  return `<tr data-id="${s.id}">
    <td class="c-who"><div class="who"><span class="avatar" style="--av:${avatarColor(s.nom_etudiant)}">${esc(initiales(s.nom_etudiant))}</span>
      <span>${esc(s.nom_etudiant)}<div class="cell-sub">Stage n° ${s.id}</div></span></div></td>
    <td class="c-ent">${esc(s.entreprise)}</td>
    <td class="c-int">${esc(s.intitule)}</td>
    <td class="c-per"><div class="period">${fmt(s.date_debut)} → ${fmt(s.date_fin)}</div>${barre}<div class="progress-label">${esc(a.label)}</div></td>
    <td class="c-status"><span class="badge s-${a.statut}" style="--c:var(--${a.statut === "en_cours" ? "accent" : a.statut === "a_venir" ? "amber" : "slate"});--bg-c:var(--${a.statut === "en_cours" ? "accent-soft" : a.statut === "a_venir" ? "amber-soft" : "slate-soft"})">${STATUTS[a.statut].label}</span></td>
    <td class="c-act"><div class="actions">
      <button class="icon-btn" data-act="edit" data-id="${s.id}" title="Modifier" aria-label="Modifier le stage de ${esc(s.nom_etudiant)}">${I.edit}</button>
      <button class="icon-btn del" data-act="del" data-id="${s.id}" title="Supprimer" aria-label="Supprimer le stage de ${esc(s.nom_etudiant)}">${I.del}</button>
    </div></td></tr>`;
}

function render() { renderStats(); renderList(); renderCompanies(); }
function renderCompanies() {
  $("#entreprises").innerHTML = [...new Set(state.stages.map((s) => s.entreprise))].sort().map((e) => `<option value="${esc(e)}">`).join("");
}

async function charger() {
  state.error = null;
  try { state.stages = await api.list(); state.loaded = true; }
  catch (e) { state.error = e.message; state.loaded = true; }
  render();
  return !state.error;
}

const dlgForm = $("#dlg-form"), form = $("#form");
let editingId = null;

function ouvrirForm(stage) {
  editingId = stage ? stage.id : null;
  form.reset();
  $$(".field", form).forEach((f) => f.classList.remove("invalid"));
  $("#form-error").hidden = true;
  $("#form-title").textContent = stage ? "Modifier le stage" : "Nouveau stage";
  $("#btn-save").textContent = stage ? "Enregistrer les modifications" : "Créer le stage";
  if (stage) for (const k of ["nom_etudiant", "entreprise", "intitule", "date_debut", "date_fin"]) form.elements[k].value = stage[k];
  dlgForm.showModal();
  form.elements.nom_etudiant.focus();
}

function valider() {
  const v = Object.fromEntries(new FormData(form));
  for (const k in v) v[k] = String(v[k]).trim();
  const err = {};
  if (!v.nom_etudiant) err.nom_etudiant = "Indiquez le nom de l'étudiant.";
  if (!v.entreprise) err.entreprise = "Indiquez l'entreprise d'accueil.";
  if (!v.intitule) err.intitule = "Indiquez l'intitulé du stage.";
  if (!v.date_debut) err.date_debut = "Choisissez une date de début.";
  if (!v.date_fin) err.date_fin = "Choisissez une date de fin.";
  if (v.date_debut && v.date_fin && v.date_fin < v.date_debut) err.date_fin = "La fin doit être après le début.";
  $$(".field", form).forEach((f) => {
    const name = $("input", f).name, m = err[name];
    f.classList.toggle("invalid", !!m);
    $(".err", f).textContent = m || "";
  });
  const premier = Object.keys(err)[0];
  if (premier) form.elements[premier].focus();
  return premier ? null : v;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = valider();
  if (!data) return;
  const btn = $("#btn-save"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Enregistrement…"; $("#form-error").hidden = true;
  try {
    const saved = editingId ? await api.update(editingId, data) : await api.create(data);
    dlgForm.close();
    state.flashId = saved.id;
    await charger();
    toast(editingId ? "Stage modifié" : "Stage créé");
  } catch (err) {
    const p = $("#form-error"); p.textContent = err.message; p.hidden = false;
  } finally { btn.disabled = false; btn.textContent = label; }
});

$$(".field input", form).forEach((i) => i.addEventListener("input", () => i.closest(".field").classList.remove("invalid")));
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
  const s = state.stages.find((x) => x.id === id);
  if (!s) return;
  deletingId = id;
  $("#confirm-text").textContent = `Le stage de ${s.nom_etudiant} chez ${s.entreprise} sera définitivement supprimé.`;
  dlgConfirm.showModal();
  $("#btn-confirm").focus();
}
$("#btn-confirm").addEventListener("click", async () => {
  const btn = $("#btn-confirm"); btn.disabled = true;
  try { await api.remove(deletingId); dlgConfirm.close(); await charger(); toast("Stage supprimé"); }
  catch (e) { dlgConfirm.close(); toast(e.message, true); if (e.status === 404) charger(); }
  finally { btn.disabled = false; }
});

const EXEMPLES = [
  ["Camille Durand", "Altéa Systems", "Développeur API REST", -40, 50],
  ["Louis Petit", "Novaterra", "Ingénieur DevOps – CI/CD", -15, 75],
  ["Inès Moreau", "Cobalt Labs", "Data analyst junior", 20, 130],
  ["Hugo Lambert", "Helios Énergie", "Assistant cybersécurité", 60, 200],
  ["Sarah Benali", "Kairos Data", "Ingénieure cloud – Kubernetes", -210, -40],
  ["Nathan Roux", "Pixelforge", "Développeur mobile", -300, -120],
  ["Léa Fontaine", "Altéa Systems", "Testeuse QA automatisation", -80, 10],
];
async function chargerExemples() {
  const btn = $('[data-act="demo"]'); if (btn) { btn.disabled = true; btn.textContent = "Chargement…"; }
  try {
    for (const [nom, ent, int, d0, d1] of EXEMPLES) {
      await api.create({ nom_etudiant: nom, entreprise: ent, intitule: int, date_debut: toIso(addDays(today(), d0)), date_fin: toIso(addDays(today(), d1)) });
    }
    await charger(); toast(`${EXEMPLES.length} stages d'exemple ajoutés`);
  } catch (e) { toast(e.message, true); await charger(); }
}

function setView(v) {
  for (const name of ["stages", "api"]) {
    $(`#view-${name}`).hidden = name !== v;
    const t = $(`#tab-${name}`); t.setAttribute("aria-selected", String(name === v));
  }
  if (v === "api") renderApiView();
  store.set("stages.view", v);
}
$$(".tab").forEach((t) => t.addEventListener("click", () => { setView(t.dataset.view); window.scrollTo({ top: 0 }); }));

const ENDPOINTS = [
  ["GET", "/stages", "Lister les stages (filtres : q, statut, entreprise, tri, limit, offset)", ["200"], 'curl "{u}/stages?statut=en_cours"'],
  ["POST", "/stages", "Créer un stage (JSON dans le corps de la requête)", ["201", "422"],
    `curl -X POST {u}/stages -H "Content-Type: application/json" -d '{"nom_etudiant":"Camille Durand","entreprise":"Altéa Systems","intitule":"Développeur API REST","date_debut":"2027-03-01","date_fin":"2027-08-27"}'`],
  ["GET", "/stages/{id}", "Consulter un stage", ["200", "404"], "curl {u}/stages/1"],
  ["PUT", "/stages/{id}", "Modifier un stage (remplace tous les champs)", ["200", "404", "422"],
    `curl -X PUT {u}/stages/1 -H "Content-Type: application/json" -d '{"nom_etudiant":"Camille Durand","entreprise":"Altéa Systems","intitule":"Ingénieur DevOps","date_debut":"2027-03-01","date_fin":"2027-08-27"}'`],
  ["DELETE", "/stages/{id}", "Supprimer un stage", ["204", "404"], "curl -X DELETE {u}/stages/1"],
  ["GET", "/health", "Santé du service (supervision)", ["200"], "curl {u}/health"],
];
const NOTIONS = [
  ["cloud", "Cloud public & PaaS", "L'application tourne chez Render : aucun serveur à administrer, accessible depuis Internet en HTTPS."],
  ["box", "Conteneur Docker", "Dockerfile → image → conteneur : l'application et ses dépendances s'exécutent à l'identique partout."],
  ["api", "API REST", "Une URI unique par ressource, le CRUD via GET / POST / PUT / DELETE, des échanges en JSON."],
  ["doc", "OpenAPI / Swagger", "La spécification et la documentation interactive sont générées automatiquement par FastAPI."],
  ["eye", "Traçabilité & supervision", "Chaque requête est journalisée (méthode, statut, durée, X-Request-ID) et /health permet la supervision."],
  ["loop", "DevOps · CI/CD", "GitHub Actions teste et construit l'image ; Render redéploie à chaque push sur la branche principale."],
];
let apiViewDone = false;
function renderApiView() {
  const base = location.origin;
  $("#base-url").textContent = base;
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

const TOUR_KEY = "stages.tour.v1";
const ETAPES = [
  { title: "Bienvenue 👋", body: "Cette application gère les stages des étudiants. Elle s'appuie sur une API REST déployée dans le cloud. Cette visite dure moins d'une minute." },
  { target: "#stats", title: "La vue d'ensemble", body: "Nombre de stages au total, en cours, à venir et terminés. Cliquez sur une carte pour filtrer la liste." },
  { target: "#btn-new", title: "Créer un stage", body: "Renseignez l'étudiant, l'entreprise, l'intitulé et les dates. Des durées rapides (2, 4 ou 6 mois) remplissent la date de fin pour vous." },
  { target: "#toolbar", title: "Retrouver un stage", body: "Recherchez par nom, entreprise ou sujet, filtrez par statut et choisissez l'ordre de tri." },
  { target: "#list-area", title: "Modifier ou supprimer", body: "Chaque ligne affiche la période, la progression et le statut. Les boutons crayon et corbeille à droite permettent de modifier ou supprimer (avec confirmation)." },
  { target: "#tab-api", view: "api", title: "API & Cloud", body: "Cet onglet présente l'API : adresse de base, endpoints, architecture et notions du cours mises en œuvre." },
  { target: "#api-links", view: "api", title: "Documentation Swagger", body: "Testez chaque endpoint directement dans le navigateur avec Swagger UI, ou importez la spécification OpenAPI dans Postman." },
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
function afficherEtape() {
  const e = ETAPES[tourIndex];
  setView(e.view || "stages");
  $("#tour-count").textContent = `Étape ${tourIndex + 1} sur ${ETAPES.length}`;
  $("#tour-title").textContent = e.title;
  $("#tour-body").textContent = e.body;
  $$("#tour-dots i").forEach((d, i) => d.classList.toggle("on", i === tourIndex));
  $("#tour-prev").hidden = tourIndex === 0;
  $("#tour-next").textContent = tourIndex === ETAPES.length - 1 ? "Terminer" : tourIndex === 0 ? "Commencer" : "Suivant";
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
  if (scroller) el.scrollIntoView({ block: "center", behavior: "instant" });
  const r = el.getBoundingClientRect(), pad = 8;
  Object.assign(hole.style, { top: r.top - pad + "px", left: r.left - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let top = r.bottom + pad + gap;
  if (top + ph > vh - m) top = r.top - pad - gap - ph;
  if (top < m) top = Math.max(m, vh - ph - m);
  pop.style.top = top + "px";
  pop.style.left = Math.min(Math.max(m, r.left + r.width / 2 - pw / 2), vw - pw - m) + "px";
}
$("#tour-next").addEventListener("click", () => { if (tourIndex === ETAPES.length - 1) finirTour(true); else { tourIndex++; afficherEtape(); } });
$("#tour-prev").addEventListener("click", () => { if (tourIndex > 0) { tourIndex--; afficherEtape(); } });
$("#tour-skip").addEventListener("click", () => finirTour(false));
addEventListener("resize", () => placerEtape(false));
addEventListener("keydown", (e) => {
  if (!tourActive) return;
  if (e.key === "Escape") finirTour(false);
  else if (e.key === "ArrowRight") $("#tour-next").click();
  else if (e.key === "ArrowLeft") $("#tour-prev").click();
});
$("#btn-help").addEventListener("click", () => { setView("stages"); window.scrollTo({ top: 0 }); demarrerTour(); });

function appliquerTheme(t) { document.documentElement.dataset.theme = t; store.set("stages.theme", t); }
appliquerTheme(store.get("stages.theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
$("#btn-theme").addEventListener("click", () => appliquerTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

$("#btn-new").addEventListener("click", () => ouvrirForm());
$("#q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); });
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderList(); });
function filtrer(k) { state.filter = k; renderStats(); renderList(); }
document.addEventListener("click", (e) => {
  const t = e.target.closest("button, [data-close]"); if (!t) return;
  if (t.dataset.filter) filtrer(state.filter === t.dataset.filter && t.classList.contains("stat") ? "all" : t.dataset.filter);
  else if (t.dataset.act === "new") ouvrirForm();
  else if (t.dataset.act === "demo") chargerExemples();
  else if (t.dataset.act === "reset") { state.q = ""; $("#q").value = ""; filtrer("all"); }
  else if (t.dataset.act === "edit") ouvrirForm(state.stages.find((s) => s.id === Number(t.dataset.id)));
  else if (t.dataset.act === "del") demanderSuppression(Number(t.dataset.id));
  else if (t.id === "btn-retry") { state.loaded = false; renderList(); charger(); }
  else if (t.dataset.copy) copier($(t.dataset.copy).textContent, "Adresse copiée");
  else if (t.dataset.curl) copier(t.dataset.curl.replaceAll("{u}", location.origin), "Commande curl copiée");
  else if (t.hasAttribute("data-close")) t.closest("dialog").close();
});
for (const d of $$("dialog")) d.addEventListener("click", (e) => { if (e.target === d) d.close(); });

(async function init() {
  setView("stages");
  render();
  const [, ok] = await Promise.all([sonderApi(true), charger()]);
  setInterval(() => sonderApi(false), 30000);
  if (ok && store.get(TOUR_KEY) !== "done") setTimeout(demarrerTour, 500);
})();
