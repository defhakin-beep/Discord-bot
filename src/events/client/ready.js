import { REST, Routes, ActivityType } from 'discord.js';
import { logger } from '../../utils/helpers.js';

export default async function ready(client) {
  try {
    logger.success(`✅ Bot online as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    const commands = [
      { name: 'ping', description: 'Check bot latency', type: 1 },
      { name: 'help', description: 'View all commands', type: 1 },
      { name: 'balance', description: 'Check your coin balance', type: 1 },
      { name: 'rank', description: 'Check your level', type: 1 },
      { name: 'profile', description: 'View your profile', type: 1 },
      { name: 'shop', description: 'View the shop', type: 1 },
      { name: 'inventory', description: 'View your inventory', type: 1 },
      { name: 'leaderboard', description: 'View top players', type: 1 },
      { name: 'pet', description: 'View your pet', type: 1 },
      { name: 'adopt', description: 'Adopt a pet', type: 1 },
      { name: 'feed', description: 'Feed your pet', type: 1 },
      { name: 'fnf', description: 'Play FNF', type: 1, options: [{ name: 'difficulty', description: 'Difficulty', type: 3, required: true, choices: [{ name: 'Easy', value: 'easy' }, { name: 'Medium', value: 'medium' }, { name: 'Hard', value: 'hard' }, { name: 'Erect', value: 'erect' }, { name: 'Nightmare', value: 'nightmare' }] }] },
      { name: 'wordle', description: 'Play Wordle', type: 1, options: [{ name: 'guess', description: '5-letter word', type: 3, min_length: 5, max_length: 5, required: true }] },
      { name: 'blackjack', description: 'Play Blackjack', type: 1, options: [{ name: 'bet', description: 'Bet amount', type: 4, min_value: 10, required: true }] },
      { name: 'slots', description: 'Play Slots', type: 1, options: [{ name: 'bet', description: 'Bet amount', type: 4, min_value: 10, required: true }] },
      { name: 'mines', description: 'Play Mines', type: 1, options: [{ name: 'bet', description: 'Bet amount', type: 4, min_value: 10, required: true }] },
      { name: 'trivia', description: 'Answer trivia', type: 1 },
      { name: 'coinflip', description: 'Flip a coin', type: 1, options: [{ name: 'bet', description: 'Bet amount', type: 4, min_value: 10, required: true }] },
      { name: 'roulette', description: 'Play roulette', type: 1, options: [{ name: 'bet', description: 'Bet amount', type: 4, min_value: 10, required: true }] },
      { name: 'ticket', description: 'Create a ticket', type: 1, options: [{ name: 'category', description: 'Category', type: 3, required: true, choices: [{ name: 'Support', value: 'support' }, { name: 'Report', value: 'report' }, { name: 'Appeal', value: 'appeal' }] }] },
      { name: 'ticketpanel', description: 'Create ticket panel', type: 1 },
      { name: 'application', description: 'Apply for something', type: 1, options: [{ name: 'type', description: 'Type', type: 3, required: true, choices: [{ name: 'Staff', value: 'staff' }, { name: 'Partner', value: 'partner' }] }] },
      { name: 'ban', description: 'Ban user', type: 1, options: [{ name: 'user', description: 'User to ban', type: 6, required: true }, { name: 'reason', description: 'Reason', type: 3, required: false }] },
      { name: 'kick', description: 'Kick user', type: 1, options: [{ name: 'user', description: 'User to kick', type: 6, required: true }, { name: 'reason', description: 'Reason', type: 3, required: false }] },
      { name: 'warn', description: 'Warn user', type: 1, options: [{ name: 'user', description: 'User to warn', type: 6, required: true }, { name: 'reason', description: 'Reason', type: 3, required: false }] },
      { name: 'timeout', description: 'Timeout user', type: 1, options: [{ name: 'user', description: 'User', type: 6, required: true }, { name: 'duration', description: 'Duration (1h, 30m)', type: 3, required: true }] },
      { name: 'clear', description: 'Clear messages', type: 1, options: [{ name: 'amount', description: 'Amount', type: 4, min_value: 1, max_value: 100, required: true }] },
    ];

    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    logger.success(`✅ Registered ${commands.length} commands`);

    client.user.setActivity('you get ratio\'d 💀', { type: ActivityType.Watching });

    for (const guild of client.guilds.cache.values()) {
      try {
        const channel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased());
        if (channel?.permissionsFor(guild.members.me)?.has('SendMessages')) {
          await channel.send('🤖 **Bot v3.0 MEGA ONLINE!**\n✅ FNF • Games • Economy • Tickets • Applications • Moderation').catch(() => {});
        }
      } catch (e) {}
    }
  } catch (error) {
    logger.error('Ready error:', error.message);
  }
}
