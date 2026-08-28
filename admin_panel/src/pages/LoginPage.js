// admin_panel/src/pages/LoginPage.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // LOG 1: Données envoyées au backend
    console.log('=== LOG 1 - Données envoyées au backend ===');
    console.log('URL:', `${API_BASE_URL}/auth/login-admin`);
    console.log('Email:', email);
    console.log('Password:', password ? '*** présent ***' : 'vide');
    console.log('Payload complet:', { email, password });

    try {
      console.log('=== LOG 2 - Envoi de la requête ===');
      console.log('Tentative de connexion en cours...');
      
      const response = await axios.post(`${API_BASE_URL}/auth/login-admin`, {
        email,
        password,
      });

      // LOG 3: Réponse complète du backend
      console.log('=== LOG 3 - Réponse reçue du backend ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', response.headers);
      console.log('Données complètes:', response.data);
      console.log('Token:', response.data.token);
      console.log('Admin:', response.data.admin);
      
      if (response.data.admin) {
        console.log('Rôle admin:', response.data.admin.role);
        console.log('Admin complet:', JSON.stringify(response.data.admin, null, 2));
      }

      const { token, admin } = response.data;

      // LOG 4: Vérification du rôle
      console.log('=== LOG 4 - Vérification du rôle ===');
      console.log('Admin existe?', !!admin);
      console.log('Rôle reçu:', admin?.role);
      console.log('Rôles autorisés:', ['admin', 'super_admin']);
      console.log('Rôle autorisé?', admin && ['admin', 'super_admin'].includes(admin.role));

      if (admin && ['admin', 'super_admin'].includes(admin.role)) {
        console.log('=== LOG 5 - Connexion réussie ===');
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(admin));
        console.log('Token stocké:', token);
        console.log('Admin stocké:', admin);
        console.log('Redirection vers /dashboard');
        navigate('/dashboard');
      } else {
        console.log('=== LOG 5 - Accès refusé ===');
        console.log('Motif: Rôle non autorisé ou admin manquant');
        setError('Accès refusé. Vous devez être administrateur.');
      }
    } catch (err) {
      // LOG 6: Erreur détaillée
      console.log('=== LOG 6 - Erreur lors de la connexion ===');
      console.log('Type d\'erreur:', err.name);
      console.log('Message d\'erreur:', err.message);
      console.log('Code:', err.code);
      
      if (err.response) {
        // La requête a été faite et le serveur a répondu avec un code de statut hors plage 2xx
        console.log('Erreur avec réponse du serveur:');
        console.log('Status:', err.response.status);
        console.log('Status Text:', err.response.statusText);
        console.log('Headers:', err.response.headers);
        console.log('Données de l\'erreur:', err.response.data);
        console.log('Message d\'erreur du serveur:', err.response.data?.message);
      } else if (err.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        console.log('Erreur sans réponse du serveur:');
        console.log('Requête:', err.request);
        console.log('Problème de connexion au serveur');
        console.log('URL testée:', `${API_BASE_URL}/auth/login-admin`);
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        console.log('Erreur de configuration:', err.message);
      }
      
      console.log('Stack trace:', err.stack);
      
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect, ou problème serveur.');
    } finally {
      console.log('=== LOG FIN - Fin de la tentative de connexion ===');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h2>Connexion Administrateur Artiva</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '300px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            placeholder="Entrez votre email"
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="password">Mot de passe:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            placeholder="Entrez votre mot de passe"
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button 
          type="submit" 
          disabled={isLoading} 
          style={{ 
            padding: '10px', 
            backgroundColor: 'tomato', 
            color: 'white', 
            border: 'none', 
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
      
      {/* LOG 7: Vérification de la configuration */}
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>Backend URL: {API_BASE_URL}</p>
      </div>
    </div>
  );
}

export default LoginPage;
