// admin_panel/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductManagementPage from './pages/ProductManagementPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import OrderManagementPage from './pages/OrderManagementPage';
import ReportsPage from './pages/ReportsPage';
import ScanOrderPage from './pages/ScanOrderPage';
import ProductTagsPage from './pages/ProductTagsPage';


import './App.css';

import {
  LayoutDashboard, ShoppingCart, Tag, Users, Settings, BarChart2,
  LogOut as LogOutIcon, ShieldCheck, FolderTree, ListOrdered,
  ScanLine as ScanIcon, Menu as MenuIcon, X as XIcon
} from 'lucide-react';

// Composant pour la Sidebar
const Sidebar = ({ handleLogout, isMobileOpen, onCloseMobile }) => {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Tableau de Bord", Icon: LayoutDashboard },
    { path: "/products", label: "Produits", Icon: ShoppingCart },
    { path: "/categories", label: "Catégories", Icon: FolderTree },
    { path: "/product-tags", label: "Tags Produits", Icon: Tag },
    { path: "/users", label: "Utilisateurs", Icon: Users },
    { path: "/orders", label: "Commandes", Icon: ListOrdered },
    { path: "/reports", label: "Reports", Icon: BarChart2 },
    { path: "/scan-order", label: "Scanner Commande", Icon: ScanIcon },
  ];

  return (
    <>
      {isMobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile}></div>}
      <aside className={`sidebar ${isMobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><ShieldCheck size={28} strokeWidth={1.5}/></div>
          <h2 className="sidebar-title">Admin Artiva</h2>
          <button className="sidebar-close-btn" onClick={onCloseMobile}><XIcon size={22}/></button>
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navItems.map(item => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onCloseMobile}
                  className={
                    location.pathname === item.path ||
                    (item.path !== "/" && item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/")) ||
                    (location.pathname === "/" && item.path === "/dashboard")
                    ? "active"
                    : ""
                  }
                >
                  <span className="nav-icon"><item.Icon size={18} strokeWidth={1.75}/></span> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button-sidebar">
            <span className="nav-icon"><LogOutIcon size={18} strokeWidth={1.75}/></span> Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
};

// Barre de navigation mobile en bas d'écran
const BottomNav = ({ onMoreClick }) => {
  const location = useLocation();
  const items = [
    { path: "/dashboard", label: "Accueil", Icon: LayoutDashboard },
    { path: "/products", label: "Produits", Icon: ShoppingCart },
    { path: "/orders", label: "Commandes", Icon: ListOrdered },
    { path: "/scan-order", label: "Scanner", Icon: ScanIcon },
  ];
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <Link key={item.path} to={item.path} className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}>
          <item.Icon size={20} strokeWidth={1.75} />
          <span>{item.label}</span>
        </Link>
      ))}
      <button className="bottom-nav-item" onClick={onMoreClick}>
        <MenuIcon size={20} strokeWidth={1.75} />
        <span>Plus</span>
      </button>
    </nav>
  );
};

// Composant pour protéger les routes admin
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login', { replace: true });
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-layout">
      <Sidebar handleLogout={handleLogout} isMobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        {children}
      </main>
      <BottomNav onMoreClick={() => setMobileMenuOpen(true)} />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/scan-order" element={<ProtectedRoute><ScanOrderPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductManagementPage /></ProtectedRoute>} />
        <Route path="/product-tags" element={<ProtectedRoute><ProductTagsPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><CategoryManagementPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>}/>
        <Route path="/orders" element={<ProtectedRoute><OrderManagementPage /></ProtectedRoute>}/>
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/" element={ localStorage.getItem('adminToken') ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={localStorage.getItem('adminToken') ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;