// back_end/utils/sendEmail.js
//
// Gestion des emails Artiva.
//
// Modes disponibles via MAIL_TRANSPORT dans .env :
//
//   mailpit  -> DÉVELOPPEMENT
//                Les emails sont capturés par Mailpit.
//                Interface : http://localhost:8025
//
//   console  -> DÉVELOPPEMENT
//                Aucun email n'est envoyé.
//                Le contenu est affiché dans le terminal.
//
//   brevo    -> PRODUCTION
//                Envoi réel via l'API HTTPS Brevo.
//
// IMPORTANT :
// Le mode Brevo n'utilise PAS SMTP et ne nécessite donc plus Nodemailer.
// Il utilise directement l'API HTTP de Brevo.
// =============================================================================

// =============================================================================
// Configuration Brevo API
// =============================================================================

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const DEFAULT_SENDER = {
  name: "Artiva",
  email: "artiva.app@gmail.com",
};

// =============================================================================
// Choix du mode d'envoi
// =============================================================================

let MAIL_TRANSPORT = (process.env.MAIL_TRANSPORT || "mailpit").toLowerCase();

if (MAIL_TRANSPORT === "smtp") {
  MAIL_TRANSPORT = "brevo";
}

const hasBrevoApiKey = Boolean(BREVO_API_KEY);

if (MAIL_TRANSPORT === "brevo" && !hasBrevoApiKey) {
  console.warn(
    "[MAIL] MAIL_TRANSPORT=brevo mais BREVO_API_KEY est absente : repli sur le mode console."
  );
  MAIL_TRANSPORT = "console";
}

const USE_CONSOLE_TRANSPORT = MAIL_TRANSPORT === "console";

const MAILPIT_HOST = process.env.MAIL_HOST || "localhost";
const MAILPIT_PORT = parseInt(process.env.MAIL_PORT || "1025", 10);

if (MAIL_TRANSPORT === "mailpit") {
  console.log(
    `[MAIL] Mode MAILPIT : emails capturés sur ${MAILPIT_HOST}:${MAILPIT_PORT}.\n` +
      `       Boîte de réception : http://localhost:8025`
  );
} else if (MAIL_TRANSPORT === "brevo") {
  console.log("[MAIL] Mode BREVO API : les emails seront réellement envoyés.");
} else {
  console.log(
    "[MAIL] Mode CONSOLE : aucun email ne sera réellement envoyé.\n" +
      "       Les codes de connexion s'afficheront dans le terminal."
  );
}

const htmlToText = (html = "") =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// =============================================================================
// Envoi via Brevo API
// =============================================================================

const sendViaBrevo = async (mailOptions) => {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: mailOptions.fromName || DEFAULT_SENDER.name,
        email: mailOptions.fromEmail || DEFAULT_SENDER.email,
      },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
    }),
  });

  const responseText = await response.text();
  let data = {};

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    const errorMessage =
      data?.message || data?.code || response.statusText || "Erreur inconnue Brevo";
    const error = new Error(`Brevo API ${response.status}: ${errorMessage}`);
    error.status = response.status;
    error.brevoResponse = data;
    throw error;
  }

  return data;
};

// =============================================================================
// Envoi via Mailpit
// =============================================================================

const net = require("net");

const sendViaMailpit = (mailOptions) => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();

    let buffer = "";
    let step = 0;
    let finished = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    const fail = (error) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    };

    const success = () => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve();
    };

    const send = (command) => socket.write(`${command}\r\n`);

    const processResponse = () => {
      if (finished) return;

      const lines = buffer.split("\r\n");
      if (lines.length < 2) return;

      const lastLine = lines[lines.length - 2];
      if (!/^\d{3} /.test(lastLine)) return;

      buffer = "";
      const code = parseInt(lastLine.substring(0, 3), 10);

      if (code >= 400) {
        fail(new Error(`Mailpit SMTP error ${code}: ${lastLine}`));
        return;
      }

      switch (step) {
        case 0:
          send("EHLO artiva.local");
          step = 1;
          break;

        case 1:
          send(`MAIL FROM:<${mailOptions.fromEmail || DEFAULT_SENDER.email}>`);
          step = 2;
          break;

        case 2:
          send(`RCPT TO:<${mailOptions.to}>`);
          step = 3;
          break;

        case 3:
          send("DATA");
          step = 4;
          break;

        case 4: {
          const fromName = mailOptions.fromName || DEFAULT_SENDER.name;
          const fromEmail = mailOptions.fromEmail || DEFAULT_SENDER.email;
          const subject = mailOptions.subject || "";
          const html = mailOptions.html || "";

          const message = [
            `From: "${fromName}" <${fromEmail}>`,
            `To: <${mailOptions.to}>`,
            `Subject: ${subject}`,
            "MIME-Version: 1.0",
            'Content-Type: text/html; charset="UTF-8"',
            "Content-Transfer-Encoding: 8bit",
            "",
            html,
            "",
            ".",
          ].join("\r\n");

          socket.write(`${message}\r\n`);
          step = 5;
          break;
        }

        case 5:
          send("QUIT");
          success();
          break;

        default:
          break;
      }
    };

    socket.setEncoding("utf8");

    socket.on("data", (data) => {
      buffer += data;
      processResponse();
    });

    socket.on("error", fail);

    socket.on("close", () => {
      if (!finished) {
        fail(new Error("Connexion Mailpit fermée prématurément."));
      }
    });

    socket.connect(MAILPIT_PORT, MAILPIT_HOST, () => {
      step = 0;
      processResponse();
    });
  });
};

// =============================================================================
// Fonction principale d'envoi avec logs
// =============================================================================

const sendMailWithLog = async (mailOptions, label) => {
  if (USE_CONSOLE_TRANSPORT) {
    console.log("\n" + "=".repeat(70));
    console.log(`[${label}] EMAIL (non envoyé — mode console)`);
    console.log(`  À       : ${mailOptions.to}`);
    console.log(`  Objet   : ${mailOptions.subject}`);
    console.log(`  Contenu : ${htmlToText(mailOptions.html)}`);
    console.log("=".repeat(70) + "\n");
    return;
  }

  if (MAIL_TRANSPORT === "mailpit") {
    try {
      await sendViaMailpit(mailOptions);
      console.log(
        `[${label}] Email capturé par Mailpit pour ${mailOptions.to} — à lire sur http://localhost:8025`
      );
      return;
    } catch (err) {
      console.error(`[${label}] Erreur Mailpit :`, err);
      throw err;
    }
  }

  if (MAIL_TRANSPORT === "brevo") {
    try {
      const data = await sendViaBrevo(mailOptions);
      console.log(`[${label}] Email envoyé à ${mailOptions.to}`);
      console.log(`[${label}] Réponse Brevo :`, { messageId: data.messageId });
      return data;
    } catch (err) {
      console.error(`[${label}] Erreur Brevo :`, {
        message: err.message,
        status: err.status,
        response: err.brevoResponse,
      });
      throw err;
    }
  }

  throw new Error(`[MAIL] MAIL_TRANSPORT invalide : ${MAIL_TRANSPORT}`);
};

// =============================================================================
// Petit gabarit HTML commun, pour ne pas répéter la même carte 8 fois
// =============================================================================

const carteEmail = ({ titre, couleur, corps, pied }) => `
  <div style="
    font-family: Arial, sans-serif;
    max-width:500px;
    margin:auto;
    padding:20px;
    border:1px solid #e0e0e0;
    border-radius:10px;
    background:#f9f9f9;
  ">
    <h2 style="color:${couleur}; text-align:center;">${titre}</h2>
    ${corps}
    <p style="margin-top:20px; font-size:12px; color:#888; text-align:center;">
      ${pied || "L'équipe Artiva"}
    </p>
  </div>
`;

// =============================================================================
// Envoi du code de connexion (2FA)
// =============================================================================

const sendLoginCode = async (to, code) => {
  const htmlContent = carteEmail({
    titre: "Connexion à Artiva",
    couleur: "#4CAF50",
    corps: `
      <p style="font-size:16px; text-align:center;">Voici votre code temporaire pour vous connecter :</p>
      <div style="font-size:28px; font-weight:bold; margin:20px 0; color:#333; text-align:center;">${code}</div>
      <p style="font-size:14px; color:#666; text-align:center;">
        Valable 5 minutes. Si vous n'avez pas demandé ce code, ignorez ce message.
      </p>
    `,
  });

  await sendMailWithLog(
    {
      fromName: "Artiva 👋",
      fromEmail: "artiva.app@gmail.com",
      to,
      subject: "🔐 Votre code de connexion Artiva",
      html: htmlContent,
    },
    "2FA"
  );
};

// =============================================================================
// Envoi du code de réinitialisation de mot de passe
// =============================================================================

const sendResetPasswordCode = async (to, code) => {
  const htmlContent = carteEmail({
    titre: "Réinitialisation de mot de passe",
    couleur: "#FF9800",
    corps: `
      <p style="font-size:16px; text-align:center;">Voici votre code pour réinitialiser votre mot de passe :</p>
      <div style="font-size:28px; font-weight:bold; margin:20px 0; color:#333; text-align:center;">${code}</div>
      <p style="font-size:14px; color:#666; text-align:center;">
        Ce code est valable 1 heure. Si vous n'avez pas demandé cette action, ignorez ce mail.
      </p>
    `,
  });

  await sendMailWithLog(
    {
      fromName: "Artiva 👋",
      fromEmail: "artiva.app@gmail.com",
      to,
      subject: "🔑 Code de réinitialisation Artiva",
      html: htmlContent,
    },
    "Reset"
  );
};

// =============================================================================
// NOUVEAU — Confirmation de changement de mot de passe
// =============================================================================
//
// Différent du code de reset : celui-ci part APRÈS que le mot de passe a
// changé avec succès. S'il arrive alors que l'utilisateur n'est pour rien
// dans ce changement, c'est le signal d'une compromission du compte.
// =============================================================================

const sendPasswordChangedEmail = async (to, name) => {
  const htmlContent = carteEmail({
    titre: "Mot de passe modifié",
    couleur: "#4CAF50",
    corps: `
      <p style="font-size:16px;">
        Bonjour ${name || ""},
      </p>
      <p style="font-size:15px;">
        Le mot de passe de votre compte Artiva vient d'être changé avec succès.
      </p>
      <p style="font-size:14px; color:#c0392b;">
        Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement
        et réinitialisez votre mot de passe.
      </p>
    `,
  });

  await sendMailWithLog(
    {
      fromName: "Artiva 🔒",
      fromEmail: "artiva.app@gmail.com",
      to,
      subject: "🔒 Votre mot de passe Artiva a été modifié",
      html: htmlContent,
    },
    "Password-Changed"
  );
};

// =============================================================================
// Envoi d'une nouvelle commande : client + admin
// (inchangé)
// =============================================================================

const sendNewOrderEmails = async (userEmail, adminEmail, orderData) => {
  const customerName = orderData.shipping_address?.name || "Cher client";

  const fcfa = (v) => `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;

  const genererRecapitulatif = () => {
    const sousTotal = orderData.products_total;
    const livraison = orderData.shipping_cost;
    const remise = Number(orderData.discount_amount || 0);
    const code = orderData.promo_code;

    if (sousTotal === undefined || livraison === undefined) {
      return `<p><b>Total :</b> ${fcfa(orderData.amount)}</p>`;
    }

    return `
      <table style="margin-top:12px; border-collapse:collapse;">
        <tr>
          <td style="padding:4px 16px 4px 0;">Sous-total produits</td>
          <td style="padding:4px 0; text-align:right;">${fcfa(sousTotal)}</td>
        </tr>
        ${
          remise > 0
            ? `
              <tr style="color:#1e7e34;">
                <td style="padding:4px 16px 4px 0;">Code promo <b>${code}</b></td>
                <td style="padding:4px 0; text-align:right;">- ${fcfa(remise)}</td>
              </tr>
            `
            : ""
        }
        ${
          orderData.free_shipping_applied
            ? `
              <tr style="color:#1e7e34;">
                <td style="padding:4px 16px 4px 0;">
                  Livraison <b>offerte</b>
                  <span style="color:#666;">(valeur ${fcfa(orderData.shipping_normal)})</span>
                </td>
                <td style="padding:4px 0; text-align:right;">0 FCFA</td>
              </tr>
            `
            : `
              <tr>
                <td style="padding:4px 16px 4px 0;">Livraison</td>
                <td style="padding:4px 0; text-align:right;">${fcfa(livraison)}</td>
              </tr>
            `
        }
        <tr style="border-top:2px solid #333; font-weight:bold;">
          <td style="padding:8px 16px 4px 0;">Total</td>
          <td style="padding:8px 0 4px; text-align:right;">${fcfa(orderData.amount)}</td>
        </tr>
      </table>
    `;
  };

  const generateItemsTable = (items) => {
    if (!items || items.length === 0) {
      return "<p>Aucun article.</p>";
    }

    const rows = items
      .map(
        (item, index) => `
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:8px;">${index + 1}</td>
            <td style="padding:8px;">${item.product_name || "Produit inconnu"}</td>
            <td style="padding:8px; text-align:center;">${item.quantity || 0}</td>
            <td style="padding:8px; text-align:right;">
              ${Number(item.subtotal || 0).toLocaleString("fr-FR")} CFA
            </td>
          </tr>
        `
      )
      .join("");

    const total =
      orderData.amount || items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

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
            <td style="padding:8px; text-align:right;">
              ${Number(total).toLocaleString("fr-FR")} CFA
            </td>
          </tr>
        </tbody>
      </table>
    `;
  };

  await sendMailWithLog(
    {
      fromName: "Artiva 🛍️",
      fromEmail: "artiva.app@gmail.com",
      to: userEmail,
      subject: "🛒 Votre commande a été enregistrée",
      html: `
        <h2>Merci pour votre commande, ${customerName} !</h2>
        <p>Commande <b>${orderData.order_number}</b></p>
        ${generateItemsTable(orderData.items)}
        ${genererRecapitulatif()}
        ${
          Number(orderData.discount_amount || 0) > 0
            ? `
              <p style="color:#1e7e34; margin-top:10px;">
                🎟️ Votre code <b>${orderData.promo_code}</b> vous a fait économiser
                ${fcfa(orderData.discount_amount)}.
              </p>
            `
            : ""
        }
        ${
          orderData.free_shipping_applied
            ? `
              <p style="color:#1e7e34; margin-top:10px;">
                🚚 Votre livraison gratuite a été appliquée :
                ${fcfa(orderData.shipping_normal)} économisés.
              </p>
            `
            : ""
        }
        ${
          orderData.free_shipping_earned
            ? `
              <p style="background:#e6f4ea; border-left:4px solid #1e7e34; padding:10px 14px; margin:14px 0;">
                🎁 <b>Bonne nouvelle : votre prochaine livraison est offerte !</b><br/>
                Vos achats ont atteint ${fcfa(orderData.free_shipping_earned.amount)}.<br/>
                Avantage valable jusqu'au
                ${new Date(orderData.free_shipping_earned.expires_at).toLocaleDateString("fr-FR")}.
              </p>
            `
            : ""
        }
        <p>L'équipe Artiva vous remercie 🙏</p>
      `,
    },
    "Order-Client"
  );

  await sendMailWithLog(
    {
      fromName: "Artiva 🛍️",
      fromEmail: "artiva.app@gmail.com",
      to: adminEmail,
      subject: (() => {
        const mentions = [];
        if (Number(orderData.discount_amount || 0) > 0) {
          mentions.push(`code promo ${orderData.promo_code}`);
        }
        if (orderData.free_shipping_applied) {
          mentions.push("livraison offerte");
        }
        return mentions.length > 0
          ? `📦 Nouvelle commande reçue — ${mentions.join(" + ")}`
          : "📦 Nouvelle commande reçue";
      })(),
      html: `
        <h2>Nouvelle commande reçue</h2>
        <p><b>Commande :</b> ${orderData.order_number}</p>
        <p><b>Client :</b> ${customerName} (${userEmail})</p>
        ${
          Number(orderData.discount_amount || 0) > 0
            ? `
              <p style="background:#e6f4ea; border-left:4px solid #1e7e34; padding:10px 14px; margin:14px 0;">
                🎟️ <b>Code promo utilisé : ${orderData.promo_code}</b><br/>
                Remise accordée : ${fcfa(orderData.discount_amount)}
              </p>
            `
            : ""
        }
        ${
          orderData.free_shipping_applied
            ? `
              <p style="background:#e6f4ea; border-left:4px solid #1e7e34; padding:10px 14px; margin:14px 0;">
                🚚 <b>Livraison offerte</b> — avantage acquis par cumul d'achats.<br/>
                Frais non facturés : ${fcfa(orderData.shipping_normal)}
              </p>
            `
            : ""
        }
        ${generateItemsTable(orderData.items)}
        ${genererRecapitulatif()}
        ${
          orderData.free_shipping_earned
            ? `
              <p style="color:#555; margin-top:14px; font-size:13px;">
                🎁 Ce client vient de débloquer la livraison gratuite pour sa prochaine commande.<br/>
                Cumul : ${fcfa(orderData.free_shipping_earned.amount)}<br/>
                Valable jusqu'au
                ${new Date(orderData.free_shipping_earned.expires_at).toLocaleDateString("fr-FR")}.
              </p>
            `
            : ""
        }
      `,
    },
    "Order-Admin"
  );
};

// =============================================================================
// NOUVEAU — Changement de statut d'une commande
// =============================================================================
//
// Un seul mail générique pour tout le cycle de vie post-création : la
// commande a été confirmée/en préparation, expédiée, livrée, annulée,
// remboursée, ou son paiement a échoué. Le contenu varie avec le statut,
// mais la structure d'appel reste la même partout où le statut change.
// =============================================================================

const STATUTS_EMAIL = {
  processing: {
    emoji: "👨‍🍳",
    couleur: "#2196F3",
    titre: "Votre commande est en préparation",
    texte: (n) => `Bonne nouvelle ! Votre commande <b>#${n}</b> est maintenant en cours de préparation par nos équipes.`,
  },
  shipped: {
    emoji: "🚚",
    couleur: "#2196F3",
    titre: "Votre commande a été expédiée",
    texte: (n, extra) =>
      `Votre commande <b>#${n}</b> a été expédiée et est en route.` +
      (extra?.trackingNumber ? `<br/>Numéro de suivi : <b>${extra.trackingNumber}</b>` : ""),
  },
  delivered: {
    emoji: "📦",
    couleur: "#4CAF50",
    titre: "Votre commande a été livrée",
    texte: (n) => `Excellente nouvelle ! Votre commande <b>#${n}</b> a été livrée. Profitez bien de vos articles !`,
  },
  cancelled: {
    emoji: "❌",
    couleur: "#c0392b",
    titre: "Votre commande a été annulée",
    texte: (n) => `Nous vous informons que votre commande <b>#${n}</b> a été annulée. Contactez-nous pour plus d'informations.`,
  },
  refunded: {
    emoji: "💸",
    couleur: "#c0392b",
    titre: "Votre commande vous sera remboursée",
    texte: (n) => `Votre commande <b>#${n}</b> a été annulée et sera remboursée après examen. Contactez-nous pour plus d'informations.`,
  },
  failed: {
    emoji: "⚠️",
    couleur: "#c0392b",
    titre: "Le paiement de votre commande a échoué",
    texte: (n) => `Le paiement de votre commande <b>#${n}</b> n'a pas pu être traité. Vous pouvez réessayer depuis votre compte.`,
  },
};

const sendOrderStatusEmail = async (to, { orderNumber, status, trackingNumber }) => {
  const config = STATUTS_EMAIL[status];
  if (!config) return; // statuts sans email dédié (pending, awaiting_payment, paid...)

  const htmlContent = carteEmail({
    titre: `${config.emoji} ${config.titre}`,
    couleur: config.couleur,
    corps: `<p style="font-size:15px;">${config.texte(orderNumber, { trackingNumber })}</p>`,
  });

  await sendMailWithLog(
    {
      fromName: "Artiva 📦",
      fromEmail: "artiva.app@gmail.com",
      to,
      subject: `${config.emoji} ${config.titre} — #${orderNumber}`,
      html: htmlContent,
    },
    `Order-Status-${status}`
  );
};

// =============================================================================
// NOUVEAU — Produit de retour en stock (wishlist)
// =============================================================================

const sendWishlistRestockEmail = async (to, products) => {
  const rows = (products || [])
    .map(
      (p) => `
        <tr style="border-bottom:1px solid #ddd;">
          <td style="padding:8px;">${p.name}</td>
          <td style="padding:8px; text-align:right;">
            ${Number(p.price || 0).toLocaleString("fr-FR")} FCFA
          </td>
        </tr>
      `
    )
    .join("");

  const htmlContent = carteEmail({
    titre: "🎉 De retour en stock !",
    couleur: "#4CAF50",
    corps: `
      <p style="font-size:15px;">
        Bonne nouvelle : ${products.length > 1 ? "des articles de" : "un article de"} votre liste de
        souhaits ${products.length > 1 ? "sont" : "est"} de nouveau disponible${products.length > 1 ? "s" : ""} !
      </p>
      <table style="width:100%; border-collapse:collapse; margin-top:10px;">
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:14px; color:#666; margin-top:14px;">
        Les stocks sont limités, ne tardez pas trop.
      </p>
    `,
  });

  await sendMailWithLog(
    {
      fromName: "Artiva 🎁",
      fromEmail: "artiva.app@gmail.com",
      to,
      subject: "🎉 Un article de votre liste de souhaits est de retour en stock !",
      html: htmlContent,
    },
    "Wishlist-Restock"
  );
};

// =============================================================================
// Exports CommonJS
// =============================================================================

module.exports = {
  sendLoginCode,
  sendResetPasswordCode,
  sendPasswordChangedEmail,
  sendNewOrderEmails,
  sendOrderStatusEmail,
  sendWishlistRestockEmail,
};