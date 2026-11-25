import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';

export function AuthScreen({ onDone }: { onDone: () => void }) {
  const [needsAdmin, setNeedsAdmin] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState(() => new URLSearchParams(location.search).get('invite') ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ needsAdmin: boolean }>('GET', '/api/setup-status').then((s) => {
      setNeedsAdmin(s.needsAdmin);
      if (s.needsAdmin || invite) setMode('signup');
    }).catch(() => {});
  }, []);

  const submit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') await api('POST', '/api/auth/login', { username, password });
      else await api('POST', '/api/auth/signup', { username, password, invite });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main class="auth">
      <h1>The Naughty List</h1>
      <p>Scrinch's imps are raiding Santa's lair. Santa needs an imp hunter.</p>
      {needsAdmin && <p class="toast">Welcome! The first account you create runs this game and can invite friends.</p>}
      <form onSubmit={submit}>
        <label>Username<input value={username} autoComplete="username" onInput={(e) => setUsername((e.target as HTMLInputElement).value)} /></label>
        <label>Password<input type="password" value={password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onInput={(e) => setPassword((e.target as HTMLInputElement).value)} /></label>
        {mode === 'signup' && !needsAdmin && (
          <label>Invite code<input value={invite} placeholder="SNOW-XXXX-XXXX" onInput={(e) => setInvite((e.target as HTMLInputElement).value)} /></label>
        )}
        {error && <p class="error">{error}</p>}
        <button class="hunt" type="submit">{mode === 'login' ? 'Log in' : needsAdmin ? 'Create admin account' : 'Join the hunt'}</button>
      </form>
      {!needsAdmin && (
        <p>
          {mode === 'login' ? 'Got an invite code? ' : 'Already hunting? '}
          <button class="link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      )}
    </main>
  );
}
