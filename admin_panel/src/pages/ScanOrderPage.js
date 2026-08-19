// admin_panel/src/pages/ScanOrderPage.js
import React, { useState, useCallback } from 'react';
import QRCodeScanner from '../components/QRCodeScanner';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, ScanLine, ShoppingBag, UserCircle, Truck, FileText, CheckSquare, XSquare } from 'lucide-react';

// Configurez votre URL API. Utilisez une variable d'environnement si possible.
// Si vous utilisez create-react-app, vous pouvez créer un fichier .env à la racine
// du répertoire admin_panel avec le contenu REACT_APP_API_URL=http://votre_ip:votre_port/api
// Sinon, remplacez la valeur ci-dessous par l'adresse correcte de votre backend.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://back-end-purple-log-1280.fly.dev/api'; // Adaptez à votre IP/Port backend

const ScanOrderPage = () => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanActive, setScanActive] = useState(true);
  
  // Nouveaux états pour la mise à jour du statut
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateStatusError, setUpdateStatusError] = useState(null);
  const [updateStatusSuccess, setUpdateStatusSuccess] = useState(null);

  const navigate = useNavigate();

  // Fonction appelée lorsque le QR Code est scanné avec succès
  const handleScanSuccess = useCallback(async (decodedText) => {
    console.log(`QR Code Scanned, Order ID: ${decodedText}`);
    setScanActive(false); // Arrêter le scan et cacher le lecteur une fois scanné
    setIsLoading(true);
    setError(null); // Réinitialiser les messages d'erreur précédents
    setOrderDetails(null); // Effacer les détails d'une commande précédente
    setUpdateStatusError(null); // Réinitialiser les messages de statut
    setUpdateStatusSuccess(null);

    // Vérifier si decodedText est un ID valide (par exemple, un nombre)
    // Assumons ici que l'ID de commande est un nombre
    const orderId = parseInt(decodedText, 10);
    if (isNaN(orderId)) {
        setError(`Format QR Code invalide: "${decodedText}". Le QR Code doit contenir l'ID numérique de la commande.`);
        setIsLoading(false);
        // Optionnel: redémarrer automatiquement le scanner après un court délai
        // setTimeout(() => resetScanner(), 3000); 
        return;
    }


    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        // Si pas de token, rediriger vers la page de login
        setError('Token administrateur non trouvé. Veuillez vous reconnecter.');
        setIsLoading(false);
        navigate('/login');
        return;
      }

      // Appel à l'API backend pour récupérer les détails de la commande par son ID
      const response = await fetch(`${API_BASE_URL}/orders/admin/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }, // Envoyer le token pour l'authentification
      });

      // Gérer les réponses HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Tenter de lire le corps de l'erreur
        if (response.status === 404) {
          throw new Error(`Commande avec ID ${orderId} non trouvée dans la base de données.`);
        }
        if (response.status === 401 || response.status === 403) {
             // Gérer spécifiquement les erreurs d'authentification/autorisation
            localStorage.removeItem('adminToken'); // Nettoyer le token invalide
            localStorage.removeItem('adminUser');
            setError('Session expirée ou non autorisée. Veuillez vous reconnecter.');
            navigate('/login');
            return; // Arrêter l'exécution ici
        }
        throw new Error(errorData.message || `Erreur ${response.status}: Impossible de récupérer les détails de la commande.`);
      }

      // Traiter les données de la commande reçues
      const data = await response.json();
      setOrderDetails(data); // Stocker les détails pour l'affichage

    } catch (err) {
      console.error("Erreur lors de la récupération de la commande:", err);
      // Afficher l'erreur à l'utilisateur
      setError(err.message);
    } finally {
      // Quoi qu'il arrive (succès ou erreur), arrêter l'indicateur de chargement
      setIsLoading(false);
    }
  }, [navigate]); // navigate est une dépendance pour useCallback

  // Fonction appelée en cas d'échec du scan (souvent trop fréquent, peut être ignoré)
  const handleScanFailure = useCallback((errorMessage) => {
    // Cette fonction est appelée constamment pendant le scan si rien n'est détecté ou si le code est flou.
    // On peut la laisser vide ou logger pour débug, mais éviter de mettre à jour l'UI à chaque appel.
    // console.warn(`Scan Error: ${errorMessage}`); 
  }, []);

  // Réinitialiser l'état pour permettre un nouveau scan
  const resetScanner = () => {
    setOrderDetails(null);
    setError(null);
    setIsLoading(false);
    setScanActive(true); // Réactiver le scanner
    setUpdateStatusError(null);
    setUpdateStatusSuccess(null);
  };

  // Gérer la mise à jour du statut de la commande
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setIsUpdatingStatus(true); // Activer l'indicateur de chargement pour la mise à jour
    setUpdateStatusError(null); // Réinitialiser les messages de mise à jour
    setUpdateStatusSuccess(null);

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        // Si pas de token, rediriger vers la page de login
        setUpdateStatusError('Session expirée. Veuillez vous reconnecter.');
        navigate('/login');
        return;
      }

      // Appel PUT à l'API pour changer le statut
      const response = await fetch(`${API_BASE_URL}/orders/admin/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Envoyer le token
        },
        body: JSON.stringify({ status: newStatus }), // Envoyer le nouveau statut dans le corps
      });

      const responseData = await response.json(); // Lire la réponse JSON

      // Gérer les réponses HTTP
      if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            setUpdateStatusError('Session expirée ou non autorisée. Veuillez vous reconnecter.');
            navigate('/login');
            return;
         }
        throw new Error(responseData.message || `Erreur ${response.status} lors de la mise à jour du statut.`);
      }
      
      // Mise à jour réussie : Mettre à jour l'état local des détails de la commande
      setOrderDetails(prevDetails => ({
        ...prevDetails,
        status: responseData.order.status, // Utiliser le statut confirmé par le backend
      }));
      // Afficher un message de succès
      setUpdateStatusSuccess(`Statut de la commande mis à jour à "${responseData.order.status}".`);

    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      // Afficher l'erreur de mise à jour à l'utilisateur
      setUpdateStatusError(err.message);
    } finally {
      // Quoi qu'il arrive, arrêter l'indicateur de mise à jour
      setIsUpdatingStatus(false);
    }
  };


  // Styles basiques (à externaliser dans un fichier CSS)
  const styles = {
    pageContainer: { padding: '20px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', color: '#333', maxWidth: '800px', margin: 'auto' },
    header: { display: 'flex', alignItems: 'center', marginBottom: '25px', fontSize: '26px', fontWeight: '600', color: '#2c3e50' },
    scannerSection: { marginBottom: '20px', padding: '15px', borderRadius: '8px', background: '#ecf0f1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    resultsSection: { marginTop: '25px' },
    card: { background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    cardTitle: { display: 'flex', alignItems: 'center', fontSize: '20px', fontWeight: '600', color: '#34495e', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    detailItem: { marginBottom: '10px', fontSize: '15px', display: 'flex', alignItems: 'center' },
    detailLabel: { fontWeight: '600', marginRight: '8px', color: '#555', minWidth: '120px' },
    detailValue: { color: '#333'},
    itemsTable: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    th: { background: '#f8f9fa', padding: '12px 15px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', fontSize: '14px' },
    td: { padding: '12px 15px', border: '1px solid #dee2e6', fontSize: '14px' },
    statusBadge: (status) => {
        let bgColor = '#7f8c8d'; // gris par défaut
        if (status === 'delivered') bgColor = '#2ecc71'; // vert
        else if (status === 'pending' || status === 'awaiting_payment' || status === 'processing') bgColor = '#f39c12'; // orange
        else if (status === 'shipped') bgColor = '#3498db'; // bleu
        else if (status === 'cancelled' || status === 'failed' || status === 'refunded') bgColor = '#e74c3c'; // rouge
        return { display: 'inline-block', padding: '6px 12px', borderRadius: '16px', color: 'white', fontWeight: '500', fontSize: '13px', backgroundColor: bgColor, textTransform: 'capitalize' };
    },
    loadingMessage: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', fontSize: '18px', color: '#3498db' },
    messageBox: (type) => ({
      display: 'flex', alignItems: 'center',
      color: type === 'error' ? '#c0392b' : '#27ae60',
      background: type === 'error' ? '#fdeded' : '#eafaf1',
      padding: '12px 18px', borderRadius: '8px', marginBottom: '15px',
      border: `1px solid ${type === 'error' ? '#e5a0a0' : '#a3e4c7'}`,
      wordBreak: 'break-word', // Gérer le texte long
    }),
    button: {
      backgroundColor: '#3498db', color: 'white', padding: '10px 18px', border: 'none', borderRadius: '6px',
      cursor: 'pointer', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s ease',
      flexShrink: 0, // Empêche le bouton de se rétrécir dans les flex containers
    },
    resetButton: { backgroundColor: '#7f8c8d' }, // Bouton gris "Scanner une autre"
    actionButton: {
      backgroundColor: '#27ae60', // Vert pour l'action positive
      marginLeft: 'auto', // Aligne à droite dans le conteneur flex
      flexShrink: 0,
    },
    disabledButton: {
      backgroundColor: '#bdc3c7', cursor: 'not-allowed', opacity: 0.8,
    },
    infoText: { color: '#555', fontSize: '15px', marginBottom: '15px'},
    cardTitleContainer: { // Conteneur pour titre et bouton d'action
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start', // Alignement pour que le bouton ne décale pas le titre
        marginBottom: '15px',
        borderBottom: '1px solid #eee', 
        paddingBottom: '10px',
        flexWrap: 'wrap', // Permet aux éléments de passer à la ligne si l'espace est insuffisant
        gap: '10px', // Espacement entre le titre et le bouton si wrap
    }
  };
  
  // Condition pour afficher le bouton "Marquer comme Livrée"
  // On l'affiche si la commande existe et n'est pas déjà dans un état final ou annulé
  const canMarkAsDelivered = orderDetails && 
                           orderDetails.status !== 'delivered' && 
                           orderDetails.status !== 'cancelled' && 
                           orderDetails.status !== 'refunded' &&
                           orderDetails.status !== 'failed';


  // Affichage du loader pendant le chargement initial des détails
  if (isLoading) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.loadingMessage}>
          <Loader2 className="animate-spin" size={32} style={{ marginRight: '12px' }} />
          Chargement des détails de la commande...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.header}>
        <ScanLine size={30} style={{ marginRight: '12px', color: styles.header.color }} />
        Scanner QR Code Commande
      </h1>

      {/* Section du scanner, affichée uniquement si scanActive est vrai et qu'il n'y a pas encore de détails */}
      {scanActive && !orderDetails && !error && ( // Ajouter !error pour ne pas montrer le scanner si une erreur de scan (parsing ID) est là
        <div style={styles.scannerSection}>
          <p style={styles.infoText}>Placez le QR Code de la commande devant la caméra.</p>
          {/* Le composant QRCodeScanner prend la div avec l'id html5qr-code-full-region */}
          <QRCodeScanner onScanSuccess={handleScanSuccess} onScanFailure={handleScanFailure} />
        </div>
      )}

      {/* Section des messages d'erreur (scan initial ou récupération détails) */}
      {error && (
        <div style={styles.messageBox('error')}>
          <AlertCircle size={22} style={{ marginRight: '10px', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: '600' }}>Erreur : {error}</p>
             {/* Bouton pour recommencer le scan */}
            <button onClick={resetScanner} style={{ ...styles.button, backgroundColor: '#e74c3c', marginTop: '10px' }}>
              Réessayer le Scan
            </button>
          </div>
        </div>
      )}

      {/* Section des résultats, affichée uniquement si orderDetails contient des données */}
      {orderDetails && (
        <div style={styles.resultsSection}>
           {/* Conteneur pour le titre "Détails de la Commande Trouvée" et le bouton "Scanner une autre" */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', fontSize: '22px', color: '#27ae60', margin: 0 }}>
              <CheckCircle size={28} style={{ marginRight: '10px' }}/>
              Détails de la Commande
            </h2>
             {/* Bouton pour scanner une nouvelle commande */}
            <button onClick={resetScanner} style={{...styles.button, ...styles.resetButton}}>
              Scanner une autre commande
            </button>
          </div>

          {/* Messages de succès/erreur pour la mise à jour du statut (ajoutés ici) */}
          {updateStatusSuccess && (
            <div style={styles.messageBox('success')}>
              <CheckCircle size={20} style={{ marginRight: '10px', flexShrink: 0 }} />
              <span style={{fontWeight: 500}}>{updateStatusSuccess}</span>
            </div>
          )}
          {updateStatusError && (
            <div style={styles.messageBox('error')}>
              <AlertCircle size={20} style={{ marginRight: '10px', flexShrink: 0 }} />
              <span style={{fontWeight: 500}}>{updateStatusError}</span>
            </div>
          )}

          {/* Card Informations Générales - Contient le bouton d'action */}
          <div style={styles.card}>
            <div style={styles.cardTitleContainer}> {/* Utiliser le nouveau conteneur pour le titre et le bouton */}
                <h3 style={{...styles.cardTitle, marginBottom: 0, paddingBottom: 0, borderBottom: 'none'}}><FileText size={20} style={{ marginRight: '10px' }} />Informations Générales</h3>
                {/* Bouton "Marquer comme Livrée", affiché conditionnellement */}
                {canMarkAsDelivered && (
                    <button
                        onClick={() => handleUpdateOrderStatus(orderDetails.orderId, 'delivered')}
                        disabled={isUpdatingStatus} // Désactivé pendant la mise à jour
                        style={{
                        ...styles.button,
                        ...styles.actionButton,
                        ...(isUpdatingStatus ? styles.disabledButton : {}), // Appliquer styles désactivés si isUpdatingStatus est vrai
                        }}
                    >
                        {isUpdatingStatus ? ( // Afficher loader ou texte selon l'état
                        <>
                            <Loader2 className="animate-spin" size={18} style={{ marginRight: '8px' }} />
                            Mise à jour...
                        </>
                        ) : (
                        <>
                            <CheckSquare size={18} style={{ marginRight: '8px' }} />
                            Marquer comme Livrée
                        </>
                        )}
                    </button>
                )}
            </div>

            {/* Détails de la commande */}
            <p style={styles.detailItem}><span style={styles.detailLabel}>Numéro Commande:</span> <span style={styles.detailValue}>{orderDetails.order_number}</span></p>
            <p style={styles.detailItem}><span style={styles.detailLabel}>ID Interne:</span> <span style={styles.detailValue}>{orderDetails.orderId}</span></p>
            <p style={styles.detailItem}><span style={styles.detailLabel}>Statut:</span> <span style={styles.statusBadge(orderDetails.status)}>{orderDetails.status}</span></p>
            <p style={styles.detailItem}><span style={styles.detailLabel}>Total:</span> <span style={styles.detailValue}>{parseFloat(orderDetails.total).toFixed(2)} {orderDetails.currency}</span></p>
            <p style={styles.detailItem}><span style={styles.detailLabel}>Date:</span> <span style={styles.detailValue}>{new Date(orderDetails.createdAt).toLocaleString()}</span></p>
            {orderDetails.notes && <p style={styles.detailItem}><span style={styles.detailLabel}>Notes Client:</span> <span style={styles.detailValue}>{orderDetails.notes}</span></p>}
          </div>

          {/* Card Client */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}><UserCircle size={20} style={{ marginRight: '10px' }} />Client</h3>
            <p style={styles.detailItem}><span style={styles.detailLabel}>Nom:</span> <span style={styles.detailValue}>{orderDetails.userName || 'N/A'}</span></p>
            <p style={styles.detailItem}><span style={styles.detailLabel}>Email:</span> <span style={styles.detailValue}>{orderDetails.userEmail || 'N/A'}</span></p>
            <p style={styles.detailItem}><span style={styles.detailLabel}>Téléphone:</span> <span style={styles.detailValue}>{orderDetails.userPhone || 'N/A'}</span></p>
          </div>
          
          {/* Card Adresse de Livraison (affichée si l'adresse existe) */}
          {orderDetails.shipping_address && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}><Truck size={20} style={{ marginRight: '10px' }} />Adresse de Livraison</h3>
              {/* Logique pour parser et afficher l'adresse JSONB */}
              {(() => {
                let addr = orderDetails.shipping_address;
                if (typeof addr === 'string') {
                  try { addr = JSON.parse(addr); } catch (e) { return <pre>{addr}</pre>; }
                }
                // S'assurer que addr est un objet valide après parsing ou si c'était déjà un objet
                if (typeof addr !== 'object' || addr === null) {
                    return <p>Format d'adresse invalide.</p>;
                }
                return (
                  <>
                    <p style={styles.detailItem}><span style={styles.detailLabel}>Destinataire:</span> <span style={styles.detailValue}>{addr.name}</span></p>
                    <p style={styles.detailItem}><span style={styles.detailLabel}>Adresse:</span> <span style={styles.detailValue}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</span></p>
                    <p style={styles.detailItem}><span style={styles.detailLabel}>Ville:</span> <span style={styles.detailValue}>{addr.city}</span></p>
                    <p style={styles.detailItem}><span style={styles.detailLabel}>Code Postal:</span> <span style={styles.detailValue}>{addr.postal_code || 'N/A'}</span></p>
                    <p style={styles.detailItem}><span style={styles.detailLabel}>Pays:</span> <span style={styles.detailValue}>{addr.country}</span></p>
                    <p style={styles.detailItem}><span style={styles.detailLabel}>Tél. Livraison:</span> <span style={styles.detailValue}>{addr.phone}</span></p>
                  </>
                );
              })()}
            </div>
          )}

          {/* Card Articles Commandés */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}><ShoppingBag size={20} style={{ marginRight: '10px' }} />Articles Commandés ({orderDetails.items.length})</h3>
            <div style={{overflowX: 'auto'}}> {/* Permet le scroll horizontal sur petits écrans */}
              <table style={styles.itemsTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Produit</th>
                    <th style={styles.th}>SKU</th>
                    <th style={styles.th}>Qté</th>
                    <th style={styles.th}>Prix Unit.</th>
                    <th style={styles.th}>Sous-total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetails.items.map(item => (
                    <tr key={item.itemId}>
                      <td style={styles.td}>{item.product_name}</td>
                      <td style={styles.td}>{item.sku || 'N/A'}</td>
                      <td style={styles.td}>{item.quantity}</td>
                      <td style={styles.td}>{parseFloat(item.unit_price).toFixed(2)} {orderDetails.currency}</td>
                      <td style={styles.td}>{parseFloat(item.subtotal).toFixed(2)} {orderDetails.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div> {/* Fin overflowX */}
          </div> {/* Fin card articles */}
        </div> 
      )} {/* Fin orderDetails */}
    </div> // Fin pageContainer
  );
};

export default ScanOrderPage;