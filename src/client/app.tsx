import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Content } from '../content/schema.js';
import { gameData, type JournalRow, type PlayerState } from '../engine/index.js';
import { api, type User } from './api.js';
import { GameContext, trimLog, type Game } from './game.js';
import { loadArt } from './lib/art.js';
import { buzz, getPrefs, playSound } from './lib/prefs.js';
import { AchievementBanner, AchievementPopup, WelcomePopup } from './screens/achievements.js';
import { NewCatchPopup, NewCatchToast, type NewCatch } from './screens/newcatch.js';
import { go, useRoute } from './lib/route.js';
import { ArsenalScreen, ItemScreen } from './screens/gear.js';
import { AuthScreen } from './screens/auth.js';
import { HuntScreen } from './screens/hunt.js';
import { ImpScreen, NaughtyListScreen } from './screens/list.js';
import { HistoryScreen } from './screens/log.js';
import { AccountScreen, AdminScreen, FeedbackScreen, HowToScreen, HuntersScreen, MoreMenu, ProfileScreen, SettingsScreen, TravelScreen } from './screens/more.js';
import { EmporiumScreen, WorkshopScreen } from './screens/shop.js';

export function App() {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const c = fetch('/api/content').then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
    Promise.all([c, loadArt()]).then(([content]) => setContent(content as Content)).catch((e) => setError(String(e)));
  }, []);
  if (error) return <main class="center">Couldn't load the game: {error}</main>;
  if (!content) return <main class="center">Loading Santa's lair…</main>;
  return <Session content={content} />;
}

interface MeResponse { user: User; player: PlayerState; journal: JournalRow[]; backfill?: string[] }

function Session({ content }: { content: Content }) {
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);
  const refresh = () => api<MeResponse>('GET', '/api/me').then(setMe).catch(() => setMe(null));
  useEffect(() => { refresh(); }, []);
  if (me === undefined) return <main class="center">Loading Santa's lair…</main>;
  if (me === null) return <AuthScreen onDone={refresh} />;
  return <Playing content={content} me={me} onLogout={() => setMe(null)} />;
}

type Toast = { message: string; kind: 'info' | 'good' | 'bad'; id: number };

function Playing({ content, me, onLogout }: { content: Content; me: MeResponse; onLogout: () => void }) {
  const data = useMemo(() => gameData(content), [content]);
  const [player, setPlayer] = useState(me.player);
  const [log, setLog] = useState(me.journal);
  const [busy, setBusy] = useState(false);
  const [toastState, setToast] = useState<Toast | null>(null);
  const [newCatch, setNewCatch] = useState<(NewCatch & { quiet: boolean }) | null>(null);
  const [badges, setBadges] = useState<{ ids: string[]; backfill: boolean } | null>(
    me.backfill?.length ? { ids: me.backfill, backfill: true } : null);
  const [welcome, setWelcome] = useState(me.player.welcomeSeen === false);
  // Start over gives a new game, and a new game opens with the welcome popup.
  useEffect(() => { if (player.welcomeSeen === false) setWelcome(true); }, [player.welcomeSeen]);
  const lastHuntAt = useRef(0);

  const celebrate = useCallback((ids: string[], backfill = false) => {
    if (!ids.length) return;
    playSound('badge');
    buzz(60);
    // Badges earned while one popup is open join its queue.
    setBadges((cur) => ({ ids: [...(cur?.ids ?? []), ...ids], backfill: cur?.backfill ?? backfill }));
  }, []);
  const busyRef = useRef(false);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'info') => setToast({ message, kind, id: Date.now() }), []);
  useEffect(() => {
    if (!toastState) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toastState.id ? null : cur)), toastState.kind === 'bad' ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [toastState]);

  const act: Game['act'] = async (path, body, ok) => {
    try {
      const r = await api<{ player: PlayerState; log: JournalRow | null; logs?: JournalRow[]; newAchievements?: string[] }>('POST', path, body);
      setPlayer(r.player);
      const rows = r.logs ?? (r.log ? [r.log] : []);
      if (rows.length) setLog((l) => trimLog([...[...rows].reverse(), ...l]));
      if (ok) toast(ok, 'good');
      celebrate(r.newAchievements ?? []);
      return true;
    } catch (e) {
      toast((e as Error).message, 'bad');
      return false;
    }
  };

  const hunt = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    // The server allows a few hunts a second; pace rapid presses instead of showing an error.
    const gap = 1000 / content.constants.maxHuntsPerSecond + 20;
    const wait = lastHuntAt.current + gap - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastHuntAt.current = Date.now();
    try {
      const r = await api<{ player: PlayerState; entry: JournalRow; logs?: JournalRow[]; newAchievements?: string[] }>('POST', '/api/hunt', {});
      setPlayer(r.player);
      setLog((l) => trimLog([...[...(r.logs ?? [r.entry])].reverse(), ...l]));
      celebrate(r.newAchievements ?? []);
      if (r.entry.kind === 'hunt') {
        const e = r.entry.entry;
        const imp = e.imp ? data.imps.get(e.imp) : undefined;
        if (e.outcome === 'catch' && e.firstCatch && e.imp) setNewCatch({ imp: e.imp, points: e.points ?? 0, quiet: !getPrefs().newCatchPopups });
        if (e.rankUp) {
          toast(`Rank up! You are now ${content.ranks[e.rankUp - 1]!.name}.`, 'good');
          playSound('rank');
        } else if (e.outcome === 'catch') {
          playSound(imp && (imp.tier === 'boss' || imp.tier === 'miniboss') ? 'boss' : 'catch');
        } else if (e.outcome === 'escape') playSound('escape');
        if (e.outcome === 'catch') buzz(imp?.tier === 'boss' ? 120 : 40);
        if (e.pillage) {
          document.body.classList.remove('pillaged');
          void document.body.offsetWidth; // restart the animation on back-to-back pillages
          document.body.classList.add('pillaged');
          setTimeout(() => document.body.classList.remove('pillaged'), 1000);
          buzz(80);
        }
      }
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [content, data, toast, celebrate]);

  const game: Game = {
    content, data, user: me.user, player, log, act, toast, hunt, busy, setPlayer, celebrate,
    resetLog: (rows = []) => setLog(rows),
    logout: () => { api('POST', '/api/auth/logout', {}).finally(() => { go('hunt', true); onLogout(); }); },
  };

  return (
    <GameContext.Provider value={game}>
      <Router />
      {welcome && (
        <WelcomePopup onClose={(letter) => {
          setWelcome(false);
          api<{ player: PlayerState }>('POST', '/api/welcome', {}).then((r) => setPlayer(r.player)).catch(() => {});
          go('hunt');
          if (letter) setTimeout(() => document.querySelector('.story-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        }} />
      )}
      {!welcome && newCatch && (newCatch.quiet
        ? <NewCatchToast found={newCatch} onClose={() => setNewCatch(null)} />
        : <NewCatchPopup found={newCatch} onClose={() => setNewCatch(null)} />)}
      {/* Old saves get one Welcome back popup; every other badge is a non-blocking banner. */}
      {!welcome && badges && (badges.backfill
        ? (!newCatch || newCatch.quiet) && <AchievementPopup ids={badges.ids} backfill onClose={() => setBadges(null)} />
        : !(newCatch && newCatch.quiet) && <AchievementBanner ids={badges.ids} onClose={() => setBadges(null)} />)}
      {toastState && (
        <div class={`toast ${toastState.kind}`} role="status" onClick={() => setToast(null)}>{toastState.message}</div>
      )}
    </GameContext.Provider>
  );
}

function Router() {
  const [page, a, b, c] = useRoute();
  useEffect(() => { document.querySelector('.scroll')?.scrollTo(0, 0); }, [page, a]);
  switch (page) {
    case undefined:
    case 'hunt': return <HuntScreen />;
    case 'history': return <HistoryScreen />;
    case 'list': return <NaughtyListScreen />;
    case 'imp': return <ImpScreen id={a ?? ''} />;
    case 'arsenal': return <ArsenalScreen slot={(['trap', 'base', 'bait', 'charm'].includes(a ?? '') ? a : 'trap') as 'trap'} previewId={b} />;
    case 'item': return <ItemScreen id={a ?? ''} />;
    case 'emporium': return <EmporiumScreen tab={(['traps', 'bases', 'bait', 'charms', 'sell'].includes(a ?? '') ? a : 'traps') as 'traps'} />;
    case 'workshop': return <WorkshopScreen focus={a} />;
    case 'more':
      switch (a) {
        case 'travel': return <TravelScreen />;
        case 'hunters': return <HuntersScreen />;
        case 'stats': return <ProfileScreen tab="stats" />;
        case 'profile': return <ProfileScreen tab={b === 'achievements' ? 'achievements' : 'stats'} openId={c} />;
        case 'howto': return <HowToScreen />;
        case 'settings': return <SettingsScreen />;
        case 'admin': return <AdminScreen />;
        case 'feedback': return <FeedbackScreen />;
        case 'account': return <AccountScreen />;
        default: return <MoreMenu />;
      }
    default: return <HuntScreen />;
  }
}
