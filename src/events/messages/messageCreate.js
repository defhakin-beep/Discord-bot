import { CONFIG } from '../../config/constants.js';
import { logger } from '../../utils/helpers.js';
import { getDatabase, addUserCoins, addUserXP, setCooldown, getCooldown, getUser } from '../../database/db.js';
import { msToTime, randomInt, getRandomElement } from '../../utils/helpers.js';

export default async function messageCreate(client, message) {
  if (message.author.bot) return;
  try {
    const content = message.content.toLowerCase();
    if (!message.content.startsWith(CONFIG.PREFIX)) return;

    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const userId = message.author.id;

    if (cmd === 'daily') {
      const cooldown = getCooldown(userId, 'daily');
      if (cooldown) return await message.reply(`⏰ Already claimed! Come back in **${msToTime(cooldown)}**`);
      const reward = randomInt(200, 500);
      addUserCoins(userId, reward);
      setCooldown(userId, 'daily', 86400000);
      return await message.reply(`💰 **+${reward}** coins!`);
    }

    if (cmd === 'rob') {
      const target = message.mentions.users.first();
      if (!target) return await message.reply('❌ Mention someone!');
      const targetUser = getUser(target.id);
      if (targetUser.coins < 100) return await message.reply('❌ Target too poor!');
      const stolen = randomInt(50, Math.floor(targetUser.coins * 0.3));
      addUserCoins(target.id, -stolen);
      addUserCoins(userId, stolen);
      return await message.reply(`💰 Robbed **${target.username}** for **${stolen}**!`);
    }

    if (cmd === 'fight') {
      const target = message.mentions.users.first();
      if (!target) return await message.reply('❌ Mention someone!');
      const p1 = randomInt(10, 60);
      const p2 = randomInt(10, 60);
      const winner = p1 > p2 ? message.author : target;
      addUserCoins(winner.id, 100);
      addUserXP(winner.id, 50);
      return await message.reply(`⚔️ **${message.author.username}** (${p1}) vs **${target.username}** (${p2})\n🏆 **${winner.username}** wins!`);
    }

    if (cmd === 'gamble') {
      const amount = parseInt(args[0]) || 100;
      const user = getUser(userId);
      if (user.coins < amount) return await message.reply('❌ Not enough!');
      if (Math.random() > 0.5) { addUserCoins(userId, amount); return await message.reply(`🎰 **YOU WON! +${amount}**`); }
      else { addUserCoins(userId, -amount); return await message.reply(`🎰 **YOU LOST! -${amount}**`); }
    }

    const anime = { domain: '**Infinity Domain!** 🌌', bankai: '**BANKAI!!!!** ⚔️', gear5: '**GEAR 5!** 🎪', ragebait: '**RAGEBAIT!** 🎣', sharingan: '**Sharingan!** 👁️' };
    if (anime[cmd]) { addUserXP(userId, 25); return await message.reply(anime[cmd]); }

    if (cmd === 'ban') return await message.reply(`🎣 [BANNING...]\n✅ **${message.mentions.users.first()?.username || 'someone'} banned!** 💀`);
    if (cmd === 'kick') return await message.reply(`🎣 [KICKING...]\n✅ **${message.mentions.users.first()?.username || 'someone'} kicked!** 🦶`);
    if (cmd === 'hack') return await message.reply(`🎣 [HACKING...]\n❌ **Permission denied!** 🚔`);
    if (cmd === 'ratio') return await message.reply(`📊 **0 likes | 1000 ratio\'d** 💀`);
    if (cmd === 'expose') return await message.reply(`🎣 **${message.author.username} exposed!** 🔥`);
    if (cmd === 'rizz') return await message.reply(`🎣 **Rizz: ${randomInt(0, 10)}/10**`);
    if (cmd === 'sigma') return await message.reply(`⚡ **SIGMA DETECTED** 👑`);

  } catch (error) {
    logger.error('Message error:', error.message);
  }
}
