import { useEffect, useState } from 'preact/hooks';
import { api } from '../api.js';
import { Art } from '../lib/art.js';

export function AuthScreen({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<{ needsAdmin: boolean; signupsOpen: boolean } | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    api<{ needsAdmin: boolean; signupsOpen: boolean }>('GET', '/api/setup-status').then((s) => {
      setStatus(s);
      if (s.needsAdmin) setMode('signup');
    }).catch(() => {});
  }, []);

  const submit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && password !== confirm) { setError("The passwords don't match."); return; }
    setWorking(true);
    try {
      if (mode === 'login') await api('POST', '/api/auth/login', { username, password });
      else await api('POST', '/api/auth/signup', { username, password });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWorking(false);
    }
  };
  const switchTo = (m: 'login' | 'signup') => { setMode(m); setError(null); };
  const closed = mode === 'signup' && status && !status.signupsOpen;

  return (
    <main class="auth">
      <Art slot="brand" id="key_art" class="auth-bg" />
      <div class="auth-inner">
        <div class="auth-brand">
          <Art slot="brand" id="icon" alt="" class="auth-icon" />
          <h1>The Naughty List</h1>
          <p>Scrinch has hexed Santa's elves and taken over the lair. Santa needs an elf hunter.</p>
        </div>
        <form class="auth-card" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Log in' : status?.needsAdmin ? 'Create the admin account' : 'Create account'}</h2>
          {status?.needsAdmin && <p class="note">Welcome! The first account on a new server becomes the admin.</p>}
          {closed && <p class="note">New accounts are closed right now. Ask the admin to open them.</p>}
          <label>Username<input value={username} autoComplete="username" autoCapitalize="none" spellcheck={false} required onInput={(e) => setUsername((e.target as HTMLInputElement).value)} /></label>
          <label>Password<input type="password" value={password} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onInput={(e) => setPassword((e.target as HTMLInputElement).value)} /></label>
          {mode === 'signup' && (
            <label>Confirm password<input type="password" value={confirm} required autoComplete="new-password" onInput={(e) => setConfirm((e.target as HTMLInputElement).value)} /></label>
          )}
          {error && <p class="error">{error}</p>}
          <button class="hunt-btn" type="submit" disabled={working || !!closed}>{mode === 'login' ? 'Log in' : 'Create account'}</button>
          {mode === 'signup' && !status?.needsAdmin && <p class="small muted">Usernames are 3 to 20 letters, digits, _ or -. Passwords need at least 8 characters.</p>}
          {!status?.needsAdmin && (
            mode === 'login'
              ? <p class="switch">New here? <button type="button" class="link" onClick={() => switchTo('signup')}>Create account</button></p>
              : <p class="switch">Already hunting? <button type="button" class="link" onClick={() => switchTo('login')}>Log in</button></p>
          )}
        </form>
      </div>
    </main>
  );
}
