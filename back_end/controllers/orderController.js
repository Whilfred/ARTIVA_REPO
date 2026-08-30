// ARTIVA/back_end/controllers/orderController.js
const db = require('../config/db');
const promoController = require('../controllers/promoController');
const loyaltyController = require('../controllers/loyaltyController');
const livraisonController = require('../controllers/livraisonController');
const { resoudreZone } = require('../utils/shipping');
const { v4: uuidv4 } = require('uuid');
const { sendNewOrderEmails, sendOrderStatusEmail } = require("../utils/sendEmail.js");
// --- Créer une nouvelle commande (CLIENT) ---
exports.createOrder = async (req, res) => {
  const userId = req.user.id;

  const { 
    cart_items, 
    shipping_address, 
    payment_method, 
    notes, 
    currency,
    shipping_cost,
    shipping_method,
    status,
    total_amount: frontendTotalAmount,
    promo_code
  } = req.body;

  if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
    return res.status(400).json({ message: 'Le panier ne peut pas être vide pour créer une commande.' });
  }
  if (!shipping_address || typeof shipping_address !== 'object') {
    return res.status(400).json({ message: 'L\'adresse de livraison est requise.' });
  }
  if (!payment_method) {
    return res.status(400).json({ message: 'La méthode de paiement est requise.' });
  }

  const client = await db.pool.connect();

  try {
    console.log("=== Début de la création de commande ===");
    console.log("Payload reçu:", JSON.stringify(req.body, null, 2));

    if (!userId) {
      throw new Error("userId non défini. L'utilisateur n'est pas authentifié !");
    }

    await client.query('BEGIN');

    let productsTotal = 0;
    const orderItemsData = [];

    // 1. Vérifier stock + calcul total des produits
    for (const item of cart_items) {
      if (!item.product_id || !item.quantity || parseInt(item.quantity, 10) <= 0) {
        throw new Error(`Données d'article invalides pour product_id: ${item.product_id}`);
      }

      const productResult = await client.query(
        'SELECT name, price, stock, sku FROM products WHERE id = $1 FOR UPDATE',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Produit ID ${item.product_id} introuvable.`);
      }

      const product = productResult.rows[0];
      const quantity = parseInt(item.quantity, 10);

      if (product.stock < quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}`);
      }

      // MAJ stock
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [quantity, item.product_id]
      );

      const unitPrice = parseFloat(product.price);
      const subtotal = unitPrice * quantity;
      productsTotal += subtotal;

      orderItemsData.push({
        product_id: item.product_id,
        product_name: product.name,
        sku: product.sku,
        quantity,
        unit_price: unitPrice,
        subtotal,
      });
    }

    // --- Frais de livraison --------------------------------------------------
    // Recalculés ici à partir de la destination, et non repris de la requête.
    // Jusqu'ici le serveur acceptait le montant annoncé par l'application :
    // « shipping_cost: 0 » suffisait à se faire livrer gratuitement.
    // Une seule résolution : la zone porte à la fois le tarif et son libellé.
    // La grille est lue en base (voir db/init/08_zones_livraison.sql), donc un
    // changement de tarif depuis le panel s'applique à la commande suivante.
    const zone          = await resoudreZone(client, shipping_address.country, shipping_address.city);
    const fraisNormaux  = zone.cost;
    const zoneLivraison = zone.label;

    if (shipping_cost !== undefined && Math.abs(parseFloat(shipping_cost) - fraisNormaux) > 1) {
      console.warn(
        `⚠️ Frais annoncés (${shipping_cost}) ≠ grille serveur (${fraisNormaux}) ` +
        `pour ${shipping_address.city} / ${shipping_address.country} — grille appliquée.`
      );
    }

    // --- Livraison gratuite méritée ------------------------------------------
    // L'avantage est verrouillé (FOR UPDATE) avant d'être appliqué : deux
    // commandes lancées en même temps ne peuvent pas consommer le même droit.
    // Il est cherché ici, et non annoncé par l'application, pour la même raison
    // que les frais eux-mêmes.
    const avantageLivraison = await livraisonController.avantageDisponible(client, userId, true);
    const livraisonOfferte  = Boolean(avantageLivraison);
    const finalShippingCost = livraisonOfferte ? 0 : fraisNormaux;

    // --- Code promotionnel ---------------------------------------------------
    // La remise est revalidée ICI, dans la transaction, et jamais reprise de ce
    // que l'écran de paiement a calculé : c'est le seul endroit où l'on connaît
    // le contenu réel du panier et où le quota du code peut être verrouillé.
    // Si le code est devenu invalide entre l'écran et la validation (expiré,
    // épuisé), la commande est refusée plutôt que passée au mauvais prix.
    let discountAmount = 0;
    let appliedPromoCode = null;
    let appliedPromo = null;

    if (promo_code && String(promo_code).trim()) {
      const verif = await promoController.verifierCode(
        client, String(promo_code), userId, productsTotal, true
      );
      if (!verif.valide) {
        const err = new Error(verif.message);
        err.statusCode = 400;
        throw err;
      }
      discountAmount = verif.reduction;
      appliedPromo = verif.promo;
      appliedPromoCode = verif.promo.code;
    }

    // La remise porte sur les produits seuls : les frais de livraison sont une
    // dépense réelle pour la boutique et restent dus.
    const calculatedTotal = productsTotal - discountAmount + finalShippingCost;
    let finalTotalAmount = frontendTotalAmount !== undefined ? parseFloat(frontendTotalAmount) : calculatedTotal;

    // Vérification de cohérence
    if (Math.abs(finalTotalAmount - calculatedTotal) > 1) {
      console.warn(`⚠️ Incohérence montant: reçu=${finalTotalAmount}, calculé=${calculatedTotal}`);
      finalTotalAmount = calculatedTotal;
    }

    // ✅ Utiliser le status envoyé par le frontend ('pending' ou 'awaiting_payment')
    const orderStatus = status || 'pending';
    
    // ✅ Utiliser la devise envoyée ('XOF' au lieu de 'FCFA')
    const finalCurrency = currency || 'XOF';

    // 2. Créer la commande
    const orderNumber = `ORD-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    const orderQuery = `
      INSERT INTO orders (
        order_number, user_id, status, total_amount, currency,
        shipping_address, shipping_cost, shipping_method, notes,
        promo_code, discount_amount, free_shipping_applied
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, order_number, status, total_amount, discount_amount,
                promo_code, free_shipping_applied, created_at;
    `;

    const orderResult = await client.query(orderQuery, [
      orderNumber,
      userId,
      orderStatus,
      finalTotalAmount.toFixed(2),
      finalCurrency,
      JSON.stringify(shipping_address),
      finalShippingCost.toFixed(2),
      zoneLivraison,
      notes || null,
      appliedPromoCode,
      discountAmount.toFixed(2),
      livraisonOfferte
    ]);

    const createdOrder = orderResult.rows[0];

    // Journaliser l'utilisation du code, dans la même transaction que la
    // commande : si celle-ci échoue plus loin, le quota n'est pas consommé.
    if (appliedPromo) {
      await client.query(
        `INSERT INTO promo_code_usages (promo_code_id, user_id, order_id, discount_amount)
         VALUES ($1, $2, $3, $4)`,
        [appliedPromo.id, userId, createdOrder.id, discountAmount.toFixed(2)]
      );
      await client.query(
        'UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1',
        [appliedPromo.id]
      );
    }

    // Consommer l'avantage livraison. Le UPDATE est conditionné à un avantage
    // encore libre : s'il ne modifie aucune ligne, deux commandes ont couru
    // ensemble et la nôtre doit échouer plutôt que d'offrir une seconde fois
    // un droit déjà dépensé.
    if (avantageLivraison) {
      const consomme = await livraisonController.consommerAvantage(
        client, avantageLivraison.id, createdOrder.id, fraisNormaux
      );
      if (!consomme) {
        const err = new Error(
          'Votre livraison gratuite vient d\'être utilisée sur une autre commande. Veuillez réessayer.'
        );
        err.statusCode = 409;
        throw err;
      }
    }

    // 3. Insérer les items
    for (const item of orderItemsData) {
      await client.query(
        `INSERT INTO order_items (
          order_id, product_id, product_name, sku, quantity, unit_price, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          createdOrder.id,
          item.product_id,
          item.product_name,
          item.sku,
          item.quantity,
          item.unit_price.toFixed(2),
          item.subtotal.toFixed(2)
        ]
      );
    }

    // 4. Paiement
    let paymentStatus = 'pending';
    if (payment_method === 'cash_on_delivery' && orderStatus === 'awaiting_payment') {
      paymentStatus = 'pending';
    }

    await client.query(
      `INSERT INTO payments (order_id, payment_method, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        createdOrder.id,
        payment_method,
        finalTotalAmount.toFixed(2),
        finalCurrency,
        paymentStatus
      ]
    );

    // 5. Notification
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link_url)
       VALUES ($1, 'order_placed', $2, $3, $4)`,
      [
        userId,
        'Votre commande a été reçue !',
        `Merci pour votre commande #${createdOrder.order_number}.`,
        `/orders/${createdOrder.id}`
      ]
    );

    // 5 bis. La commande vient-elle de faire franchir le seuil de livraison
    // gratuite ? Évalué après l'insertion, pour que la commande en cours entre
    // elle-même dans le cumul, et dans la transaction pour qu'un échec plus
    // loin n'accorde pas un avantage sur une commande qui n'existera pas.
    let avantageGagne = null;
    try {
      avantageGagne = await livraisonController.evaluerGain(client, userId, createdOrder.id);
      if (avantageGagne) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, link_url)
           VALUES ($1, 'free_shipping_earned', $2, $3, $4)`,
          [
            userId,
            'Livraison gratuite débloquée ! 🎁',
            `Vos achats des derniers jours vous offrent la livraison sur votre prochaine commande, `
              + `jusqu'au ${new Date(avantageGagne.expires_at).toLocaleDateString('fr-FR')}.`,
            '/orders'
          ]
        );
      }
    } catch (avantageError) {
      // Un échec ici ne doit pas faire perdre la commande au client : elle est
      // payée et valide. L'avantage manqué se rattrape, une commande perdue non.
      console.error('Erreur évaluation livraison gratuite:', avantageError);
    }

    // 5 ter. Points de fidélité. Comptés sur le montant des produits AVANT
    // remise et hors livraison : c'est la même assiette que le seuil de
    // livraison gratuite, pour que deux mécaniques voisines ne donnent pas des
    // chiffres différents sur la même commande.
    //
    // Un échec ici ne doit pas non plus faire perdre la commande.
    let gainFidelite = null;
    try {
      gainFidelite = await loyaltyController.crediterPoints(
        client, userId, createdOrder.id, productsTotal
      );
    } catch (fideliteError) {
      console.error('Erreur attribution des points de fidélité:', fideliteError);
    }

    // 6. ENVOI DES EMAILS
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "artiva.app@gmail.com";
      const userEmail = req.user.email;

      await sendNewOrderEmails(userEmail, adminEmail, {
        order_number: createdOrder.order_number,
        amount: finalTotalAmount,
        currency: finalCurrency,
        payment_method,
        items: orderItemsData,
        shipping_address,
        order_status: orderStatus,
        // Récapitulatif financier : sans ces trois lignes, l'email annonçait un
        // montant sans dire d'où il venait — impossible d'y voir une remise.
        products_total: productsTotal,
        shipping_cost: finalShippingCost,
        promo_code: appliedPromoCode,
        discount_amount: discountAmount,
        // Livraison offerte : shipping_cost vaut 0, ce qui ne dit pas POURQUOI.
        // Sans ces deux champs, l'email laisserait croire à un oubli de frais.
        free_shipping_applied: livraisonOfferte,
        shipping_normal: fraisNormaux,
        loyalty: gainFidelite,
        free_shipping_earned: avantageGagne
          ? { expires_at: avantageGagne.expires_at, amount: avantageGagne.qualifying_amount }
          : null,
      });
    } catch (emailError) {
      console.error("Erreur envoi email:", emailError);
      // On continue même si l'email échoue
    }

    await client.query('COMMIT');

    console.log(
      `✅ Commande créée: ${createdOrder.order_number} | Status: ${orderStatus} | ` +
      `Livraison: ${finalShippingCost} FCFA${livraisonOfferte ? ` (offerte, valeur ${fraisNormaux})` : ''}` +
      `${avantageGagne ? ' | 🎁 avantage livraison acquis' : ''}`
    );

    res.status(201).json({
      message: "Commande créée avec succès !",
      order: createdOrder
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erreur création commande:", error);

    // Un code promo refusé (expiré, épuisé, montant insuffisant) porte son
    // propre code HTTP : c'est une réponse métier destinée au client, pas une
    // panne du serveur. Sans cela, l'application afficherait « erreur serveur »
    // là où il faut lire « ce code a expiré ».
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error.message.includes("Stock insuffisant") || error.message.includes("Produit")) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ 
      message: "Erreur serveur lors de la création de la commande.",
      error: error.message 
    });
  } finally {
    client.release();
  }
};

// --- Récupérer les commandes de l'utilisateur connecté (CLIENT) ---
exports.getUserOrders = async (req, res) => {
  
  try {
    const userId = req.user.id;
    const ordersQuery = `
      SELECT 
        o.id as "orderId", o.order_number, o.status, o.total_amount as total, 
        o.currency, o.created_at as "createdAt", o.updated_at as "updatedAt"
      FROM orders o
      WHERE o.user_id = $1 ORDER BY o.created_at DESC;
    `;
    const { rows: orders } = await db.query(ordersQuery, [userId]);
    
    const ordersWithProducts = await Promise.all(orders.map(async (order) => {
      const itemsQuery = `
        SELECT oi.id as "itemId", oi.product_id, oi.product_name, oi.sku, 
               oi.quantity, oi.unit_price, oi.subtotal,
        p.image_url as "productImageUrl" 
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = $1
        ORDER BY oi.id; `;
      const { rows: items } = await db.query(itemsQuery, [order.orderId]);
      return { ...order, products: items }; // 'products' est ce que le frontend ProfileScreen attendait
    }));
    res.status(200).json(ordersWithProducts);
  } catch (error) {
    console.error('Erreur récupération commandes utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur récupération commandes.' });
  }
};

// --- (Admin) : Lister TOUTES les commandes avec filtres et pagination ---
exports.getAllOrdersAdmin = async (req, res) => {
  const { status, user_id, date_from, date_to, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      o.id as "orderId", o.order_number, o.user_id, u.name as "userName", u.email as "userEmail",
      o.status, o.total_amount as total, o.currency, 
      o.shipping_address, o.billing_address, o.notes,
      o.promo_code, o.discount_amount, o.free_shipping_applied,
      o.created_at as "createdAt", o.updated_at as "updatedAt",
      COUNT(*) OVER() AS total_count -- Compte total pour la pagination
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
  `;
  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  if (status) {
    whereClauses.push(`o.status = $${paramIndex++}`);
    queryParams.push(status);
  }
  if (user_id) {
    whereClauses.push(`o.user_id = $${paramIndex++}`);
    queryParams.push(user_id);
  }
  if (date_from) {
    whereClauses.push(`o.created_at >= $${paramIndex++}`);
    queryParams.push(date_from); // Format YYYY-MM-DD
  }
  if (date_to) {
    // Pour inclure toute la journée, on peut cibler le début du jour suivant
    const nextDay = new Date(date_to);
    nextDay.setDate(nextDay.getDate() + 1);
    whereClauses.push(`o.created_at < $${paramIndex++}`);
    queryParams.push(nextDay.toISOString().split('T')[0]); // Format YYYY-MM-DD
  }

  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++};`;
  queryParams.push(limit, offset);
  
  try {
    const { rows } = await db.query(query, queryParams);
    // Le total_count sera le même pour toutes les lignes, on le prend de la première s'il y en a
    const totalItems = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const totalPages = Math.ceil(totalItems / limit);

    // Retirer total_count de chaque objet commande avant de renvoyer
    const ordersData = rows.map(({total_count, ...order}) => order);

    res.status(200).json({
        orders: ordersData,
        currentPage: parseInt(page, 10),
        totalPages,
        totalItems
    });
  } catch (error) {
    console.error('Erreur admin récupération toutes les commandes:', error);
    res.status(500).json({ message: 'Erreur serveur récupération commandes (admin).' });
  }
};

// --- (Admin) : Récupérer les détails d'UNE commande spécifique ---
exports.getOrderDetailsAdmin = async (req, res) => {
  // ... (inchangé, déjà bon)
  const { orderId } = req.params;
  try {
    const orderQuery = `
      SELECT 
        o.id as "orderId", o.order_number, o.user_id, u.name as "userName", u.email as "userEmail",u.phone as "userPhone",
        o.status, o.total_amount as total, o.currency, 
        o.shipping_address, o.billing_address, o.notes,
        o.shipping_method, o.shipping_cost,
        o.promo_code, o.discount_amount, o.free_shipping_applied,
        o.created_at as "createdAt", o.updated_at as "updatedAt"
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1;
    `;
    const orderResult = await db.query(orderQuery, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }
    const orderDetails = orderResult.rows[0];

    const itemsQuery = `
      SELECT 
        oi.id as "itemId", oi.product_id, oi.product_name, oi.sku,
        oi.quantity, oi.unit_price, oi.subtotal
      FROM order_items oi
      WHERE oi.order_id = $1 ORDER BY oi.id;
    `;
    const itemsResult = await db.query(itemsQuery, [orderId]);
    orderDetails.items = itemsResult.rows; // Renommé en 'items' pour plus de clarté

    res.status(200).json(orderDetails);
  } catch (error) {
    console.error(`Erreur admin récupération commande ${orderId}:`, error);
    res.status(500).json({ message: 'Erreur serveur récupération commande (admin).' });
  }
};

// --- (Admin) : Mettre à jour le statut d'une commande ---
// Version mise à jour pour gérer aussi le statut du paiement pour les commandes 'cod'
exports.updateOrderStatusAdmin = async (req, res) => {
  const { orderId } = req.params;
  const { status: newStatus, trackingNumber } = req.body;

  const allowedStatuses = ['pending', 'awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'];
  if (!newStatus || !allowedStatuses.includes(newStatus)) {
    return res.status(400).json({ message: `Statut invalide. Doit être l'un de: ${allowedStatuses.join(', ')}` });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Étape 1 : Mettre à jour le statut de la commande
    // On récupère aussi l'email/nom du client ici, dans la même requête,
    // pour ne pas faire un aller-retour DB supplémentaire juste pour l'email.
    const updateOrderQuery = `
      UPDATE orders o
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE o.id = $2 
      RETURNING o.id, o.user_id, o.order_number, o.status;
    `;
    const updateResult = await client.query(updateOrderQuery, [newStatus, orderId]);

    if (updateResult.rows.length === 0) {
      throw new Error('Commande non trouvée.');
    }
    const updatedOrder = updateResult.rows[0];

    // Étape 1 bis : Statut "livrée" + paiement à la livraison encore en attente
    if (newStatus === 'delivered') {
      const paymentCheckQuery = 'SELECT id, payment_method, status FROM payments WHERE order_id = $1';
      const paymentResult = await client.query(paymentCheckQuery, [orderId]);

      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0];
        if (payment.payment_method === 'cod' && payment.status === 'pending') {
          const updatePaymentQuery = `
            UPDATE payments 
            SET status = 'succeeded', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1;
          `;
          await client.query(updatePaymentQuery, [payment.id]);
          console.log(`Paiement COD #${payment.id} pour la commande ${orderId} marqué comme 'succeeded'.`);
        }
      }
    }

    // Étape 1 ter : Une commande annulée ou remboursée ne doit plus rapporter
    // de points. Sans cette reprise, un client pourrait commander, encaisser
    // ses points, annuler, et recommencer indéfiniment.
    //
    // Le bon déjà émis n'est pas repris : le client l'a peut-être utilisé, et
    // le lui retirer après coup serait incompréhensible.
    if (newStatus === 'cancelled' || newStatus === 'refunded') {
      try {
        const reprise = await loyaltyController.reprendrePoints(client, orderId);
        if (reprise) {
          console.log(
            `Commande ${orderId} ${newStatus} : ${reprise.reprise} point(s) repris, `
            + `nouveau solde ${reprise.solde}.`
          );
        }
      } catch (fideliteError) {
        // La reprise ne doit pas empêcher le changement de statut : une
        // commande qu'on ne peut pas annuler serait un problème bien pire.
        console.error('Erreur reprise des points de fidélité:', fideliteError);
      }
    }

    // Étape 2 : Notification in-app pour l'utilisateur
    let notificationTitle = '';
    let notificationMessage = '';
    switch (newStatus) {
      case 'processing':
        notificationTitle = 'Votre commande est en préparation !';
        notificationMessage = `Bonne nouvelle ! Votre commande #${updatedOrder.order_number} est maintenant en cours de préparation par nos équipes.`;
        break;
      case 'shipped':
        notificationTitle = 'Votre commande a été expédiée !';
        notificationMessage = `Votre commande #${updatedOrder.order_number} a été expédiée et est en route.`;
        break;
      case 'delivered':
        notificationTitle = 'Votre commande a été livrée !';
        notificationMessage = `Excellente nouvelle ! Votre commande #${updatedOrder.order_number} a été livrée. Profitez bien de vos articles !`;
        break;
      case 'cancelled':
        notificationTitle = 'Votre commande a été annulée.';
        notificationMessage = `Nous vous informons que votre commande #${updatedOrder.order_number} a été annulée. Veuillez nous contacter pour plus d'informations.`;
        break;
      case 'refunded':
        notificationTitle = 'Votre commande vous sera remboursée.';
        notificationMessage = `Nous vous informons que votre commande #${updatedOrder.order_number} a été annulée et vous sera remboursée après examen. Veuillez nous contacter pour plus d'informations.`;
        break;
      case 'failed':
        notificationTitle = 'Le paiement de votre commande a échoué.';
        notificationMessage = `Le paiement de votre commande #${updatedOrder.order_number} n'a pas pu être traité.`;
        break;
    }

    if (notificationTitle && updatedOrder.user_id) {
      const linkUrl = `/orders/${updatedOrder.id}`;
      const notificationQuery = `
         INSERT INTO notifications (user_id, type, title, message, link_url)
         VALUES ($1, 'order_status_update', $2, $3, $4)
      `;
      await client.query(notificationQuery, [updatedOrder.user_id, notificationTitle, notificationMessage, linkUrl]);
    }

    await client.query('COMMIT');

    // Étape 3 : Email au client — HORS transaction et non bloquant.
    // Un email qui échoue ne doit jamais faire perdre la mise à jour de statut,
    // qui elle est déjà actée en base.
    if (updatedOrder.user_id) {
      try {
        const userResult = await db.query('SELECT email FROM users WHERE id = $1', [updatedOrder.user_id]);
        const userEmail = userResult.rows[0]?.email;
        if (userEmail) {
          await sendOrderStatusEmail(userEmail, {
            orderNumber: updatedOrder.order_number,
            status: newStatus,
            trackingNumber,
          });
        }
      } catch (emailError) {
        console.error(`Erreur envoi email statut commande ${orderId}:`, emailError);
      }
    }

    res.status(200).json({ message: 'Statut de la commande mis à jour avec succès.', order: updatedOrder });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Erreur admin màj statut commande ${orderId}:`, error.message);
    if (error.message === 'Commande non trouvée.') {
        return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du statut.' });
  } finally {
    client.release();
  }
};

// NOUVEAU : Récupérer les détails d'UNE commande spécifique pour l'UTILISATEUR CONNECTÉ
exports.getUserOrderDetail = async (req, res) => {
  const userId = req.user.id; // De authMiddleware
  const { orderId } = req.params;

  try {
    const orderQuery = `
      SELECT 
        o.id as "orderId", o.order_number, 
        o.status, o.total_amount as total, o.currency, 
        o.shipping_address, o.billing_address, o.notes,
        o.shipping_method, o.shipping_cost,
        o.created_at as "createdAt", o.updated_at as "updatedAt"
      FROM orders o
      WHERE o.id = $1 AND o.user_id = $2; -- S'ASSURER QUE LA COMMANDE APPARTIENT À L'UTILISATEUR
    `;
    const orderResult = await db.query(orderQuery, [orderId, userId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Commande non trouvée ou non accessible.' });
    }
    const orderDetails = orderResult.rows[0];

    // Récupérer les items de la commande
    const itemsQuery = `
      SELECT 
        oi.id as "itemId", oi.product_id, oi.product_name, oi.sku,
        oi.quantity, oi.unit_price, oi.subtotal
        -- Optionnel: joindre products pour avoir l'image actuelle du produit si besoin
        -- , p.image_url as "productImageUrl" 
        -- FROM order_items oi JOIN products p ON oi.product_id = p.id
      FROM order_items oi
      WHERE oi.order_id = $1 ORDER BY oi.id;
    `;
    const itemsResult = await db.query(itemsQuery, [orderId]);
    orderDetails.items = itemsResult.rows.map(item => ({
        ...item,
        // Si tu veux formater le prix ici (sinon le frontend le fera)
        // unit_price: parseFloat(item.unit_price).toFixed(2),
        // subtotal: parseFloat(item.subtotal).toFixed(2),
    }));

    res.status(200).json(orderDetails);
  } catch (error) {
    console.error(`Erreur récupération détail commande ${orderId} pour utilisateur ${userId}:`, error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des détails de la commande.' });
  }
};
