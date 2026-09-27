const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  ActivityType,
} = require("discord.js");
const express = require("express");

// ================= CONFIGURAZIONE SERVER WEB (RENDER + UPTIMEROBOT) =================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("⚡ Bot Ticket FlashNode Online e Attivo 24/7!");
});

app.listen(PORT, () => {
  console.log(`🌐 Server Web Express attivo sulla porta ${PORT}`);
});

// ================= CONFIGURAZIONE BOT DISCORD =================
// Il TOKEN viene letto in modo sicuro dalle Environment Variables di Render
const TOKEN = process.env.TOKEN;
const STAFF_ROLE_ID = "1553774064412397706"; // Ruolo Staff FlashNode
// ==============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Evento: Bot pronto e connesso
client.once("ready", () => {
  console.log(`✅ Bot FlashNode avviato come: ${client.user.tag}`);

  // Impostazione dello Stato Personale
  client.user.setPresence({
    activities: [
      {
        name: "Hosting with FlashNode",
        type: ActivityType.Custom,
      },
    ],
    status: "online",
  });
});

// Comando !setup-ticket per creare il Pannello
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!setup-ticket") {
    // Controllo permessi Staff per la configurazione
    if (
      !message.member.roles.cache.has(STAFF_ROLE_ID) &&
      !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return message.reply(
        "❌ Non hai i permessi per configurare il pannello ticket!",
      );
    }

    const embedPannello = new EmbedBuilder()
      .setTitle("⚡ FlashNode — Centro Assistenza & Ticket")
      .setDescription(
        "Hai bisogno di aiuto o informazioni per l'hosting del tuo bot?\n\nSeleziona una categoria dal menu sottostante per aprire un ticket con lo Staff!",
      )
      .setColor(0x5865f2)
      .setFooter({ text: "FlashNode Hosting • Assistenza H24" });

    const menuSelect = new StringSelectMenuBuilder()
      .setCustomId("select_ticket_category")
      .setPlaceholder("👇 Seleziona il motivo del ticket...")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Assistenza Generale")
          .setValue("cat_generale")
          .setDescription("Domande generiche o supporto generale.")
          .setEmoji("💬"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Problemi di Hosting")
          .setValue("cat_hosting")
          .setDescription(
            "Errori sul server, Pterodactyl, bot offline o configurazione.",
          )
          .setEmoji("🖥️"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Segnala un Bug")
          .setValue("cat_bug")
          .setDescription("Segnala malfunzionamenti nel nostro servizio.")
          .setEmoji("🐛"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Informazioni")
          .setValue("cat_info")
          .setDescription("Informazioni su piani, prezzi o pagamenti.")
          .setEmoji("ℹ️"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Non so / Altro")
          .setValue("cat_altro")
          .setDescription("Altre richieste non elencate sopra.")
          .setEmoji("❓"),
      );

    const row = new ActionRowBuilder().addComponents(menuSelect);

    await message.channel.send({ embeds: [embedPannello], components: [row] });
    await message.delete().catch(() => {});
  }
});

// Gestione Interazioni (Menu a tendina e Bottoni)
client.on("interactionCreate", async (interaction) => {
  // --- 1. APERTURA TICKET DA MENU A TENDINA ---
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "select_ticket_category"
  ) {
    const categoria = interaction.values[0];
    const user = interaction.user;
    const guild = interaction.guild;

    let nomeCategoria = "";
    let emojiCategoria = "";

    switch (categoria) {
      case "cat_generale":
        nomeCategoria = "Assistenza Generale";
        emojiCategoria = "💬";
        break;
      case "cat_hosting":
        nomeCategoria = "Problemi Hosting";
        emojiCategoria = "🖥️";
        break;
      case "cat_bug":
        nomeCategoria = "Segnalazione Bug";
        emojiCategoria = "🐛";
        break;
      case "cat_info":
        nomeCategoria = "Informazioni";
        emojiCategoria = "ℹ️";
        break;
      case "cat_altro":
        nomeCategoria = "Altro";
        emojiCategoria = "❓";
        break;
    }

    // Controlla se l'utente ha già un ticket aperto
    const canaleEsistente = guild.channels.cache.find(
      (c) =>
        c.name ===
        `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    );
    if (canaleEsistente) {
      return interaction.reply({
        content: `❌ Hai già un ticket aperto qui: ${canaleEsistente}`,
        ephemeral: true,
      });
    }

    // Creazione Canale Privato
    const ticketChannel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.id, // Nascosto a @everyone
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id, // Visibile all'utente
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: STAFF_ROLE_ID, // Visibile allo Staff
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ],
    });

    // Embed all'interno del Ticket
    const embedTicket = new EmbedBuilder()
      .setTitle(`${emojiCategoria} Ticket: ${nomeCategoria}`)
      .setDescription(
        `Ciao ${user}, benvenuto nel tuo ticket!\n\nDescrivi il tuo problema nei dettagli. Un membro dello Staff con il ruolo <@&${STAFF_ROLE_ID}> ti risponderà al più presto.`,
      )
      .addFields(
        { name: "Utente", value: `${user}`, inline: true },
        {
          name: "Categoria",
          value: `${emojiCategoria} ${nomeCategoria}`,
          inline: true,
        },
      )
      .setColor(0x2b2d31)
      .setTimestamp();

    // Bottoni per lo Staff
    const btnClaim = new ButtonBuilder()
      .setCustomId("btn_claim")
      .setLabel("Prendi in carico")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🙋‍♂️");

    const btnUnclaim = new ButtonBuilder()
      .setCustomId("btn_unclaim")
      .setLabel("Rilascia")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔄");

    const btnClose = new ButtonBuilder()
      .setCustomId("btn_close")
      .setLabel("Chiudi Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒");

    const buttonsRow = new ActionRowBuilder().addComponents(
      btnClaim,
      btnUnclaim,
      btnClose,
    );

    await ticketChannel.send({
      content: `${user} | <@&${STAFF_ROLE_ID}>`,
      embeds: [embedTicket],
      components: [buttonsRow],
    });

    await interaction.reply({
      content: `✅ Ticket creato con successo! Vai su: ${ticketChannel}`,
      ephemeral: true,
    });
  }

  // --- 2. GESTIONE BOTTONI (CLAIM / UNCLAIM / CLOSE) ---
  if (interaction.isButton()) {
    const member = interaction.member;

    // CONTROLLO PERMESSI: Solo chi ha il ruolo STAFF_ROLE_ID può usare i bottoni
    if (!member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: `❌ Non hai i permessi per gestire i ticket! Solo il ruolo <@&${STAFF_ROLE_ID}> può farlo.`,
        ephemeral: true,
      });
    }

    // BOTTONE 1: CLAIM (PRENDI IN CARICO)
    if (interaction.customId === "btn_claim") {
      const embedClaim = new EmbedBuilder()
        .setDescription(
          `🙋‍♂️ Questo ticket è stato preso in carico da ${interaction.user}.`,
        )
        .setColor(0x57f287);

      await interaction.reply({ embeds: [embedClaim] });
    }

    // BOTTONE 2: UNCLAIM (RILASCIA)
    if (interaction.customId === "btn_unclaim") {
      const embedUnclaim = new EmbedBuilder()
        .setDescription(
          `🔄 Il ticket è stato rilasciato da ${interaction.user} ed è nuovamente libero per tutto lo Staff.`,
        )
        .setColor(0xfee75c);

      await interaction.reply({ embeds: [embedUnclaim] });
    }

    // BOTTONE 3: CLOSE (CHIUDI TICKET)
    if (interaction.customId === "btn_close") {
      const embedClose = new EmbedBuilder()
        .setDescription(
          `🔒 Ticket in chiusura da parte di ${interaction.user}...\nIl canale verrà eliminato tra 5 secondi.`,
        )
        .setColor(0xed4245);

      await interaction.reply({ embeds: [embedClose] });

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
});

client.login(TOKEN);
