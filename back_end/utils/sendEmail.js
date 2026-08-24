// back_end/utils/sendEmail.js
//
// NOTE : ce fichier était écrit en syntaxe ESM (import / export) alors que tout
// le reste du backend est en CommonJS (require) et que package.json ne déclare
// pas "type": "module". Ça ne fonctionne que sur Node >= 22 (l'image Docker de
// prod utilise Node 24) ; sur Node 20 le serveur refuse de démarrer avec
// « Cannot use import statement outside a module ». Converti en CommonJS, ce qui
// fonctionne sur les deux.
const nodemailer = require("nodemailer");

// =============================================================================
// Choix du mode d'envoi — piloté par MAIL_TRANSPORT dans back_end/.env
// =============================================================================
// mailpit  -> DÉVELOPPEMENT (recommandé) : les emails partent vers le faux
//             serveur SMTP Mailpit lancé par docker compose. Rien ne sort de la
//             machine ; on lit les messages, avec leur rendu HTML, sur
//             http://localhost:8025.
//
// console  -> DÉVELOPPEMENT sans Docker : rien n'est envoyé, le contenu de
//             l'email (donc le code à 6 chiffres) est écrit dans le terminal.
//
// brevo    -> PRODUCTION : envoi réel via le relais SMTP Brevo.
//
// Par sécurité, si le mode demandé est "brevo" mais que les identifiants ne sont
// pas renseignés, on retombe sur "console" : sans ce garde-fou, toute connexion
// client échouerait avec une erreur 500.
// =============================================================================
const hasBrevoCredentials = Boolean(
  process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS
);

let MAIL_TRANSPORT = (process.env.MAIL_TRANSPORT || "mailpit").toLowerCase();

// "smtp" est accepté comme ancien alias de "brevo" (valeur utilisée avant
// l'introduction de Mailpit).
if (MAIL_TRANSPORT === "smtp") MAIL_TRANSPORT = "brevo";

if (MAIL_TRANSPORT === "brevo" && !hasBrevoCredentials) {
  console.warn(
    "[MAIL] MAIL_TRANSPORT=brevo mais BREVO_SMTP_USER / BREVO_SMTP_PASS sont " +
      "absents : repli sur le mode console."
  );
  MAIL_TRANSPORT = "console";
}

const USE_CONSOLE_TRANSPORT = MAIL_TRANSPORT === "console";

// ==============================
// Construction du transporteur
let transporter = null;

if (MAIL_TRANSPORT === "mailpit") {
  // Mailpit n'exige ni chiffrement ni authentification. MAIL_HOST permet de le
  // joindre ailleurs que sur cette machine (voir back_end/.env).
  const host = process.env.MAIL_HOST || "localhost";
  const port = parseInt(process.env.MAIL_PORT || "1025", 10);

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    ignoreTLS: true, // Mailpit ne propose pas STARTTLS
  });

  console.log(
    `[MAIL] Mode MAILPIT : emails capturés sur ${host}:${port}.\n` +
      `       Boîte de réception : http://${host === "localhost" ? "localhost" : host}:8025`
  );
} else if (MAIL_TRANSPORT === "brevo") {
  // --- PRODUCTION -----------------------------------------------------------
  transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });

  console.log("[MAIL] Mode BREVO : les emails seront réellement envoyés.");
} else {
  console.log(
    "[MAIL] Mode CONSOLE : aucun email ne sera réellement envoyé.\n" +
      "       Les codes de connexion s'afficheront ici même, dans ce terminal."
  );
}

// ==============================
// Rend le corps HTML lisible dans un terminal (pour le mode console)
const htmlToText = (html = "") =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ==============================
// Fonction utilitaire d'envoi avec logs
const sendMailWithLog = async (mailOptions, label) => {
  // --- DÉVELOPPEMENT : on affiche l'email au lieu de l'envoyer ---------------
  if (USE_CONSOLE_TRANSPORT) {
    console.log("\n" + "=".repeat(70));
    console.log(`[${label}] EMAIL (non envoyé — mode console)`);
    console.log(`  À       : ${mailOptions.to}`);
    console.log(`  Objet   : ${mailOptions.subject}`);
    console.log(`  Contenu : ${htmlToText(mailOptions.html)}`);
    console.log("=".repeat(70) + "\n");
    return;
  }

  // --- Envoi via SMTP : Mailpit en local, Brevo en production ---------------
  try {
    const info = await transporter.sendMail(mailOptions);

    if (MAIL_TRANSPORT === "mailpit") {
      // En développement, l'info utile n'est pas l'accusé SMTP mais où lire
      // le message.
      console.log(
        `[${label}] Email capturé par Mailpit pour ${mailOptions.to} ` +
          `— à lire sur http://localhost:8025`
      );
      return;
    }

    console.log(`[${label}] Email envoyé à ${mailOptions.to}`);
    console.log(`[${label}] Réponse Nodemailer :`, {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      envelope: info.envelope,
    });
  } catch (err) {
    console.error(`[${label}] Erreur lors de l'envoi :`, err);
    throw err;
  }
};

// ==============================
// Envoi du code de connexion (2FA)
const sendLoginCode = async (to, code) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width:500px; margin:auto; padding:20px; border:1px solid #e0e0e0; border-radius:10px; background:#f9f9f9; text-align:center;">
      <h2 style="color:#4CAF50;">Connexion à Artiva</h2>
      <p style="font-size:16px;">Voici votre code temporaire pour vous connecter :</p>
      <div style="font-size:28px; font-weight:bold; margin:20px 0; color:#333;">${code}</div>
      <p style="font-size:14px; color:#666;">Valable 5 minutes. Si vous n'avez pas demandé ce code, ignorez ce message.</p>
      <p style="margin-top:20px; font-size:12px; color:#888;">L'équipe Artiva</p>
    </div>
  `;

  await sendMailWithLog(
    {
      from: `"Artiva 👋" <artiva.app@gmail.com>`,
      to,
      subject: "🔐 Votre code de connexion Artiva",
      html: htmlContent,
    },
    "2FA"
  );
};

// ==============================
// Envoi du code de réinitialisation de mot de passe
const sendResetPasswordCode = async (to, code) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width:500px; margin:auto; padding:20px; border:1px solid #e0e0e0; border-radius:10px; background:#fdfdfd; text-align:center;">
      <h2 style="color:#FF9800;">Réinitialisation de mot de passe</h2>
      <p style="font-size:16px;">Voici votre code pour réinitialiser votre mot de passe :</p>
      <div style="font-size:28px; font-weight:bold; margin:20px 0; color:#333;">${code}</div>
      <p style="font-size:14px; color:#666;">Ce code est valable 1 heure. Si vous n'avez pas demandé cette action, ignorez ce mail.</p>
      <p style="margin-top:20px; font-size:12px; color:#888;">L'équipe Artiva</p>
    </div>
  `;

  await sendMailWithLog(
    {
      from: `"Artiva 👋" <artiva.app@gmail.com>`,
      to,
      subject: "🔑 Code de réinitialisation Artiva",
      html: htmlContent,
    },
    "Reset"
  );
};

// ==============================
// Envoi d'une nouvelle commande : client + admin
const sendNewOrderEmails = async (userEmail, adminEmail, orderData) => {
  const customerName = orderData.shipping_address?.name || "Cher client";

  const fcfa = (v) => `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;

  /**
   * Récapitulatif des montants.
   *
   * La ligne de remise n'apparaît que si un code a servi — mais quand c'est le
   * cas, elle doit être visible sans ambiguïté : c'est la seule trace qui
   * explique pourquoi la boutique encaisse moins que la somme des articles.
   */
  const genererRecapitulatif = () => {
    const sousTotal = orderData.products_total;
    const livraison = orderData.shipping_cost;
    const remise = Number(orderData.discount_amount || 0);
    const code = orderData.promo_code;

    // Anciennes commandes ou appel sans détail : on n'affiche que le total.
    if (sousTotal === undefined || livraison === undefined) {
      return `<p><b>Total :</b> ${fcfa(orderData.amount)}</p>`;
    }

    return `
      <table style="margin-top:12px; border-collapse:collapse;">
        <tr>
          <td style="padding:4px 16px 4px 0;">Sous-total produits</td>
          <td style="padding:4px 0; text-align:right;">${fcfa(sousTotal)}</td>
        </tr>
        ${remise > 0 ? `
        <tr style="color:#1e7e34;">
          <td style="padding:4px 16px 4px 0;">
            Code promo <b>${code}</b>
          </td>
          <td style="padding:4px 0; text-align:right;">- ${fcfa(remise)}</td>
        </tr>` : ""}
        ${orderData.free_shipping_applied ? `
        <tr style="color:#1e7e34;">
          <td style="padding:4px 16px 4px 0;">
            Livraison <b>offerte</b>
            <span style="color:#666;">(valeur ${fcfa(orderData.shipping_normal)})</span>
          </td>
          <td style="padding:4px 0; text-align:right;">0 FCFA</td>
        </tr>` : `
        <tr>
          <td style="padding:4px 16px 4px 0;">Livraison</td>
          <td style="padding:4px 0; text-align:right;">${fcfa(livraison)}</td>
        </tr>`}
        <tr style="border-top:2px solid #333; font-weight:bold;">
          <td style="padding:8px 16px 4px 0;">Total</td>
          <td style="padding:8px 0 4px; text-align:right;">${fcfa(orderData.amount)}</td>
        </tr>
      </table>
    `;
  };

  const generateItemsTable = (items) => {
    if (!items || items.length === 0) return "<p>Aucun article.</p>";

    const rows = items
      .map((item, index) => `
        <tr style="border-bottom:1px solid #ddd;">
          <td style="padding:8px;">${index + 1}</td>
          <td style="padding:8px;">${item.product_name || "Produit inconnu"}</td>
          <td style="padding:8px; text-align:center;">${item.quantity || 0}</td>
          <td style="padding:8px; text-align:right;">${(item.subtotal || 0).toLocaleString()} CFA</td>
        </tr>
      `)
      .join("");

    const total =
      orderData.amount ||
      items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    return `
      <table style="width:100%; border-collapse:collapse; margin-top:10px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:8px;">#</th>
            <th style="padding:8px;">Produit</th>
            <th style="padding:8px;">Quantité</th>
            <th style="padding:8px;">Prix</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight:bold;">
            <td colspan="3" style="padding:8px; text-align:right;">Total</td>
            <td style="padding:8px; text-align:right;">${total.toLocaleString()} CFA</td>
          </tr>
        </tbody>
      </table>
    `;
  };

  // Email CLIENT
  await sendMailWithLog(
    {
      from: `"Artiva 🛍️" <artiva.app@gmail.com>`,
      to: userEmail,
      subject: "🛒 Votre commande a été enregistrée",
      html: `
        <h2>Merci pour votre commande, ${customerName} !</h2>
        <p>Commande <b>${orderData.order_number}</b></p>
        ${generateItemsTable(orderData.items)}
        ${genererRecapitulatif()}
        ${Number(orderData.discount_amount || 0) > 0 ? `
        <p style="color:#1e7e34; margin-top:10px;">
          🎟️ Votre code <b>${orderData.promo_code}</b> vous a fait économiser ${fcfa(orderData.discount_amount)}.
        </p>` : ""}
        ${orderData.free_shipping_applied ? `
        <p style="color:#1e7e34; margin-top:10px;">
          🚚 Votre livraison gratuite a été appliquée : ${fcfa(orderData.shipping_normal)} économisés.
        </p>` : ""}
        ${orderData.free_shipping_earned ? `
        <p style="background:#e6f4ea; border-left:4px solid #1e7e34; padding:10px 14px; margin:14px 0;">
          🎁 <b>Bonne nouvelle : votre prochaine livraison est offerte !</b><br/>
          Vos achats ont atteint ${fcfa(orderData.free_shipping_earned.amount)}.
          Avantage valable jusqu'au
          ${new Date(orderData.free_shipping_earned.expires_at).toLocaleDateString("fr-FR")}.
        </p>` : ""}
        <p>L'équipe Artiva vous remercie 🙏</p>
      `,
    },
    "Order-Client"
  );

  // Email ADMIN
  await sendMailWithLog(
    {
      from: `"Artiva 🛍️" <artiva.app@gmail.com>`,
      to: adminEmail,
      // L'objet porte les avantages accordés : une remise ou une livraison
      // offerte doit se voir dans la boîte de réception, sans ouvrir l'email.
      subject: (() => {
        const mentions = [];
        if (Number(orderData.discount_amount || 0) > 0) {
          mentions.push(`code promo ${orderData.promo_code}`);
        }
        if (orderData.free_shipping_applied) mentions.push('livraison offerte');
        return mentions.length > 0
          ? `📦 Nouvelle commande reçue — ${mentions.join(' + ')}`
          : '📦 Nouvelle commande reçue';
      })(),
      html: `
        <h2>Nouvelle commande reçue</h2>
        <p><b>Commande :</b> ${orderData.order_number}</p>
        <p><b>Client :</b> ${customerName} (${userEmail})</p>
        ${Number(orderData.discount_amount || 0) > 0 ? `
        <p style="background:#e6f4ea; border-left:4px solid #1e7e34; padding:10px 14px; margin:14px 0;">
          🎟️ <b>Code promo utilisé : ${orderData.promo_code}</b><br/>
          Remise accordée : ${fcfa(orderData.discount_amount)}
        </p>` : ""}
        ${orderData.free_shipping_applied ? `
        <p style="background:#e6f4ea; border-left:4px solid #1e7e34; padding:10px 14px; margin:14px 0;">
          🚚 <b>Livraison offerte</b> — avantage acquis par cumul d'achats.<br/>
          Frais non facturés : ${fcfa(orderData.shipping_normal)}
        </p>` : ""}
        ${generateItemsTable(orderData.items)}
        ${genererRecapitulatif()}
        ${orderData.free_shipping_earned ? `
        <p style="color:#555; margin-top:14px; font-size:13px;">
          🎁 Ce client vient de débloquer la livraison gratuite pour sa prochaine
          commande (cumul ${fcfa(orderData.free_shipping_earned.amount)}, valable jusqu'au
          ${new Date(orderData.free_shipping_earned.expires_at).toLocaleDateString("fr-FR")}).
        </p>` : ""}
      `,
    },
    "Order-Admin"
  );
};

// =============================================================================
// Exports (CommonJS — voir la note en haut de fichier)
// =============================================================================
module.exports = {
  sendLoginCode,
  sendResetPasswordCode,
  sendNewOrderEmails,
};
