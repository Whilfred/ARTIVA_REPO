// =============================================================================
// admin_panel/src/services/reportService.js
// =============================================================================
// Ce fichier était importé par pages/ReportsPage.js mais n'avait jamais été
// écrit. Comme App.js importe ReportsPage statiquement, son absence faisait
// échouer la compilation de TOUT le panel admin
// (« Module not found: Can't resolve '../services/reportService' »).
//
// Le backend n'expose pas d'endpoint de statistiques dédié : les chiffres sont
// donc calculés ici, côté navigateur, à partir des API existantes
// (/orders/admin/all, /users, /products/admin/all), exactement comme le fait
// déjà DashboardPage.js.
// =============================================================================

import axios from 'axios';
import { API_BASE_URL } from '../config';

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
});

const toNumber = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// --- Récupérations de base, mises en cache le temps d'un rendu de la page -----
// ReportsPage appelle les six méthodes en parallèle via Promise.all : sans ce
// cache très court, on referait six fois les mêmes requêtes.
let cache = { at: 0, orders: null, users: null, products: null, details: null };
const CACHE_MS = 3000;

const fresh = () => Date.now() - cache.at < CACHE_MS;

async function getOrders() {
  if (fresh() && cache.orders) return cache.orders;
  const res = await axios.get(`${API_BASE_URL}/orders/admin/all?limit=500`, authHeaders());
  cache.orders = res.data?.orders ?? [];
  cache.at = Date.now();
  return cache.orders;
}

async function getUsers() {
  if (fresh() && cache.users) return cache.users;
  const res = await axios.get(`${API_BASE_URL}/users`, authHeaders());
  cache.users = Array.isArray(res.data) ? res.data : (res.data?.users ?? []);
  cache.at = Date.now();
  return cache.users;
}

async function getProducts() {
  if (fresh() && cache.products) return cache.products;
  const res = await axios.get(`${API_BASE_URL}/products/admin/all?limit=500`, authHeaders());
  cache.products = res.data?.products ?? [];
  cache.at = Date.now();
  return cache.products;
}

/**
 * Le détail des articles n'est disponible que commande par commande
 * (/orders/admin/:id). On se limite aux 40 commandes les plus récentes pour ne
 * pas lancer des centaines de requêtes depuis le navigateur.
 */
const MAX_ORDERS_DETAILED = 40;

async function getOrdersWithItems() {
  if (fresh() && cache.details) return cache.details;
  const orders = await getOrders();
  const recent = orders.slice(0, MAX_ORDERS_DETAILED);
  const details = await Promise.all(
    recent.map((o) =>
      axios
        .get(`${API_BASE_URL}/orders/admin/${o.orderId}`, authHeaders())
        .then((r) => r.data)
        .catch(() => null)
    )
  );
  cache.details = details.filter(Boolean);
  cache.at = Date.now();
  if (orders.length > MAX_ORDERS_DETAILED) {
    console.warn(
      `[reportService] Analyse limitée aux ${MAX_ORDERS_DETAILED} commandes les plus ` +
        `récentes sur ${orders.length} (top produits et revenus par catégorie).`
    );
  }
  return cache.details;
}

// --- Découpage temporel -------------------------------------------------------
const PERIODS = {
  week:  { buckets: 7,  step: 'day',   label: (d) => d.toLocaleDateString('fr-FR', { weekday: 'short' }) },
  month: { buckets: 30, step: 'day',   label: (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) },
  year:  { buckets: 12, step: 'month', label: (d) => d.toLocaleDateString('fr-FR', { month: 'short' }) },
};

const reportService = {
  /** KPIs du haut de page : CA, commandes, clients, panier moyen + croissance. */
  async getDashboardMetrics() {
    const [orders, users] = await Promise.all([getOrders(), getUsers()]);

    const totalRevenue = orders.reduce((s, o) => s + toNumber(o.total), 0);
    const totalOrders = orders.length;
    const totalCustomers = users.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Croissance = 30 derniers jours comparés aux 30 précédents.
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const inWindow = (dateStr, from, to) => {
      const t = new Date(dateStr).getTime();
      return t >= from && t < to;
    };
    const growth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    const curOrders = orders.filter((o) => inWindow(o.createdAt, now - 30 * DAY, now));
    const prevOrders = orders.filter((o) => inWindow(o.createdAt, now - 60 * DAY, now - 30 * DAY));
    const curUsers = users.filter((u) => inWindow(u.created_at, now - 30 * DAY, now));
    const prevUsers = users.filter((u) => inWindow(u.created_at, now - 60 * DAY, now - 30 * DAY));

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageOrderValue,
      revenueGrowth: growth(
        curOrders.reduce((s, o) => s + toNumber(o.total), 0),
        prevOrders.reduce((s, o) => s + toNumber(o.total), 0)
      ),
      ordersGrowth: growth(curOrders.length, prevOrders.length),
      customersGrowth: growth(curUsers.length, prevUsers.length),
    };
  },

  /** Histogramme des ventes, découpé selon la période choisie. */
  async getSalesData(period = 'month') {
    const orders = await getOrders();
    const conf = PERIODS[period] ?? PERIODS.month;
    const now = new Date();
    const buckets = [];

    for (let i = conf.buckets - 1; i >= 0; i--) {
      const start = new Date(now);
      if (conf.step === 'day') {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i);
      } else {
        start.setHours(0, 0, 0, 0);
        start.setDate(1);
        start.setMonth(start.getMonth() - i);
      }
      const end = new Date(start);
      if (conf.step === 'day') end.setDate(end.getDate() + 1);
      else end.setMonth(end.getMonth() + 1);

      buckets.push({ name: conf.label(start), from: start.getTime(), to: end.getTime(), ventes: 0 });
    }

    orders.forEach((o) => {
      const t = new Date(o.createdAt).getTime();
      const b = buckets.find((x) => t >= x.from && t < x.to);
      if (b) b.ventes += toNumber(o.total);
    });

    return buckets.map(({ name, ventes }) => ({ name, ventes }));
  },

  /** Les 5 produits ayant généré le plus de chiffre d'affaires. */
  async getTopProducts() {
    const details = await getOrdersWithItems();
    const byProduct = new Map();

    details.forEach((order) => {
      (order.items ?? []).forEach((item) => {
        const key = item.product_name || `Produit #${item.product_id}`;
        const entry = byProduct.get(key) ?? { name: key, sales: 0, revenue: 0 };
        entry.sales += Number(item.quantity) || 0;
        entry.revenue += toNumber(item.subtotal);
        byProduct.set(key, entry);
      });
    });

    return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  },

  /** Répartition du chiffre d'affaires par catégorie (camembert). */
  async getRevenueByCategory() {
    const [details, products] = await Promise.all([getOrdersWithItems(), getProducts()]);

    // product_id -> liste des catégories du produit
    const categoriesOf = new Map(
      products.map((p) => [p.id, (p.categories_names ?? []).filter(Boolean)])
    );

    const byCategory = new Map();
    details.forEach((order) => {
      (order.items ?? []).forEach((item) => {
        const cats = categoriesOf.get(item.product_id);
        const revenue = toNumber(item.subtotal);
        if (!cats || cats.length === 0) {
          byCategory.set('Sans catégorie', (byCategory.get('Sans catégorie') ?? 0) + revenue);
          return;
        }
        // Un produit peut appartenir à plusieurs catégories : on répartit son
        // chiffre d'affaires entre elles pour que le total reste juste.
        const share = revenue / cats.length;
        cats.forEach((c) => byCategory.set(c, (byCategory.get(c) ?? 0) + share));
      });
    });

    return [...byCategory.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  },

  /** Les 10 dernières commandes, au format attendu par le tableau de la page. */
  async getRecentOrders() {
    const orders = await getOrders();
    return orders.slice(0, 10).map((o) => ({
      id: o.orderId,
      customer: o.userName || o.userEmail || 'Client inconnu',
      amount: toNumber(o.total),
      status: o.status,
      date: o.createdAt,
    }));
  },

  /** Nouveaux clients, clients fidèles et nombre moyen d'articles par commande. */
  async getCustomerStats() {
    const [orders, users, details] = await Promise.all([
      getOrders(),
      getUsers(),
      getOrdersWithItems(),
    ]);

    const DAY = 24 * 60 * 60 * 1000;
    const since = Date.now() - 30 * DAY;
    const newCustomers = users.filter((u) => new Date(u.created_at).getTime() >= since).length;

    // « Fidèles » = clients ayant passé plus d'une commande.
    const ordersPerUser = new Map();
    orders.forEach((o) => ordersPerUser.set(o.user_id, (ordersPerUser.get(o.user_id) ?? 0) + 1));
    const returningCustomers = [...ordersPerUser.values()].filter((n) => n > 1).length;

    const totalItems = details.reduce(
      (s, o) => s + (o.items ?? []).reduce((si, it) => si + (Number(it.quantity) || 0), 0),
      0
    );
    const averagePurchase =
      details.length > 0 ? Math.round((totalItems / details.length) * 10) / 10 : 0;

    return { newCustomers, returningCustomers, averagePurchase };
  },

  /**
   * Export CSV. Le backend n'ayant pas de route d'export, le fichier est
   * fabriqué dans le navigateur. ReportsPage attend un objet `{ data }` dont il
   * fait un Blob : on respecte ce contrat.
   */
  async exportReport(type = 'sales', format = 'csv') {
    if (format !== 'csv') {
      throw new Error(`Format d'export non supporté : ${format}`);
    }

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const toCsv = (headers, rows) =>
      [headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))].join('\n');

    if (type === 'products') {
      const rows = (await this.getTopProducts()).map((p) => [p.name, p.sales, p.revenue]);
      return { data: toCsv(['Produit', 'Quantité vendue', 'Chiffre d\'affaires'], rows) };
    }

    const orders = await getOrders();
    const rows = orders.map((o) => [
      o.order_number,
      o.userName,
      o.userEmail,
      o.status,
      toNumber(o.total),
      o.currency,
      new Date(o.createdAt).toLocaleString('fr-FR'),
    ]);
    return {
      data: toCsv(
        ['N° commande', 'Client', 'Email', 'Statut', 'Montant', 'Devise', 'Date'],
        rows
      ),
    };
  },
};

export default reportService;
