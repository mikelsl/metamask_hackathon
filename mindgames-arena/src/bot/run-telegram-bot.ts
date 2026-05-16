import 'dotenv/config';
import { DelegatedMindGamesBot } from './DelegatedMindGamesBot.js';

const token = process.env.METAMASK_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Missing METAMASK_TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN');

const bot = new DelegatedMindGamesBot(token);
await bot.launch();

const shutdown = (signal: string) => {
  try {
    bot.stop(signal);
  } finally {
    process.exit(0);
  }
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
