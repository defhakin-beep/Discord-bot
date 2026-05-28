import { logger } from '../../utils/helpers.js';
import { errorEmbed } from '../../utils/embeds.js';
import { getUser, addUserCoins, addUserXP, getCooldown, setCooldown, getTopUsers, getDatabase } from '../../database/db.js';
import { createFNFGame, getFNFGameByUser, deleteFNFGame } from '../../games/fnf.js';
import { startWordleGame, getWordleGame, evaluateGuess, deleteWordleGame } from '../../games/wordle.js';
import { BlackjackGame } from '../../games/blackjack.js';
import { SlotsGame } from '../../games/slots.js';
import { MinesGame } from '../../games/mines.js';
import { TriviaGame } from '../../games/trivia.js';
import { getLevelInfo, buildBar, formatNumber, msToTime, randomInt, parseTime } from '../../utils/helpers.js';
import { CONFIG } from '../../config/constants.js';
import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default async function slashCommand(client, interaction) {
  if (!interaction.isChatInputCommand()) return;
  try {
    const cmd = interaction.commandName;
    const userId = interaction.user.id;

    if (cmd === 'ping') return await interaction.reply({ content: `🏓 ${client.ws.ping}ms`, ephemeral: true });

    if (cmd === 'help') {
      return await interaction.reply({ content: '🤖 **v3.0 MEGA**\n💰 `/balance` `/rank` `/profile` `/shop` `/inventory` `/leaderboard`\n🐾 `/pet` `/adopt` `/feed`\n🎮 `/fnf` `/wordle` `/blackjack` `/slots` `/mines` `/trivia` `/coinflip` `/roulette`\n🎫 `/ticket` `/ticketpanel` `/application`\n🛡️ `/ban` `/kick` `/warn` `/timeout` `/clear`\n⚡ `!daily` `!rob` `!fight` `!gamble` `!ban` `!kick` `!hack` `!ratio`', ephemeral: true });
    }

    if (cmd === 'balance') {
      const user = getUser(userId);
      return await interaction.reply({ content: `💰 **${formatNumber(user.coins)}** coins`, ephemeral: true });
    }

    if (cmd === 'rank') {
      const user = getUser(userId);
      const info = getLevelInfo(user.xp);
      return await interaction.reply({ content: `⭐ **Level ${info.level}**\n${buildBar(info.xpInLevel, info.xpRequired)}\n${Math.floor(info.xpInLevel)}/${info.xpRequired} XP`, ephemeral: true });
    }

    if (cmd === 'profile') {
      const user = getUser(userId);
      const info = getLevelInfo(user.xp);
      return await interaction.reply({ embeds: [{ title: `${interaction.user.username}'s Profile`, color: CONFIG.COLORS.PRIMARY, thumbnail: { url: interaction.user.displayAvatarURL() }, fields: [{ name: 'Coins', value: `💰 **${formatNumber(user.coins)}**`, inline: true }, { name: 'Level', value: `⭐ **${info.level}**`, inline: true }, { name: 'Aura', value: `**${user.aura_level}%**`, inline: true }] }], ephemeral: true });
    }

    if (cmd === 'shop') {
      let text = '**🛍️ SHOP**\n\n';
      CONFIG.SHOP_ITEMS.forEach(item => {
        text += `**${item.name}** - 💰 ${formatNumber(item.price)} - ⚔️ ${item.damage} - ${item.rarity}\n`;
      });
      return await interaction.reply({ content: text, ephemeral: true });
    }

    if (cmd === 'inventory') {
      const db = getDatabase();
      const items = db.prepare('SELECT * FROM inventory WHERE user_id = ?').all(userId);
      let text = items.length === 0 ? 'Empty!' : items.map((i, idx) => `**${idx + 1}.** ${i.item_name} - ${i.rarity}`).join('\n');
      return await interaction.reply({ content: `**🎒 Inventory**\n${text}`, ephemeral: true });
    }

    if (cmd === 'leaderboard') {
      const users = getTopUsers(10);
      let text = '**🏆 TOP 10**\n\n';
      users.forEach((u, i) => { text += `**#${i + 1}** <@${u.id}> - 💰 ${formatNumber(u.coins)}\n`; });
      return await interaction.reply({ content: text, ephemeral: true });
    }

    if (cmd === 'pet') {
      const db = getDatabase();
      const pet = db.prepare('SELECT * FROM pets WHERE user_id = ?').get(userId);
      if (!pet) return await interaction.reply({ content: '❌ No pet! Use `/adopt`', ephemeral: true });
      return await interaction.reply({ embeds: [{ title: `🐾 ${pet.pet_name}`, color: CONFIG.COLORS.GAME, fields: [{ name: 'Type', value: pet.pet_type, inline: true }, { name: 'Level', value: `${pet.level}`, inline: true }, { name: 'Hunger', value: buildBar(pet.hunger, 100), inline: false }, { name: 'Happiness', value: buildBar(pet.happiness, 100), inline: false }] }], ephemeral: true });
    }

    if (cmd === 'adopt') {
      const db = getDatabase();
      const existing = db.prepare('SELECT * FROM pets WHERE user_id = ?').get(userId);
      if (existing) return await interaction.reply({ content: '❌ Already have a pet!', ephemeral: true });
      const pet = CONFIG.PETS[Math.floor(Math.random() * CONFIG.PETS.length)];
      db.prepare('INSERT INTO pets (user_id, pet_name, pet_type, level, experience, hunger, happiness) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, pet.name, pet.type, 1, 0, 100, 100);
      return await interaction.reply({ content: `🎉 Adopted ${pet.name}! ${pet.emoji}`, ephemeral: true });
    }

    if (cmd === 'feed') {
      const db = getDatabase();
      const pet = db.prepare('SELECT * FROM pets WHERE user_id = ?').get(userId);
      if (!pet) return await interaction.reply({ content: '❌ No pet!', ephemeral: true });
      const cooldown = getCooldown(userId, 'feed_pet');
      if (cooldown) return await interaction.reply({ content: `⏰ Come back in ${msToTime(cooldown)}`, ephemeral: true });
      db.prepare('UPDATE pets SET hunger = ?, happiness = ? WHERE user_id = ?').run(Math.min(100, pet.hunger + 40), Math.min(100, pet.happiness + 15), userId);
      setCooldown(userId, 'feed_pet', 3600000);
      return await interaction.reply({ content: `🍗 Fed ${pet.pet_name}!`, ephemeral: true });
    }

    if (cmd === 'fnf') {
      if (getFNFGameByUser(userId)) return await interaction.reply({ embeds: [errorEmbed('Game In Progress', 'Already playing!')], ephemeral: true });
      const difficulty = interaction.options.getString('difficulty');
      const game = createFNFGame(userId, difficulty);
      await interaction.reply({ embeds: [game.getGameEmbed()], components: [game.getGameButtons()] });
      const msg = await interaction.fetchReply();
      const collector = msg.createMessageComponentCollector({ time: game.chart.length * game.settings.speed + 5000 });
      collector.on('collect', async btn => {
        if (btn.user.id !== userId) return;
        const noteMap = { [`fnf_left_${game.gameId}`]: '⬅️', [`fnf_down_${game.gameId}`]: '⬇️', [`fnf_up_${game.gameId}`]: '⬆️', [`fnf_right_${game.gameId}`]: '➡️' };
        const playerNote = noteMap[btn.customId];
        if (!playerNote) return;
        game.hitNote(playerNote);
        if (game.isComplete()) {
          game.finished = true;
          collector.stop();
          const r = game.getResults();
          addUserCoins(userId, Math.floor(r.finalScore / 10));
          addUserXP(userId, r.finalScore);
          await interaction.editReply({ embeds: [game.getResultEmbed()], components: [] });
          deleteFNFGame(game.gameId);
          return;
        }
        if (game.health <= 0) {
          game.finished = true;
          collector.stop();
          await interaction.editReply({ embeds: [errorEmbed('Game Over', `Score: ${game.score}`)], components: [] });
          deleteFNFGame(game.gameId);
          return;
        }
        await interaction.editReply({ embeds: [game.getGameEmbed()], components: [game.getGameButtons()] });
        await btn.deferUpdate().catch(() => {});
      });
      return;
    }

    if (cmd === 'wordle') {
      const guess = interaction.options.getString('guess').toLowerCase();
      if (!getWordleGame(interaction.channelId)) startWordleGame(interaction.channelId);
      const game = getWordleGame(interaction.channelId);
      const result = evaluateGuess(game.word, guess);
      game.guesses.push({ guess, result });
      let board = '';
      for (const g of game.guesses) board += g.result.join('') + ' ' + g.guess.toUpperCase() + '\n';
      const embed = { title: 'Wordle', description: board, color: guess === game.word ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.INFO };
      if (guess === game.word) { embed.footer = { text: '🎉 Won!' }; addUserCoins(userId, 500); addUserXP(userId, 250); deleteWordleGame(interaction.channelId); }
      else if (game.guesses.length >= game.maxGuesses) { embed.footer = { text: `Word: ${game.word}` }; deleteWordleGame(interaction.channelId); }
      else embed.footer = { text: `${game.maxGuesses - game.guesses.length} left` };
      return await interaction.reply({ embeds: [embed] });
    }

    if (cmd === 'blackjack') {
      const bet = interaction.options.getInteger('bet');
      const user = getUser(userId);
      if (user.coins < bet) return await interaction.reply({ content: '❌ Not enough coins!', ephemeral: true });
      const bj = new BlackjackGame(userId, bet);
      const state = bj.getGameState();
      const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`bj_hit_${userId}`).setLabel('Hit').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`bj_stand_${userId}`).setLabel('Stand').setStyle(ButtonStyle.Danger));
      return await interaction.reply({ embeds: [{ title: '🎰 Blackjack', color: CONFIG.COLORS.GAME, fields: [{ name: 'Your Hand', value: `${state.playerCards} | **${state.playerValue}**` }, { name: 'Dealer', value: `${state.dealerCards}` }, { name: 'Bet', value: `💰 ${bet}` }] }], components: [btn] });
    }

    if (cmd === 'slots') {
      const bet = interaction.options.getInteger('bet');
      const user = getUser(userId);
      if (user.coins < bet) return await interaction.reply({ content: '❌ Not enough coins!', ephemeral: true });
      const slots = new SlotsGame(bet);
      const result = slots.spin();
      let text = `🎰 ${result.symbols.join(' | ')} 🎰\n\n`;
      if (result.win) { const winnings = Math.floor(bet * result.multiplier); addUserCoins(userId, winnings); text += `🎉 **+${winnings}**`; }
      else { addUserCoins(userId, -bet); text += `💀 **-${bet}**`; }
      return await interaction.reply({ content: text, ephemeral: true });
    }

    if (cmd === 'mines') {
      const bet = interaction.options.getInteger('bet');
      const user = getUser(userId);
      if (user.coins < bet) return await interaction.reply({ content: '❌ Not enough!', ephemeral: true });
      const mines = new MinesGame(bet);
      return await interaction.reply({ content: `💣 Mines\n\n${mines.getBoard()}`, ephemeral: true });
    }

    if (cmd === 'trivia') {
      const trivia = new TriviaGame();
      const q = trivia.getQuestion();
      const btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`trivia_a_${userId}`).setLabel(q.options[0]).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`trivia_b_${userId}`).setLabel(q.options[1]).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`trivia_c_${userId}`).setLabel(q.options[2]).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`trivia_d_${userId}`).setLabel(q.options[3]).setStyle(ButtonStyle.Primary)
      );
      return await interaction.reply({ content: `**${q.question}**`, components: [btns], ephemeral: true });
    }

    if (cmd === 'coinflip') {
      const bet = interaction.options.getInteger('bet');
      const user = getUser(userId);
      if (user.coins < bet) return await interaction.reply({ content: '❌ Not enough!', ephemeral: true });
      const result = Math.random() > 0.5 ? 'heads' : 'tails';
      const won = Math.random() > 0.5;
      if (won) { addUserCoins(userId, bet); return await interaction.reply({ content: `🪙 **${result.toUpperCase()}** 🎉 **+${bet}**`, ephemeral: true }); }
      else { addUserCoins(userId, -bet); return await interaction.reply({ content: `🪙 **${result.toUpperCase()}** 💀 **-${bet}**`, ephemeral: true }); }
    }

    if (cmd === 'roulette') {
      const bet = interaction.options.getInteger('bet');
      const user = getUser(userId);
      if (user.coins < bet) return await interaction.reply({ content: '❌ Not enough!', ephemeral: true });
      const result = randomInt(0, 36);
      const won = result % 2 === 0;
      if (won) { const winnings = Math.floor(bet * 2); addUserCoins(userId, winnings); return await interaction.reply({ content: `🎡 **${result}** 🎉 **+${winnings}**`, ephemeral: true }); }
      else { addUserCoins(userId, -bet); return await interaction.reply({ content: `🎡 **${result}** 💀 **-${bet}**`, ephemeral: true }); }
    }

    if (cmd === 'ticket') {
      const category = interaction.options.getString('category');
      const db = getDatabase();
      const ticketNum = randomInt(1000, 9999);
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${category}-${ticketNum}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
      });
      const closeBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`close_ticket_${ticketChannel.id}`).setLabel('Close').setStyle(ButtonStyle.Danger));
      await ticketChannel.send({ content: `🎫 **${category.toUpperCase()} TICKET**\n\nSupport incoming!`, components: [closeBtn] });
      db.prepare('INSERT INTO tickets (channel_id, user_id, guild_id, category, status) VALUES (?, ?, ?, ?, ?)').run(ticketChannel.id, userId, interaction.guildId, category, 'open');
      return await interaction.reply({ content: `🎫 Ticket created: ${ticketChannel}`, ephemeral: true });
    }

    if (cmd === 'ticketpanel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.reply({ content: '❌ Admin only!', ephemeral: true });
      const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('📬 Open Ticket').setStyle(ButtonStyle.Primary));
      await interaction.channel.send({ content: '🎫 **SUPPORT TICKETS**\n\nClick to create a ticket!', components: [btn] });
      return await interaction.reply({ content: '✅ Panel created!', ephemeral: true });
    }

    if (cmd === 'application') {
      const type = interaction.options.getString('type');
      const db = getDatabase();
      const appNum = randomInt(1000, 9999);
      const appChannel = await interaction.guild.channels.create({
        name: `application-${type}-${appNum}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
      });
      const reviewBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`approve_app_${appChannel.id}`).setLabel('✅ Approve').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`deny_app_${appChannel.id}`).setLabel('❌ Deny').setStyle(ButtonStyle.Danger)
      );
      await appChannel.send({ content: `📋 **${type.toUpperCase()} APPLICATION**`, components: [reviewBtn] });
      db.prepare('INSERT INTO applications (channel_id, user_id, guild_id, type, status) VALUES (?, ?, ?, ?, ?)').run(appChannel.id, userId, interaction.guildId, type, 'pending');
      return await interaction.reply({ content: `📋 Application: ${appChannel}`, ephemeral: true });
    }

    if (cmd === 'ban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return await interaction.reply({ content: '❌ No perms!', ephemeral: true });
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason';
      try { await interaction.guild.members.ban(user, { reason }); return await interaction.reply({ content: `✅ **${user.tag}** banned!`, ephemeral: true }); }
      catch (e) { return await interaction.reply({ content: `❌ Failed: ${e.message}`, ephemeral: true }); }
    }

    if (cmd === 'kick') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) return await interaction.reply({ content: '❌ No perms!', ephemeral: true });
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason';
      try { const member = await interaction.guild.members.fetch(user.id); await member.kick(reason); return await interaction.reply({ content: `✅ **${user.tag}** kicked!`, ephemeral: true }); }
      catch (e) { return await interaction.reply({ content: `❌ Failed: ${e.message}`, ephemeral: true }); }
    }

    if (cmd === 'warn') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return await interaction.reply({ content: '❌ No perms!', ephemeral: true });
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason';
      const db = getDatabase();
      db.prepare('INSERT INTO warnings (user_id, guild_id, moderator_id, reason) VALUES (?, ?, ?, ?)').run(user.id, interaction.guildId, userId, reason);
      const warns = db.prepare('SELECT COUNT(*) as count FROM warnings WHERE user_id = ? AND guild_id = ?').get(user.id, interaction.guildId);
      return await interaction.reply({ content: `⚠️ **${user.tag}** warned! (${warns.count})`, ephemeral: true });
    }

    if (cmd === 'timeout') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return await interaction.reply({ content: '❌ No perms!', ephemeral: true });
      const user = interaction.options.getUser('user');
      const duration = parseTime(interaction.options.getString('duration'));
      try { const member = await interaction.guild.members.fetch(user.id); await member.timeout(duration); return await interaction.reply({ content: `🔇 **${user.tag}** timed out!`, ephemeral: true }); }
      catch (e) { return await interaction.reply({ content: `❌ Failed: ${e.message}`, ephemeral: true }); }
    }

    if (cmd === 'clear') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return await interaction.reply({ content: '❌ No perms!', ephemeral: true });
      const amount = interaction.options.getInteger('amount');
      const deleted = await interaction.channel.bulkDelete(amount);
      return await interaction.reply({ content: `🗑️ Deleted **${deleted.size}** messages!`, ephemeral: true });
    }

  } catch (error) {
    logger.error('Command error:', error.message);
    try { await interaction.reply({ embeds: [errorEmbed('Error', error.message)], ephemeral: true }); } catch (e) {}
  }
}
