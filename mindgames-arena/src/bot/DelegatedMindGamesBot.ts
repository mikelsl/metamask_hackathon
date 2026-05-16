import { Markup, Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ethers } from 'ethers';
import QRCode from 'qrcode';
import { WerewolfEngine } from '../engine/WerewolfEngine.js';
import { QueuedHumanActionProvider } from '../engine/QueuedHumanActionProvider.js';
import { createComputeAdapter } from '../compute/createComputeAdapter.js';
import { createStorageAdapter } from '../storage/createStorageAdapter.js';
import type { StorageAdapter } from '../storage/StorageAdapter.js';
import type { DelegatedActionAdapter, DelegatedActionRecord } from '../chain/DelegatedActionAdapter.js';
import { createDelegatedActionAdapter } from '../chain/createDelegatedActionAdapter.js';
import { persistGameArtifacts } from '../pipeline/persistGameArtifacts.js';
import { writeLocalShadowArtifact } from '../pipeline/writeLocalShadowArtifacts.js';
import { updateGameIndex } from '../web/gameIndex.js';
import type { GameEvent, GameState, Player } from '../types/game.js';
import { shuffle } from '../utils/random.js';

type WagerMode = 'off' | 'demo' | 'self';

interface WagerParticipant {
  playerId: string;
  label: string;
  address: string;
  wallet?: ethers.Wallet;
  chainId?: string;
  chainName?: string;
  nativeSymbol?: string;
  vaultAddress?: string;
  explorerTxBase?: string;
  explorerAddressBase?: string;
}

interface WagerTx {
  label: string;
  address: string;
  txHash: string;
  chainId?: string;
  chainName?: string;
  nativeSymbol?: string;
  explorerTxBase?: string;
  explorerAddressBase?: string;
  vaultAddress?: string;
  claimUrl?: string;
}

interface WagerSession {
  enabled: boolean;
  mode: WagerMode;
  chainId: string;
  chainName: string;
  nativeSymbol: string;
  explorerTxBase: string;
  explorerAddressBase: string;
  gameKey: string;
  vaultAddress: string;
  bondAmount: string;
  participants: WagerParticipant[];
  fundTxs: WagerTx[];
  depositTxs: WagerTx[];
  depositUrl?: string;
  crossChainDemo?: boolean;
  settlementChains?: Array<Pick<WagerChainConfig, 'id' | 'name' | 'nativeSymbol' | 'vaultAddress' | 'explorerTxBase' | 'explorerAddressBase'>>;
}

interface WagerSettlementLeg {
  chainId: string;
  chainName: string;
  nativeSymbol: string;
  totalBond: string;
  winnerLabels: string[];
  settleTxHash: string;
  explorerTxBase: string;
  explorerAddressBase: string;
  vaultAddress: string;
}

interface WagerSettlementResult {
  totalBondMnt: string;
  winnerLabels: string[];
  settleTxHash: string;
  claimTxs: WagerTx[];
  settlementLegs?: WagerSettlementLeg[];
  notes?: string[];
}

interface RoomSession {
  chatId: number | string;
  gameId: string;
  players: Array<Omit<Player, 'role' | 'alive'>>;
  state?: GameState;
  humans: QueuedHumanActionProvider;
  running: boolean;
  wagerMode: WagerMode;
  wagerChainId: string;
  selfWalletAddress?: string;
  wager?: WagerSession;
}

interface WagerChainConfig {
  id: string;
  key: string;
  name: string;
  nativeSymbol: string;
  rpcUrl: string;
  vaultAddress: string;
  operatorPrivateKey?: string;
  explorerTxBase: string;
  explorerAddressBase: string;
  chainParam: {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: 18 };
    rpcUrls: string[];
    blockExplorerUrls: string[];
  };
}

const DEFAULT_AGENT_PLAYERS: Array<Omit<Player, 'role' | 'alive'>> = [
  { id: 'a1', displayName: 'Ada', kind: 'agent', agentPersonaId: 'analyst' },
  { id: 'a2', displayName: 'Charm', kind: 'agent', agentPersonaId: 'charmer' },
  { id: 'a3', displayName: 'Riot', kind: 'agent', agentPersonaId: 'chaos-wolf' },
  { id: 'a4', displayName: 'Shade', kind: 'agent', agentPersonaId: 'silent-killer' },
  { id: 'a5', displayName: 'Mira', kind: 'agent', agentPersonaId: 'empath' },
  { id: 'a6', displayName: 'Blaze', kind: 'agent', agentPersonaId: 'overconfident-leader' },
  { id: 'a7', displayName: 'Echo', kind: 'agent', agentPersonaId: 'analyst' }
];

export class DelegatedMindGamesBot {
  private readonly bot: Telegraf;
  private readonly rooms = new Map<string, RoomSession>();
  private readonly userChats = new Map<string, number>();

  constructor(token: string) {
    this.bot = new Telegraf(token);
    this.registerHandlers();
  }

  async launch(): Promise<void> {
    await this.bot.launch();
    console.log('Delegated MindGames Telegram bot launched.');
  }

  stop(reason = 'shutdown'): void {
    this.bot.stop(reason);
  }

  private registerHandlers(): void {
    this.bot.use(async (ctx, next) => {
      const text = ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string' ? ctx.message.text : undefined;
      if (text?.startsWith('/')) {
        console.log(JSON.stringify({
          marker: 'delegated-telegram-inbound',
          command: text.split(/\s+/)[0],
          chatType: ctx.chat?.type,
          chatId: ctx.chat?.id,
          fromId: ctx.from?.id,
          ts: new Date().toISOString()
        }));
      }
      if (ctx.from && ctx.chat?.type === 'private') {
        this.userChats.set(`u${ctx.from.id}`, ctx.chat.id);
      }
      return next();
    });

    this.bot.start(async (ctx) => {
      await this.replyHtml(ctx, this.helpText());
    });

    this.bot.command('help', async (ctx) => this.replyHtml(ctx, this.helpText()));

    this.bot.command('newgame', async (ctx) => {
      const chatId = this.chatKey(ctx);
      const gameId = `tg-${Date.now()}`;
      const room: RoomSession = {
        chatId: ctx.chat?.id ?? chatId,
        gameId,
        players: [],
        humans: new QueuedHumanActionProvider(),
        running: false,
        wagerMode: this.defaultWagerMode(),
        wagerChainId: this.defaultWagerChain().id
      };
      this.rooms.set(chatId, room);
      const wagerChain = this.getWagerChain(room.wagerChainId);
      await this.replyHtml(ctx, [
        `✅ <b>Room created</b>` ,
        `<code>${this.escapeHtml(gameId)}</code>`,
        '',
        `<b>Next steps for judges</b>`,
        `1. Choose chain: <code>/wagerchain arbitrum</code> or <code>/wagerchain mantle</code>.`,
        `2. Fast chain test: <code>/wagerdemo</code> lets demo wallets post all bonds directly.`,
        `3. User-paid test: <code>/wagerself</code> + <code>/wallet 0xYourAddress</code> gives you a MetaMask deposit page.`,
        `4. Send <code>/join</code> to take the human seat, then <code>/startgame</code>.`,
        `5. During the game, follow the bot prompts: use inline buttons, or <code>/say</code>, <code>/vote</code>, <code>/kill</code>, <code>/check</code>.`,
        `6. After the game, claim on the same chain you selected for the wager.`,
        '',
        `🦊 <b>MetaMask / 1Shot demo mode</b>`,
        `Default wager mode is <b>${this.escapeHtml(this.defaultWagerMode())}</b> for a fast judge walkthrough.`,
        `Wager chain: <b>${this.escapeHtml(wagerChain.name)}</b>. Choose <code>/wagerchain mantle</code> or <code>/wagerchain arbitrum</code> before <code>/startgame</code>.`,
        `The project now has deployed settlement vaults on Base Sepolia, Arbitrum Sepolia, and OP Sepolia; 1Shot remains in mock/trace mode until Sepolia relayer capabilities are available.`,
        `Legacy Mantle wager commands still exist for internal testing, but judges should use the fast path below.`,
        '',
        `Tip: DM <code>/start</code> to this bot first so private role and night-action prompts can reach you.`
      ].join('\n'));
    });

    this.bot.command('join', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      if (room.running) return ctx.reply('Game already running.');
      const from = ctx.from;
      if (!from) return ctx.reply('Cannot identify user.');
      const id = `u${from.id}`;
      if (room.players.some((p) => p.id === id)) return ctx.reply('You already joined.');
      if (room.players.length >= 8) return ctx.reply('Room is full.');
      room.players.push({ id, displayName: from.first_name ?? from.username ?? id, kind: 'human' });
      await this.replyHtml(ctx, `✅ <b>Joined:</b> ${this.escapeHtml(from.first_name ?? from.username ?? id)}\nHumans: <b>${room.players.length}</b>\n\nWhen ready, send <code>/startgame</code>. The bot will add AI agents automatically.`);
    });

    this.bot.command('wagerchain', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      if (room.running) return ctx.reply('Game already running. Wager chain cannot be changed now.');
      const chain = this.resolveWagerChain(this.commandPayload(ctx));
      if (!chain) {
        return this.replyHtml(ctx, [
          'Usage: <code>/wagerchain mantle</code> or <code>/wagerchain arbitrum</code>',
          '',
          '<b>Available testnet wager chains</b>',
          `• <code>mantle</code> — ${this.escapeHtml(this.getWagerChain('5003').name)}`,
          `• <code>arbitrum</code> — ${this.escapeHtml(this.getWagerChain('421614').name)}`
        ].join('\n'));
      }
      room.wagerChainId = chain.id;
      await this.replyHtml(ctx, `✅ <b>Wager chain selected:</b> ${this.escapeHtml(chain.name)}\nBond token: <b>${this.escapeHtml(chain.nativeSymbol)}</b>\nClaim links will default to this same chain after settlement.`);
    });

    this.bot.command('wageroff', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      if (room.running) return ctx.reply('Game already running. Wager mode cannot be changed now.');
      room.wagerMode = 'off';
      await this.replyHtml(ctx, '✅ <b>Wager mode: OFF</b>\nYou can still play the game and get delegated action-audit links at the end. Send <code>/startgame</code> when ready.');
    });

    this.bot.command('wagerdemo', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      if (room.running) return ctx.reply('Game already running. Wager mode cannot be changed now.');
      room.wagerMode = 'demo';
      const humanChain = this.getWagerChain('421614');
      const agentChain = this.getWagerChain('5003');
      await this.replyHtml(ctx, [
        '✅ <b>Wager mode: DEMO-SPONSORED CROSS-CHAIN</b>',
        `Human seat bond: <b>${this.escapeHtml(humanChain.name)}</b>`,
        `AI-agent bonds: <b>${this.escapeHtml(agentChain.name)}</b>`,
        `Bond: <b>${this.escapeHtml(this.wagerBondAmount())}</b> native test token per seat`,
        '',
        'The operator/demo wallets post the bonds, but they are intentionally split across chains so the final message can show a 1Shot-style cross-chain settlement coordination trace.',
        'Agent gas top-up is skipped by default because the demo agent wallets are already funded on Mantle Sepolia; this keeps the judge flow fast and avoids long polling timeouts.',
        'Current public Sepolia relayer support is limited, so this is still a testnet execution + 1Shot trace rather than a production cross-chain value bridge.',
        '',
        'Send <code>/startgame</code> when ready.'
      ].join('\n'));
    });

    this.bot.command('wagerself', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      if (room.running) return ctx.reply('Game already running. Wager mode cannot be changed now.');
      room.wagerMode = 'self';
      const chain = this.getWagerChain(room.wagerChainId);
      await this.replyHtml(ctx, [
        '✅ <b>Wager mode: SELF-WALLET</b>',
        `Chain: <b>${this.escapeHtml(chain.name)}</b>`,
        `You post your own <b>${this.escapeHtml(this.wagerBondAmount())} ${this.escapeHtml(chain.nativeSymbol)}</b> testnet performance bond from MetaMask.`,
        'Next: send <code>/wallet 0xYourAddress</code>.',
        'Then <code>/startgame</code> will give you a browser payment link and wait until the deposit is seen on-chain.'
      ].join('\n'));
    });

    this.bot.command('wallet', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      if (room.running) return ctx.reply('Game already running. Wallet cannot be changed now.');
      const address = this.commandPayload(ctx).trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return this.replyHtml(ctx, 'Usage: <code>/wallet 0xYourAddress</code>');
      room.selfWalletAddress = ethers.getAddress(address);
      await this.replyHtml(ctx, `✅ <b>Self-wallet saved</b>\n${this.addressLink(room.selfWalletAddress)}\n\nNow send <code>/startgame</code>.`);
    });

    this.bot.command('status', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      const pending = room.humans.listPending();
      await ctx.reply(JSON.stringify({
        gameId: room.gameId,
        running: room.running,
        wagerMode: room.wagerMode,
        wagerChain: this.getWagerChain(room.wagerChainId).name,
        selfWalletAddress: room.selfWalletAddress,
        players: room.state?.players.map((p) => ({ id: p.id, name: p.displayName, alive: p.alive, kind: p.kind })) ?? room.players,
        pending
      }, null, 2));
    });

    const abortHandler = async (ctx: Context) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      room.humans.abortAll?.('Game aborted by user command');
      room.running = false;
      this.rooms.delete(this.chatKey(ctx));
      await ctx.reply(`Game ${room.gameId} aborted. Use /newgame to start fresh.`);
    };

    this.bot.command('abortgame', abortHandler);
    this.bot.command('endgame', abortHandler);

    this.bot.command('startgame', async (ctx) => {
      const chatId = this.chatKey(ctx);
      const room = this.requireRoom(ctx);
      if (!room) return;
      if (room.running) return ctx.reply('Game already running.');
      if (room.players.length < 1) return ctx.reply('At least one human should /join before starting.');

      const players = shuffle([...room.players, ...DEFAULT_AGENT_PLAYERS].slice(0, 8));
      const compute = createComputeAdapter();
      const engine = new WerewolfEngine(compute, room.humans);
      const storage = createStorageAdapter();
      const chain = createDelegatedActionAdapter();
      room.running = true;
      room.state = engine.createGame(room.gameId, players);

      if (room.wagerMode !== 'off') {
        if (room.wagerMode === 'demo' && !this.telegramWagerAllowed(ctx)) {
          room.running = false;
          await this.replyHtml(ctx, [
            '🔒 <b>Live wager mode is restricted</b>',
            'This chat is not allowlisted for live wager setup.',
            'Use <code>/wageroff</code> to play without wager, or ask the operator to allowlist this chat.'
          ].join('\n'));
          return;
        }
        await this.replyHtml(ctx, [
          '💰 <b>Preparing performance bonds</b>',
          `Mode: <b>${this.escapeHtml(room.wagerMode)}</b>`,
          `Chain: <b>${this.escapeHtml(this.getWagerChain(room.wagerChainId).name)}</b>`,
          `Game: <code>${this.escapeHtml(room.gameId)}</code>`,
          `Bond: <b>${this.escapeHtml(this.wagerBondAmount())} ${this.escapeHtml(this.getWagerChain(room.wagerChainId).nativeSymbol)}</b> per seat`,
          '',
          room.wagerMode === 'self'
            ? `You will pay your own human-seat bond from MetaMask. The bot will wait until the deposit is visible on ${this.escapeHtml(this.getWagerChain(room.wagerChainId).name)}.`
            : 'The demo operator wallets will post the human bond on Arbitrum Sepolia and all AI-agent bonds on Mantle Sepolia. This intentionally creates a cross-chain settlement trace for the 1Shot demo.'
        ].join('\n'));
        if (room.wagerMode === 'self') {
          void this.prepareAndStartGame(ctx, room, engine, storage, chain, players, chatId).catch((error) => {
            room.running = false;
            this.rooms.delete(chatId);
            console.error(error);
            void this.replyHtml(ctx, `❌ <b>Wager setup failed</b>\n${this.escapeHtml(error instanceof Error ? error.message : String(error))}\n\nUse <code>/newgame</code> to try again, or use <code>/wageroff</code> for no-wager mode.`).catch(() => undefined);
          });
          return;
        }
        void (async () => {
          try {
            room.wager = await this.prepareDemoWager(room);
            await this.announceAndRunGame(ctx, room, engine, storage, chain, players);
          } catch (error) {
            room.running = false;
            this.rooms.delete(chatId);
            console.error(error);
            await this.replyHtml(ctx, `❌ <b>Wager setup failed</b>\n${this.escapeHtml(error instanceof Error ? error.message : String(error))}\n\nUse <code>/newgame</code> to try again, or use <code>/wageroff</code> for no-wager mode.`).catch(() => undefined);
          }
        })();
        return;
      }

      await this.announceAndRunGame(ctx, room, engine, storage, chain, players);
    });

    this.bot.command('say', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      const from = ctx.from;
      if (!from) return;
      const text = this.commandPayload(ctx);
      if (!text) return this.replyHtml(ctx, 'Usage: <code>/say your public speech</code>');
      const ok = room.humans.submitSpeech(`u${from.id}`, `${from.first_name ?? from.username}: ${text}`);
      await this.replyHtml(ctx, ok ? '✅ <b>Speech submitted.</b>\nWaiting for the rest of the table...' : 'No pending speech request for you.');
    });

    this.bot.command('vote', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      const from = ctx.from;
      if (!from) return;
      const target = this.commandPayload(ctx).trim();
      if (!target) return this.replyHtml(ctx, 'Usage: <code>/vote &lt;playerId&gt;</code>');
      const ok = room.humans.submitVote(`u${from.id}`, target);
      await this.replyHtml(ctx, ok ? `✅ <b>Vote submitted</b>\nTarget: <b>${this.escapeHtml(this.playerName(room, target))}</b>` : 'No pending vote request for you.');
    });

    this.bot.command('kill', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      const from = ctx.from;
      if (!from) return;
      const target = this.commandPayload(ctx).trim();
      if (!target) return this.replyHtml(ctx, 'Usage: <code>/kill &lt;playerId&gt;</code>');
      const ok = room.humans.submitNightKill(`u${from.id}`, target);
      await this.replyHtml(ctx, ok ? `✅ <b>Night kill submitted</b>\nTarget: <b>${this.escapeHtml(this.playerName(room, target))}</b>` : 'No pending night kill request for you.');
    });

    this.bot.command('check', async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      const from = ctx.from;
      if (!from) return;
      const target = this.commandPayload(ctx).trim();
      if (!target) return this.replyHtml(ctx, 'Usage: <code>/check &lt;playerId&gt;</code>');
      const ok = room.humans.submitSeerCheck(`u${from.id}`, target);
      await this.replyHtml(ctx, ok ? `✅ <b>Seer check submitted</b>\nTarget: <b>${this.escapeHtml(this.playerName(room, target))}</b>` : 'No pending seer check request for you.');
    });

    this.bot.action(/^mg:(vote|kill|check):(.+)$/, async (ctx) => {
      const room = this.requireRoom(ctx);
      if (!room) return;
      const from = ctx.from;
      if (!from) return;
      const action = ctx.match[1];
      const targetId = ctx.match[2];
      const playerId = `u${from.id}`;
      const ok = action === 'vote'
        ? room.humans.submitVote(playerId, targetId)
        : action === 'kill'
          ? room.humans.submitNightKill(playerId, targetId)
          : room.humans.submitSeerCheck(playerId, targetId);
      await ctx.answerCbQuery(ok ? `${action} submitted: ${this.playerName(room, targetId)}` : `No pending ${action} request for you.`);
      if (ok) {
        await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
        await this.replyHtml(ctx, `✅ <b>${this.escapeHtml(action)} submitted</b>\nTarget: <b>${this.escapeHtml(this.playerName(room, targetId))}</b>`);
      }
    });
  }

  private async prepareAndStartGame(
    ctx: Context,
    room: RoomSession,
    engine: WerewolfEngine,
    storage: StorageAdapter,
    chain: DelegatedActionAdapter,
    players: Array<Omit<Player, 'role' | 'alive'>>,
    _chatId: string
  ): Promise<void> {
    room.wager = await this.prepareSelfWalletWager(ctx, room);
    await this.announceAndRunGame(ctx, room, engine, storage, chain, players);
  }

  private async announceAndRunGame(
    ctx: Context,
    room: RoomSession,
    engine: WerewolfEngine,
    storage: StorageAdapter,
    chain: DelegatedActionAdapter,
    players: Array<Omit<Player, 'role' | 'alive'>>
  ): Promise<void> {
    await this.replyHtml(ctx, [
      `🎮 <b>Game started</b>` ,
      `<code>${this.escapeHtml(room.gameId)}</code>`,
      '',
      `🎲 <b>Seat order this game</b>`,
      this.formatPublicPlayerList(players),
      '',
      room.wager ? this.formatWagerStart(room.wager) : '💰 <b>Wager mode</b>: off for this room.',
      '',
      `🔒 <b>Private role messages have been sent.</b>`,
      `🌙 Night phase will begin immediately.`
    ].join('\n'));
    await this.sendPrivateRoleNotices(room);
    this.runGame(ctx, room, engine, storage, chain).catch(async (err) => {
      room.running = false;
      console.error(err);
      await ctx.reply(`Game failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  private async runGame(
    ctx: Context,
    room: RoomSession,
    engine: WerewolfEngine,
    storage: StorageAdapter,
    chain: DelegatedActionAdapter
  ): Promise<void> {
    if (!room.state) throw new Error('Room state missing');

    let announcedEvents = 0;
    const flushPublicEvents = async () => {
      if (!room.state) return;
      const nextEvents = room.state.events.slice(announcedEvents);
      announcedEvents = room.state.events.length;
      for (const event of nextEvents) {
        if ((event.type === 'wolf_council_proposal' || event.type === 'wolf_council_decision') && event.privateNote) {
          await this.notifyWolfTeam(room, `🐺 <b>Wolf council</b>\n${this.escapeHtml(event.privateNote)}`).catch(() => undefined);
        }
        if (event.publicText) {
          await this.replyHtml(ctx, this.formatPublicEvent(room, event)).catch(() => undefined);
        } else if (event.type === 'seer_check' && event.actorId && event.privateNote) {
          await this.notifyHuman(
            ctx,
            event.actorId,
            `🔮 <b>Seer result</b>\n${this.escapeHtml(event.privateNote)}`,
            undefined,
            true
          ).catch(() => undefined);
        }
      }
    };

    const reminderMs = Number(process.env.HUMAN_PENDING_REMINDER_MS ?? 60000);
    const notifier = setInterval(() => {
      const pending = room.humans.listPending();
      for (const req of pending) {
        const secondsLeft = Math.max(0, Math.ceil((req.timeoutAt - Date.now()) / 1000));
        const suffix = `\n\n⏳ Timeout fallback in ~<b>${secondsLeft}s</b>.`;
        const alivePlayers = room.state?.players.filter((p) => p.alive) ?? [];
        const alive = this.formatPublicPlayerList(alivePlayers);
        const nonWolves = this.formatPublicPlayerList(room.state?.players.filter((p) => p.alive && p.role !== 'wolf') ?? []);
        const voteTargets = req.allowedTargetIds?.length
          ? this.formatPublicPlayerList(room.state?.players.filter((p) => req.allowedTargetIds?.includes(p.id)) ?? [])
          : alive;
        const msg = req.type === 'speech'
          ? `🗣 <b>${this.escapeHtml(req.playerName)}</b>\n\nIt is your turn to speak.\nUse <code>/say &lt;message&gt;</code>.${suffix}`
          : req.type === 'vote'
            ? `🗳 <b>${this.escapeHtml(req.playerName)}</b>\n\nVote now.\nTap a button or use <code>/vote &lt;playerId&gt;</code>.\n\n<b>Legal vote targets</b>\n${voteTargets}${suffix}`
            : req.type === 'nightKill'
              ? `🐺 <b>${this.escapeHtml(req.playerName)}</b> · 🐺 <b>Wolf</b>\n\nNight action: choose a kill target.\nTap a button or use <code>/kill &lt;playerId&gt;</code>.\n\n<b>Legal targets</b>\n${nonWolves}${suffix}`
              : `🔮 <b>${this.escapeHtml(req.playerName)}</b> · 🔮 <b>Seer</b>\n\nNight action: inspect one player.\nTap a button or use <code>/check &lt;playerId&gt;</code>.\n\n<b>Alive players</b>\n${alive}${suffix}`;
        void this.notifyHuman(ctx, req.playerId, msg, this.keyboardForRequest(room, req.type, req.playerId, req.allowedTargetIds), req.type === 'nightKill' || req.type === 'seerCheck').catch(() => undefined);
      }
    }, reminderMs);

    const broadcaster = setInterval(() => {
      void flushPublicEvents();
    }, 1000);

    try {
      const { state, summary } = await engine.runToEnd(room.state, Number(process.env.DEMO_MAX_ROUNDS ?? 3));
      await flushPublicEvents();
      await writeLocalShadowArtifact(`${room.gameId}/transcript.json`, state.events);
      await writeLocalShadowArtifact(`${room.gameId}/summary.raw.json`, summary);
      if (summary.agentMemories) await writeLocalShadowArtifact('latest-agent-memories.json', summary.agentMemories);
      const rawTranscriptArtifact = await storage.putJson(`${room.gameId}/transcript.json`, state.events);
      const rawSummaryArtifact = await storage.putJson(`${room.gameId}/summary.raw.json`, summary);
      const chainRecord = await chain.finalizeGame(state, summary, rawTranscriptArtifact.root, rawSummaryArtifact.root);
      console.log(JSON.stringify({
        marker: 'delegated-telegram-game-finalized',
        gameId: room.gameId,
        winner: summary.winner,
        eventCount: state.events.length,
        txHash: chainRecord.txHash,
        actionRegistryAddress: chainRecord.actionRegistryAddress,
        ts: new Date().toISOString()
      }));
      // Chain finalization uses the same wallet as Storage in Mantle demos. Recreate the
      // storage adapter after chain txs so the next Storage batch starts from the
      // fresh pending nonce instead of the pre-chain local nonce cursor.
      const postChainStorage = createStorageAdapter();
      const persisted = await persistGameArtifacts(postChainStorage, state, summary, chainRecord, {
        manifestPath: `artifacts/${room.gameId}/replay-manifest.json`,
        latestManifestPath: process.env.TELEGRAM_UPDATE_LATEST_REPLAY === '1' ? 'web/data/latest-demo.json' : undefined,
        engine: this.engineLabel(),
        rawTranscriptArtifact,
        rawSummaryArtifact
      });
      const wagerResult = room.wager ? await this.settleWager(room, summary.winner, rawSummaryArtifact.root) : undefined;
      await this.publishToWeb(room.gameId, summary.winner, state.events.length, chainRecord.actionRegistryAddress);
      await this.replyHtml(ctx, this.formatFinalResult({
        room,
        summaryWinner: summary.winner,
        eventCount: state.events.length,
        chainRecord,
        publicTranscriptRoot: persisted.publicTranscriptArtifact.root,
        privateAuditRoot: persisted.privateAuditTranscriptArtifact.root,
        summaryRoot: persisted.summaryArtifact.root,
        wagerResult
      }));
    } finally {
      clearInterval(notifier);
      clearInterval(broadcaster);
      room.running = false;
      this.rooms.delete(String(room.chatId));
    }
  }

  private async prepareDemoWager(room: RoomSession): Promise<WagerSession> {
    if (!room.state) throw new Error('Room state missing');
    // Demo mode is intentionally cross-chain for the MetaMask / 1Shot story:
    // human-seat bond on Arbitrum Sepolia, AI-agent bonds on Mantle Sepolia.
    // Public Sepolia 1Shot support is still limited, so settlement is executed as
    // per-chain testnet txs plus a clear 1Shot-style coordination trace in chat.
    const humanChain = this.getWagerChain('421614');
    const agentChain = this.getWagerChain('5003');
    if (!humanChain.vaultAddress) throw new Error(`Missing settlement vault address for ${humanChain.name}`);
    if (!agentChain.vaultAddress) throw new Error(`Missing settlement vault address for ${agentChain.name}`);
    const humanOperatorKey = this.operatorKeyForChain(humanChain) || process.env.HUMAN_WALLET_PRIVATE_KEY;
    const agentOperatorKey = this.operatorKeyForChain(agentChain) || process.env.HUMAN_WALLET_PRIVATE_KEY;
    if (!humanOperatorKey) throw new Error(`Missing operator private key for ${humanChain.name}`);
    if (!agentOperatorKey) throw new Error(`Missing operator private key for ${agentChain.name}`);
    const agentKeys = (process.env.AGENT_WALLET_PRIVATE_KEYS || '').split(',').map((item) => item.trim()).filter(Boolean);
    if (agentKeys.length < DEFAULT_AGENT_PLAYERS.length) throw new Error(`Need ${DEFAULT_AGENT_PLAYERS.length} AGENT_WALLET_PRIVATE_KEYS for Telegram wager mode`);

    const humanProvider = new ethers.JsonRpcProvider(humanChain.rpcUrl, Number(humanChain.id));
    const agentProvider = new ethers.JsonRpcProvider(agentChain.rpcUrl, Number(agentChain.id));
    const humanOperator = new ethers.Wallet(humanOperatorKey, humanProvider);
    const agentOperator = new ethers.Wallet(agentOperatorKey, agentProvider);
    const artifact = await this.loadSettlementVaultArtifact();
    const humanVault = new ethers.Contract(humanChain.vaultAddress, artifact.abi, humanOperator);
    const agentVault = new ethers.Contract(agentChain.vaultAddress, artifact.abi, agentOperator);
    const gameKey = ethers.id(`delegated-mindgames:game:${room.gameId}`);
    const bondAmount = this.wagerBondAmount();
    const bond = ethers.parseEther(bondAmount);
    const minAgentGas = ethers.parseEther(process.env.TELEGRAM_WAGER_MIN_AGENT_GAS_MNT || process.env.MIN_AGENT_GAS_MNT || '0.02');
    const fundAmount = ethers.parseEther(process.env.TELEGRAM_WAGER_AGENT_FUND_MNT || process.env.AGENT_FUND_MNT || '0.03');

    const agentWalletById = new Map(DEFAULT_AGENT_PLAYERS.map((player, index) => [player.id, new ethers.Wallet(agentKeys[index], agentProvider)]));
    const participants: WagerParticipant[] = room.state.players.map((player) => {
      const wallet = player.kind === 'human' ? humanOperator : agentWalletById.get(player.id);
      if (!wallet) throw new Error(`Missing wager wallet for ${player.id}`);
      const chain = player.kind === 'human' ? humanChain : agentChain;
      return {
        playerId: player.id,
        label: player.displayName,
        address: wallet.address,
        wallet,
        chainId: chain.id,
        chainName: chain.name,
        nativeSymbol: chain.nativeSymbol,
        vaultAddress: chain.vaultAddress,
        explorerTxBase: chain.explorerTxBase,
        explorerAddressBase: chain.explorerAddressBase
      };
    });

    const fundTxs: WagerTx[] = [];
    const skipAgentGasTopup = !['0', 'false', 'no', 'off'].includes((process.env.TELEGRAM_WAGER_SKIP_AGENT_GAS_TOPUP ?? '1').trim().toLowerCase());
    if (!skipAgentGasTopup) {
      for (const participant of participants.filter((item) => item.wallet && item.chainId === agentChain.id && item.wallet.address !== agentOperator.address)) {
        const wallet = participant.wallet!;
        const balance = await agentProvider.getBalance(wallet.address);
        if (balance < minAgentGas) {
          const tx = await agentOperator.sendTransaction({ to: wallet.address, value: fundAmount });
          await tx.wait();
          fundTxs.push({ label: participant.label, address: participant.address, txHash: tx.hash, chainId: agentChain.id, chainName: agentChain.name, nativeSymbol: agentChain.nativeSymbol, explorerTxBase: agentChain.explorerTxBase, explorerAddressBase: agentChain.explorerAddressBase, vaultAddress: agentChain.vaultAddress });
        }
      }
    }

    const depositTxs: WagerTx[] = [];
    for (const participant of participants) {
      if (!participant.wallet) throw new Error(`Missing signing wallet for ${participant.label}`);
      const chain = participant.chainId === humanChain.id ? humanChain : agentChain;
      const vault = participant.chainId === humanChain.id ? humanVault : agentVault;
      const tx = await (vault.connect(participant.wallet) as ethers.Contract).depositBond(gameKey, { value: bond });
      await tx.wait();
      depositTxs.push({ label: participant.label, address: participant.address, txHash: tx.hash, chainId: chain.id, chainName: chain.name, nativeSymbol: chain.nativeSymbol, explorerTxBase: chain.explorerTxBase, explorerAddressBase: chain.explorerAddressBase, vaultAddress: chain.vaultAddress });
    }

    return {
      enabled: true,
      mode: 'demo',
      chainId: humanChain.id,
      chainName: `${humanChain.name} + ${agentChain.name}`,
      nativeSymbol: 'testnet native tokens',
      explorerTxBase: humanChain.explorerTxBase,
      explorerAddressBase: humanChain.explorerAddressBase,
      gameKey,
      vaultAddress: humanChain.vaultAddress,
      bondAmount,
      participants,
      fundTxs,
      depositTxs,
      crossChainDemo: true,
      settlementChains: [humanChain, agentChain].map((chain) => ({ id: chain.id, name: chain.name, nativeSymbol: chain.nativeSymbol, vaultAddress: chain.vaultAddress, explorerTxBase: chain.explorerTxBase, explorerAddressBase: chain.explorerAddressBase }))
    };
  }

  private async prepareSelfWalletWager(ctx: Context, room: RoomSession): Promise<WagerSession> {
    if (!room.state) throw new Error('Room state missing');
    if (!room.selfWalletAddress) throw new Error('Self-wallet mode needs /wallet 0xYourAddress before /startgame');
    const chain = this.getWagerChain(room.wagerChainId);
    const vaultAddress = chain.vaultAddress;
    if (!vaultAddress) throw new Error(`Missing settlement vault address for ${chain.name}`);
    const operatorKey = this.operatorKeyForChain(chain);
    if (!operatorKey) throw new Error('Missing operator private key');
    const agentKeys = (process.env.AGENT_WALLET_PRIVATE_KEYS || '').split(',').map((item) => item.trim()).filter(Boolean);
    if (agentKeys.length < DEFAULT_AGENT_PLAYERS.length) throw new Error(`Need ${DEFAULT_AGENT_PLAYERS.length} AGENT_WALLET_PRIVATE_KEYS for agent seats`);

    const provider = new ethers.JsonRpcProvider(chain.rpcUrl, Number(chain.id));
    const operator = new ethers.Wallet(operatorKey, provider);
    const artifact = await this.loadSettlementVaultArtifact();
    const vault = new ethers.Contract(vaultAddress, artifact.abi, operator);
    const gameKey = ethers.id(`delegated-mindgames:game:${room.gameId}`);
    const bondAmount = this.wagerBondAmount();
    const bond = ethers.parseEther(bondAmount);
    const minAgentGas = ethers.parseEther(process.env.TELEGRAM_WAGER_MIN_AGENT_GAS_MNT || process.env.MIN_AGENT_GAS_MNT || '0.02');
    const fundAmount = ethers.parseEther(process.env.TELEGRAM_WAGER_AGENT_FUND_MNT || process.env.AGENT_FUND_MNT || '0.03');
    const agentWalletById = new Map(DEFAULT_AGENT_PLAYERS.map((player, index) => [player.id, new ethers.Wallet(agentKeys[index], provider)]));

    const participants: WagerParticipant[] = room.state.players.map((player) => {
      if (player.kind === 'human') return { playerId: player.id, label: player.displayName, address: room.selfWalletAddress! };
      const wallet = agentWalletById.get(player.id);
      if (!wallet) throw new Error(`Missing agent wallet for ${player.id}`);
      return { playerId: player.id, label: player.displayName, address: wallet.address, wallet };
    });

    const fundTxs: WagerTx[] = [];
    const depositTxs: WagerTx[] = [];
      const depositUrl = this.selfDepositUrl({ gameId: room.gameId, gameKey, vaultAddress, bondAmount, playerId: participants.find((p) => !p.wallet)?.playerId ?? 'human', address: room.selfWalletAddress, chain });
      await this.replyHtml(ctx, [
        '🦊 <b>Your turn: pay self-wallet wager</b>',
        `Chain: <b>${this.escapeHtml(chain.name)}</b>`,
        `Bond: <b>${this.escapeHtml(bondAmount)} ${this.escapeHtml(chain.nativeSymbol)}</b>`,
        `Payment page: <a href="${this.escapeHtml(depositUrl)}">Open MetaMask deposit page</a>`,
        `Wallet: <code>${this.escapeHtml(room.selfWalletAddress)}</code>`,
        '',
        'Use the button below; it opens the local deposit web page, not the block explorer.',
        'Prefer mobile MetaMask? Scan the QR code below with your phone.',
        'If Telegram in-app browser has trouble with MetaMask, copy the link and open it in your normal browser with MetaMask installed.',
        `The bot is watching ${this.escapeHtml(chain.name)} and will start the game automatically after your deposit is confirmed.`
      ].join('\n'), Markup.inlineKeyboard([
        Markup.button.url(`Open ${chain.name} deposit page`, depositUrl)
      ]));
    await this.sendQrCode(ctx, depositUrl, 'Scan to open the self-wallet wager deposit page in mobile MetaMask / browser.');

    for (const participant of participants.filter((item) => item.wallet)) {
      const wallet = participant.wallet!;
      if (wallet.address !== operator.address) {
        const balance = await provider.getBalance(wallet.address);
        if (balance < minAgentGas) {
          const tx = await operator.sendTransaction({ to: wallet.address, value: fundAmount });
          await tx.wait();
          fundTxs.push({ label: participant.label, address: participant.address, txHash: tx.hash, chainId: chain.id });
        }
      }
      const tx = await (vault.connect(wallet) as ethers.Contract).depositBond(gameKey, { value: bond });
      await tx.wait();
      depositTxs.push({ label: participant.label, address: participant.address, txHash: tx.hash, chainId: chain.id });
    }

    await this.waitForBond(vault, gameKey, room.selfWalletAddress, bond, Number(process.env.TELEGRAM_SELF_WAGER_TIMEOUT_MS || 600000));
    depositTxs.push({ label: 'Self-wallet human', address: room.selfWalletAddress, txHash: 'paid-directly-by-user', chainId: chain.id });
    await this.replyHtml(ctx, `✅ <b>All bonds detected on ${this.escapeHtml(chain.name)}.</b> Starting the match now.`);

    return { enabled: true, mode: 'self', chainId: chain.id, chainName: chain.name, nativeSymbol: chain.nativeSymbol, explorerTxBase: chain.explorerTxBase, explorerAddressBase: chain.explorerAddressBase, gameKey, vaultAddress, bondAmount, participants, fundTxs, depositTxs, depositUrl };
  }

  private async waitForBond(vault: ethers.Contract, gameKey: string, address: string, bond: bigint, timeoutMs: number): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const value = await vault.bondOf(gameKey, address);
      if (value >= bond) return;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error('Timed out waiting for self-wallet deposit');
  }

  private selfDepositUrl(input: { gameId: string; gameKey: string; vaultAddress: string; bondAmount: string; playerId: string; address: string; chain: WagerChainConfig }): string {
    const url = this.publicPageUrl('deposit.html', process.env.PUBLIC_DEPOSIT_BASE_URL);
    url.searchParams.set('gameId', input.gameId);
    url.searchParams.set('gameKey', input.gameKey);
    url.searchParams.set('vault', input.vaultAddress);
    url.searchParams.set('bond', input.bondAmount);
    url.searchParams.set('playerId', input.playerId);
    url.searchParams.set('address', input.address);
    url.searchParams.set('chainId', input.chain.id);
    url.searchParams.set('chainName', input.chain.name);
    url.searchParams.set('nativeSymbol', input.chain.nativeSymbol);
    url.searchParams.set('rpcUrl', input.chain.rpcUrl);
    url.searchParams.set('explorerTxBase', input.chain.explorerTxBase);
    return url.toString();
  }

  private selfClaimUrl(input: { gameId: string; gameKey: string; vaultAddress: string; address: string; chain: WagerChainConfig }): string {
    const url = this.publicPageUrl('claim.html', process.env.PUBLIC_CLAIM_BASE_URL);
    url.searchParams.set('gameId', input.gameId);
    url.searchParams.set('gameKey', input.gameKey);
    url.searchParams.set('vault', input.vaultAddress);
    url.searchParams.set('address', input.address);
    url.searchParams.set('chainId', input.chain.id);
    url.searchParams.set('chainName', input.chain.name);
    url.searchParams.set('nativeSymbol', input.chain.nativeSymbol);
    url.searchParams.set('rpcUrl', input.chain.rpcUrl);
    url.searchParams.set('explorerTxBase', input.chain.explorerTxBase);
    return url.toString();
  }

  private publicPageUrl(page: string, override?: string): URL {
    const base = (override || process.env.PUBLIC_WEB_BASE_URL || `http://localhost:4173/${page}`).replace(/\/$/, '');
    return new URL(base.endsWith(page) ? base : `${base}/${page}`);
  }

  private async settleWager(room: RoomSession, winner: string, summaryRoot: string): Promise<WagerSettlementResult | undefined> {
    if (!room.state || !room.wager) return undefined;
    const artifact = await this.loadSettlementVaultArtifact();
    const winningParticipants = room.wager.participants.filter((participant) => {
      const player = room.state?.players.find((item) => item.id === participant.playerId);
      if (!player) return false;
      return winner === 'wolves' ? player.role === 'wolf' : player.role !== 'wolf';
    });
    if (!winningParticipants.length) throw new Error(`No wager winners for camp ${winner}`);

    const claimTxs: WagerTx[] = [];
    const settlementLegs: WagerSettlementLeg[] = [];
    const notes: string[] = [];
    const chainIds = Array.from(new Set(room.wager.participants.map((item) => item.chainId ?? room.wager?.chainId).filter(Boolean))) as string[];

    for (const chainId of chainIds) {
      const chain = this.getWagerChain(chainId);
      const operatorKey = this.operatorKeyForChain(chain);
      if (!operatorKey) throw new Error(`Missing operator key for settlement on ${chain.name}`);
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl, Number(chain.id));
      const operator = new ethers.Wallet(operatorKey, provider);
      const vaultAddress = room.wager.settlementChains?.find((item) => item.id === chain.id)?.vaultAddress || room.wager.vaultAddress || chain.vaultAddress;
      const vault = new ethers.Contract(vaultAddress, artifact.abi, operator);
      const chainWinners = winningParticipants.filter((item) => (item.chainId ?? room.wager?.chainId) === chain.id);
      const chainDepositors = room.wager.participants.filter((item) => (item.chainId ?? room.wager?.chainId) === chain.id);
      if (!chainDepositors.length) continue;
      if (!chainWinners.length) {
        notes.push(`${chain.name}: no winning claimant on this leg; the demo records this as a cross-chain loser-side bond leg pending relayer/bridge settlement support.`);
        continue;
      }

      const settleTx = await vault.settle(room.wager.gameKey, ethers.id(winner), chainWinners.map((item) => item.address), summaryRoot);
      await settleTx.wait();

      for (const participant of chainWinners) {
        if (!participant.wallet) {
          claimTxs.push({
            label: `${participant.label} (claim with MetaMask)`,
            address: participant.address,
            txHash: 'manual-claim-required',
            chainId: chain.id,
            chainName: chain.name,
            nativeSymbol: chain.nativeSymbol,
            explorerTxBase: chain.explorerTxBase,
            explorerAddressBase: chain.explorerAddressBase,
            vaultAddress,
            claimUrl: this.selfClaimUrl({ gameId: room.gameId, gameKey: room.wager.gameKey, vaultAddress, address: participant.address, chain })
          });
          continue;
        }
        try {
          const tx = await (vault.connect(participant.wallet) as ethers.Contract).claim(room.wager.gameKey);
          await tx.wait();
          claimTxs.push({ label: participant.label, address: participant.address, txHash: tx.hash, chainId: chain.id, chainName: chain.name, nativeSymbol: chain.nativeSymbol, explorerTxBase: chain.explorerTxBase, explorerAddressBase: chain.explorerAddressBase, vaultAddress });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          claimTxs.push({ label: `${participant.label} (auto-claim failed)`, address: participant.address, txHash: 'auto-claim-failed', chainId: chain.id, chainName: chain.name, nativeSymbol: chain.nativeSymbol, explorerTxBase: chain.explorerTxBase, explorerAddressBase: chain.explorerAddressBase, vaultAddress });
          notes.push(`${chain.name}: auto-claim failed for ${participant.label}; settlement is finalized and the wallet can retry claim later. Reason: ${reason.slice(0, 180)}`);
        }
      }

      const info = await vault.poolInfo(room.wager.gameKey);
      settlementLegs.push({
        chainId: chain.id,
        chainName: chain.name,
        nativeSymbol: chain.nativeSymbol,
        totalBond: ethers.formatEther(info[0]),
        winnerLabels: chainWinners.map((item) => item.label),
        settleTxHash: settleTx.hash,
        explorerTxBase: chain.explorerTxBase,
        explorerAddressBase: chain.explorerAddressBase,
        vaultAddress
      });
    }

    if (!settlementLegs.length) throw new Error('No settleable wager leg had winning claimants');
    return {
      totalBondMnt: settlementLegs.map((leg) => `${leg.totalBond} ${leg.nativeSymbol} on ${leg.chainName}`).join(' + '),
      winnerLabels: winningParticipants.map((item) => item.label),
      settleTxHash: settlementLegs[0].settleTxHash,
      claimTxs,
      settlementLegs,
      notes
    };
  }

  private async loadSettlementVaultArtifact(): Promise<{ abi: ethers.InterfaceAbi }> {
    return JSON.parse(await readFile('artifacts/contracts/GameSettlementVault.json', 'utf8')) as { abi: ethers.InterfaceAbi };
  }

  private async sendQrCode(ctx: Context, url: string, caption: string): Promise<void> {
    const png = await QRCode.toBuffer(url, { type: 'png', margin: 2, width: 420, errorCorrectionLevel: 'M' });
    await ctx.replyWithPhoto({ source: png }, { caption, parse_mode: 'HTML' });
  }

  private async publishToWeb(gameId: string, winner: string, eventCount: number, actionRegistryAddress?: string): Promise<void> {
    const webRoot = process.env.PUBLIC_WEB_ROOT?.trim();
    if (!webRoot) return;

    const sourceManifest = `artifacts/${gameId}/replay-manifest.json`;
    const targetManifest = join(webRoot, 'artifacts', gameId, 'replay-manifest.json');
    await mkdir(dirname(targetManifest), { recursive: true });
    await copyFile(sourceManifest, targetManifest);
    await updateGameIndex(join(webRoot, 'data', 'game-index.json'), {
      gameId,
      winner,
      eventCount,
      generatedAt: new Date().toISOString(),
      networkLabel: actionRegistryAddress ? 'Mantle Sepolia' : 'Local Dev',
      storageMode: 'Local JSON artifacts',
      manifestPath: `artifacts/${gameId}/replay-manifest.json`,
      registry: actionRegistryAddress || 'Mock delegated action adapter'
    });
    await copyFile(sourceManifest, join(webRoot, 'data', 'latest-demo.json'));
  }

  private formatWagerStart(wager: WagerSession): string {
    return [
      '💰 <b>Wager mode: ON</b>',
      wager.crossChainDemo
        ? `Chains: <b>${this.escapeHtml(wager.chainName)}</b> — human bond on Arbitrum Sepolia, AI-agent bonds on Mantle Sepolia.`
        : `Chain: <b>${this.escapeHtml(wager.chainName)}</b>`,
      `Bond: <b>${this.escapeHtml(wager.bondAmount)} ${this.escapeHtml(wager.nativeSymbol)}</b> per seat`,
      wager.crossChainDemo && wager.settlementChains?.length
        ? `<b>Settlement vaults</b>\n${wager.settlementChains.map((chain) => `• ${this.escapeHtml(chain.name)}: ${this.addressLink(chain.vaultAddress, chain)}`).join('\n')}`
        : `Settlement vault: ${this.addressLink(wager.vaultAddress, wager)}`,
      `Game key: <code>${this.escapeHtml(wager.gameKey)}</code>`,
      '',
      '<b>Deposit proof</b>',
      ...wager.depositTxs.map((tx) => `• ${this.escapeHtml(tx.label)} · ${this.escapeHtml(tx.chainName ?? wager.chainName)}: ${this.txLink(tx.txHash, tx)}`),
      ...(wager.fundTxs.length ? ['', '<b>Gas funding</b>', ...wager.fundTxs.map((tx) => `• ${this.escapeHtml(tx.label)} · ${this.escapeHtml(tx.chainName ?? wager.chainName)}: ${this.txLink(tx.txHash, tx)}`)] : []),
      '',
      wager.crossChainDemo
        ? 'At the end, the bot will show which settlement leg was finalized on each chain. Demo-wallet winners are auto-claimed; self-wallet winners receive a claim page.'
        : `At the end, the winning camp will be settled on ${this.escapeHtml(wager.chainName)} and winners will claim the pool on the same chain.`
    ].join('\n');
  }

  private formatFinalResult(input: {
    room: RoomSession;
    summaryWinner: string;
    eventCount: number;
    chainRecord: DelegatedActionRecord;
    publicTranscriptRoot: string;
    privateAuditRoot: string;
    summaryRoot: string;
    wagerResult?: WagerSettlementResult;
  }): string {
    const chain = input.chainRecord;
    const lines = [
      `🏁 <b>Game finished</b>: <code>${this.escapeHtml(input.room.gameId)}</code>`,
      `Winner: <b>${this.escapeHtml(input.summaryWinner)}</b>`,
      `Events: <b>${input.eventCount}</b>`,
      '',
      '<b>Delegated action audit</b>',
      `Create game: ${this.txLink(chain.createTxHash)}`,
      `Finalize game: ${this.txLink(chain.txHash)}`,
      `Action registry: ${chain.actionRegistryAddress ? this.addressLink(chain.actionRegistryAddress) : 'Mock / not linked'}`,
      `Game key: <code>${this.escapeHtml(chain.gameKey ?? 'n/a')}</code>`,
      `Recorded actions: <b>${chain.recordedActionCount ?? 0}</b>`,
      '',
      '<b>Artifact roots</b>',
      `Public transcript: <code>${this.escapeHtml(input.publicTranscriptRoot)}</code>`,
      `Private audit: <code>${this.escapeHtml(input.privateAuditRoot)}</code>`,
      `Summary: <code>${this.escapeHtml(input.summaryRoot)}</code>`
    ];

    if (input.wagerResult && input.room.wager) {
      lines.push(
        '',
        '<b>Wager settlement</b>',
        input.room.wager.crossChainDemo ? '<b>1Shot-style cross-chain coordination trace</b>' : `Chain: <b>${this.escapeHtml(input.room.wager.chainName)}</b>`,
        ...(input.wagerResult.settlementLegs?.length
          ? input.wagerResult.settlementLegs.map((leg) => `• ${this.escapeHtml(leg.chainName)} vault ${this.addressLink(leg.vaultAddress, leg)} · pool <b>${this.escapeHtml(leg.totalBond)} ${this.escapeHtml(leg.nativeSymbol)}</b> · settle ${this.txLink(leg.settleTxHash, leg)}`)
          : [`Settlement vault: ${this.addressLink(input.room.wager.vaultAddress, input.room.wager)}`]),
        `Total pool: <b>${this.escapeHtml(input.wagerResult.totalBondMnt)}</b>`,
        `Winning claimant(s): <b>${this.escapeHtml(input.wagerResult.winnerLabels.join(', '))}</b>`,
        ...input.wagerResult.claimTxs.map((tx) => `Claim · ${this.escapeHtml(tx.label)} · ${this.escapeHtml(tx.chainName ?? input.room.wager!.chainName)}: ${tx.claimUrl ? `<a href="${this.escapeHtml(tx.claimUrl)}">Open claim page</a>` : this.txLink(tx.txHash, tx)}`),
        ...(input.wagerResult.notes?.length ? ['', '<b>Settlement notes</b>', ...input.wagerResult.notes.map((note) => `• ${this.escapeHtml(note)}`)] : []),
        '',
        'Claim behavior: demo-wallet winners are auto-claimed by the bot after settlement; self-wallet human winners must tap the claim page and sign with MetaMask.'
      );
    } else {
      lines.push('', '<b>Wager settlement</b>', 'Wager mode was off for this room.');
    }

    lines.push('', 'Tap any linked tx/address above to inspect it in the chain explorer.');
    return lines.join('\n');
  }

  private txLink(txHash?: string, chain?: { explorerTxBase?: string }): string {
    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return `<code>${this.escapeHtml(txHash ?? 'n/a')}</code>`;
    return `<a href="${this.escapeHtml(chain?.explorerTxBase ?? 'https://sepolia.mantlescan.xyz/tx/')}${txHash}">${this.escapeHtml(this.shortHash(txHash))}</a>`;
  }

  private addressLink(address?: string, chain?: { explorerAddressBase?: string }): string {
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return `<code>${this.escapeHtml(address ?? 'n/a')}</code>`;
    return `<a href="${this.escapeHtml(chain?.explorerAddressBase ?? 'https://sepolia.mantlescan.xyz/address/')}${address}">${this.escapeHtml(this.shortHash(address))}</a>`;
  }

  private shortHash(value: string): string {
    return `${value.slice(0, 8)}…${value.slice(-4)}`;
  }

  private defaultWagerMode(): WagerMode {
    const mode = (process.env.TELEGRAM_WAGER_DEFAULT_MODE || (this.telegramWagerEnabled() ? 'self' : 'off')).trim().toLowerCase();
    if (mode === 'demo' || mode === 'self' || mode === 'off') return mode;
    return 'off';
  }

  private defaultWagerChain(): WagerChainConfig {
    return this.resolveWagerChain(process.env.TELEGRAM_WAGER_DEFAULT_CHAIN || process.env.WAGER_CHAIN || 'arbitrum') ?? this.getWagerChain('421614');
  }

  private resolveWagerChain(input: string): WagerChainConfig | undefined {
    const normalized = input.trim().toLowerCase();
    if (!normalized) return undefined;
    return this.wagerChains().find((chain) => chain.id === normalized || chain.key === normalized || chain.name.toLowerCase().includes(normalized));
  }

  private getWagerChain(chainId: string): WagerChainConfig {
    const chain = this.wagerChains().find((item) => item.id === chainId || item.key === chainId);
    if (!chain) throw new Error(`Unsupported wager chain ${chainId}`);
    return chain;
  }

  private wagerChains(): WagerChainConfig[] {
    const mantleRpc = process.env.MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
    const arbitrumRpc = process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
    return [
      {
        id: '5003',
        key: 'mantle',
        name: 'Mantle Sepolia',
        nativeSymbol: 'MNT',
        rpcUrl: mantleRpc,
        vaultAddress: process.env.MANTLE_SEPOLIA_VAULT_ADDRESS || process.env.GAME_SETTLEMENT_VAULT_ADDRESS || '',
        operatorPrivateKey: process.env.MANTLE_SEPOLIA_OPERATOR_PRIVATE_KEY || process.env.MANTLE_PRIVATE_KEY || process.env.TELEGRAM_WAGER_OPERATOR_PRIVATE_KEY,
        explorerTxBase: 'https://sepolia.mantlescan.xyz/tx/',
        explorerAddressBase: 'https://sepolia.mantlescan.xyz/address/',
        chainParam: {
          chainId: '0x138b',
          chainName: 'Mantle Sepolia Testnet',
          nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
          rpcUrls: [mantleRpc],
          blockExplorerUrls: ['https://sepolia.mantlescan.xyz']
        }
      },
      {
        id: '421614',
        key: 'arbitrum',
        name: 'Arbitrum Sepolia',
        nativeSymbol: 'ETH',
        rpcUrl: arbitrumRpc,
        vaultAddress: process.env.ARBITRUM_SEPOLIA_VAULT_ADDRESS || '0x5677F20bD56538F20051Fe8Bf002e6D06780d85c',
        operatorPrivateKey: process.env.ARBITRUM_SEPOLIA_OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.TELEGRAM_WAGER_OPERATOR_PRIVATE_KEY,
        explorerTxBase: 'https://sepolia.arbiscan.io/tx/',
        explorerAddressBase: 'https://sepolia.arbiscan.io/address/',
        chainParam: {
          chainId: '0x66eee',
          chainName: 'Arbitrum Sepolia',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [arbitrumRpc],
          blockExplorerUrls: ['https://sepolia.arbiscan.io']
        }
      }
    ];
  }

  private telegramWagerEnabled(): boolean {
    return ['1', 'true', 'yes', 'on'].includes((process.env.TELEGRAM_WAGER_ENABLED ?? '').trim().toLowerCase());
  }

  private operatorKeyForChain(chain: WagerChainConfig): string | undefined {
    return chain.operatorPrivateKey || process.env.TELEGRAM_WAGER_OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
  }

  private telegramWagerAllowed(ctx: Context): boolean {
    const raw = (process.env.TELEGRAM_WAGER_ALLOWED_CHAT_IDS ?? '').trim();
    if (!raw) return true;
    const allowed = new Set(raw.split(',').map((item) => item.trim()).filter(Boolean));
    return allowed.has(String(ctx.chat?.id ?? '')) || allowed.has(String(ctx.from?.id ?? ''));
  }

  private wagerBondAmount(): string {
    return process.env.TELEGRAM_WAGER_BOND_MNT || process.env.WAGER_BOND_MNT || '0.001';
  }

  private wagerBondMnt(): string {
    return this.wagerBondAmount();
  }

  private async sendPrivateRoleNotices(room: RoomSession): Promise<void> {
    if (!room.state) return;
    const playersLine = this.formatPublicPlayerList(room.state.players);
    const wolves = room.state.players.filter((p) => p.role === 'wolf');

    for (const player of room.state.players.filter((p) => p.kind === 'human')) {
      const role = player.role ?? 'unknown';
      let text = [
        `🎮 <b>Game</b> <code>${this.escapeHtml(room.gameId)}</code>`,
        '',
        `🔒 <b>Your private role</b>` ,
        `${this.roleEmoji(role)} <b>${this.escapeHtml(this.roleLabel(role))}</b>`,
        '',
        `🎲 <b>Seat order</b>`,
        playersLine
      ].join('\n');

      if (role === 'wolf') {
        const teammates = wolves.filter((p) => p.id !== player.id);
        text += teammates.length > 0
          ? `\n\n🐺 <b>Your wolf teammate(s)</b>\n${this.formatPublicPlayerList(teammates)}\n\nAt night, use <code>/kill &lt;playerId&gt;</code> when prompted.`
          : `\n\n🐺 You are the <b>only wolf</b> alive.\nAt night, use <code>/kill &lt;playerId&gt;</code> when prompted.`;
      } else if (role === 'seer') {
        text += `\n\n🔮 You are the <b>seer</b>.\nAt night, use <code>/check &lt;playerId&gt;</code> when prompted.`;
      } else if (role === 'villager') {
        text += `\n\n🧑‍🌾 You are a <b>villager</b>.\nSurvive, track contradictions, and vote carefully during the day.`;
      }

      text += `\n\n⚠️ Do not reveal this message unless strategically useful.`;
      const chatId = this.userChats.get(player.id);
      if (chatId) {
        await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' }).catch(() => undefined);
      }
    }
  }

  private async notifyHuman(
    ctx: Context,
    playerId: string,
    message: string,
    keyboard?: ReturnType<typeof Markup.inlineKeyboard>,
    privateOnly = false
  ): Promise<void> {
    const chatId = this.userChats.get(playerId);
    const extra = { parse_mode: 'HTML' as const, ...(keyboard ?? {}) };
    if (chatId) {
      await this.bot.telegram.sendMessage(chatId, message, extra);
      return;
    }
    if (privateOnly) {
      await this.replyHtml(ctx, '🔒 A private night action is waiting for a player. Please DM <code>/start</code> to the bot to receive secret role prompts.');
      return;
    }
    await this.replyHtml(ctx, `${message}
Tip: DM <code>/start</code> to this bot to receive private role/action prompts.`, keyboard);
  }

  private async notifyWolfTeam(room: RoomSession, message: string): Promise<void> {
    if (!room.state) return;
    for (const wolf of room.state.players.filter((player) => player.kind === 'human' && player.role === 'wolf')) {
      const chatId = this.userChats.get(wolf.id);
      if (chatId) await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' }).catch(() => undefined);
    }
  }

  private keyboardForRequest(
    room: RoomSession,
    type: 'speech' | 'vote' | 'nightKill' | 'seerCheck',
    playerId: string,
    allowedTargetIds?: string[]
  ): ReturnType<typeof Markup.inlineKeyboard> | undefined {
    if (!room.state || type === 'speech') return undefined;
    const action = type === 'nightKill' ? 'kill' : type === 'seerCheck' ? 'check' : 'vote';
    const candidates = room.state.players.filter((p) => {
      if (!p.alive) return false;
      if (type === 'nightKill') return p.role !== 'wolf';
      if (type === 'vote' && allowedTargetIds?.length) return allowedTargetIds.includes(p.id);
      return p.id !== playerId;
    });
    const buttons = candidates.map((p) => Markup.button.callback(`${p.displayName} (${p.id})`, `mg:${action}:${p.id}`));
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
    return Markup.inlineKeyboard(rows);
  }

  private async replyHtml(ctx: Context, html: string, keyboard?: ReturnType<typeof Markup.inlineKeyboard>): Promise<void> {
    await ctx.reply(html, { parse_mode: 'HTML', ...(keyboard ?? {}) });
  }

  private formatPublicEvent(room: RoomSession, event: GameEvent): string {
    const actor = event.actorId ? room.state?.players.find((p) => p.id === event.actorId) : undefined;
    const target = event.targetId ? room.state?.players.find((p) => p.id === event.targetId) : undefined;
    const text = this.formatText(event.publicText ?? '');

    if (event.type === 'phase_started') return `<b>${text}</b>`;
    if (event.type === 'speech' && actor) {
      const body = this.formatText(this.stripSpeakerPrefix(event.publicText ?? '', actor.displayName));
      return `🗣 <b>${this.escapeHtml(actor.displayName)}</b> ${this.kindEmoji(actor)} <b>${this.kindLabel(actor)}</b>\n\n${body}`;
    }
    if (event.type === 'vote' && actor) {
      return `🗳 <b>Vote</b>\n${this.playerChip(actor)}\n→ ${target ? this.playerChip(target) : `<b>${this.escapeHtml(event.targetId ?? 'unknown')}</b>`}`;
    }
    if (event.type === 'night_kill' && target) return `☠️ <b>Dawn death</b>\n${this.playerChip(target)} was found dead.`;
    if (event.type === 'eliminated') return `⚖️ <b>Eliminated</b>\n${target ? this.playerChip(target) : '<b>A player</b>'} was eliminated.`;
    if (event.type === 'game_finished') return `🏁 <b>${text}</b>`;
    if (event.type === 'vote_tie' || event.type === 'vote_no_elimination') return `<b>${text}</b>`;
    return text;
  }

  private stripSpeakerPrefix(text: string, displayName: string): string {
    return text.replace(new RegExp(`^${displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:：-]\\s*`, 'i'), '').trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private formatText(value: string): string {
    return this.escapeHtml(this.wrapByPunctuation(value));
  }

  private wrapByPunctuation(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 80) return normalized;
    return normalized
      .replace(/([。！？!?；;])\s*/g, '$1\n')
      .replace(/([，,])\s*/g, '$1 ')
      .split('\n')
      .flatMap((line) => this.softWrapLine(line, 72))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private softWrapLine(line: string, maxLen: number): string[] {
    if (line.length <= maxLen) return [line];
    const parts: string[] = [];
    let rest = line.trim();
    while (rest.length > maxLen) {
      const punctuationCut = Math.max(rest.lastIndexOf(',', maxLen), rest.lastIndexOf('，', maxLen));
      const spaceCut = rest.lastIndexOf(' ', maxLen);
      const cut = punctuationCut > maxLen * 0.45 ? punctuationCut + 1 : spaceCut > maxLen * 0.45 ? spaceCut : maxLen;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts;
  }

  private formatPublicPlayerList(players: Array<Pick<Player, 'id' | 'displayName' | 'kind'>>): string {
    return players.map((p, i) => `${i + 1}. ${this.playerChip(p)}`).join('\n');
  }

  private playerChip(player: Pick<Player, 'id' | 'displayName' | 'kind'>): string {
    return `${this.kindEmoji(player)} <b>${this.escapeHtml(player.displayName)}</b> <code>${this.escapeHtml(player.id)}</code> · <b>${this.kindLabel(player)}</b>`;
  }

  private playerName(room: RoomSession, playerId: string): string {
    return room.state?.players.find((p) => p.id === playerId)?.displayName ?? playerId;
  }

  private kindEmoji(player: Pick<Player, 'kind'>): string {
    return player.kind === 'human' ? '👤' : '🤖';
  }

  private kindLabel(player: Pick<Player, 'kind'>): string {
    return player.kind === 'human' ? 'Human' : 'AI Agent';
  }

  private roleEmoji(role?: string): string {
    if (role === 'wolf') return '🐺';
    if (role === 'seer') return '🔮';
    if (role === 'villager') return '🧑‍🌾';
    return '🎭';
  }

  private roleLabel(role?: string): string {
    if (role === 'wolf') return 'Wolf';
    if (role === 'seer') return 'Seer';
    if (role === 'villager') return 'Villager';
    return role ?? 'Unknown';
  }

  private requireRoom(ctx: Context): RoomSession | undefined {
    const chatId = this.chatKey(ctx);
    const room = this.rooms.get(chatId);
    if (!room) {
      void ctx.reply('No active room. Use /newgame first.');
      return undefined;
    }
    return room;
  }

  private chatKey(ctx: Context): string {
    return String(ctx.chat?.id ?? 'unknown');
  }

  private commandPayload(ctx: Context): string {
    const message = ctx.message;
    const text = message && 'text' in message && typeof message.text === 'string' ? message.text : '';
    return text.replace(/^\/\w+(@\w+)?\s*/, '');
  }

  private helpText(): string {
    return [
      '🎮 <b>Delegated MindGames Arena — Judge Quick Start</b>',
      '',
      'This Telegram bot runs a playable Werewolf-style social reasoning match: one human judge/player plus AI agents. The game creates replay, audit, summary, memory, and delegated-action artifacts for the MetaMask Smart Accounts Kit x 1Shot demo.',
      '',
      '<b>Start a match</b>',
      '1. <code>/newgame</code> — create a room and read the judge instructions.',
      '2. Choose wager chain: <code>/wagerchain arbitrum</code> or <code>/wagerchain mantle</code>.',
      '3a. Fast chain test: <code>/wagerdemo</code> — our demo wallets post all bonds directly.',
      '3b. User-paid test: <code>/wagerself</code> + <code>/wallet 0xYourAddress</code> — you receive a MetaMask deposit page.',
      '4. <code>/join</code> — join as the human player.',
      '5. <code>/startgame</code> — the bot prepares the selected wager mode, then starts the match.',
      '',
      '<b>During the game</b>',
      '• Speak when prompted: <code>/say your message</code>',
      '• Vote when prompted: tap a button or use <code>/vote &lt;playerId&gt;</code>',
      '• If you are Wolf: tap a button or use <code>/kill &lt;playerId&gt;</code>',
      '• If you are Seer: tap a button or use <code>/check &lt;playerId&gt;</code>',
      '',
      '<b>MetaMask / 1Shot verification</b>',
      '• Test wager chains currently supported: Mantle Sepolia and Arbitrum Sepolia.',
      '• The user chooses the wager chain before the game; deposit, settlement, and claim all stay on that selected chain.',
      '• Arbitrum Sepolia also participates in the MetaMask/1Shot settlement-vault demo. 1Shot remains in mock/trace mode until public Sepolia relayer capabilities are available.',
      '• These are testnet micro-bonds for verification, not gambling economics.',
      '',
      '<b>Useful commands</b>',
      '<code>/wagerchain</code> — choose Mantle Sepolia or Arbitrum Sepolia for this room',
      '<code>/wagerdemo</code> — demo wallets directly post all testnet bonds',
      '<code>/wagerself</code> — user posts their own human-seat bond via MetaMask web page',
      '<code>/status</code> — show room state',
      '<code>/help</code> — show this guide again',
      '<code>/abortgame</code> — reset the current game',
      '',
      '🔒 Tip: DM <code>/start</code> to this bot before playing so private role and night-action prompts can reach you.',
      '⚡ Fast chain-test path: <code>/newgame</code> → <code>/wagerchain arbitrum</code> → <code>/wagerdemo</code> → <code>/join</code> → <code>/startgame</code>'
    ].join('\n');
  }

  private engineLabel(): string {
    const backend = (process.env.LLM_BACKEND ?? '').trim().toLowerCase();
    if (backend === 'openrouter-glm-speech') return 'Telegram + OpenRouter Z.ai GLM speech + mock decisions';
    if (backend === 'openrouter-glm') return 'Telegram + OpenRouter Z.ai GLM agents';
    if (backend === 'zai-speech') return 'Telegram + Z.ai GLM speech + mock decisions';
    if (backend === 'llm-speech') return 'Telegram + LLM speech + mock decisions';
    if (backend === 'zai') return 'Telegram + Z.ai GLM agents';
    if (backend === 'llm' || process.env.USE_LLM === '1') return 'Telegram + LLM agents';
    return 'Telegram + mock agents';
  }
}
