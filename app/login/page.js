'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Factory, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname.replace(/login\/?$/, '')}auth/callback/` : '';

  const signIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/');
  };

  const signUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) return setError(error.message);
    setMessage('Check your email to confirm your account.');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07090d] blueprint-grid p-6">
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-100 font-medium tracking-wider uppercase"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-md bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
          <Factory size={20} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-100 leading-none">
            Plant Electrical
          </div>
          <div className="text-[10px] text-zinc-500 font-mono leading-none mt-1">
            ACCESS CONTROL
          </div>
        </div>
      </div>

      <Card className="w-full max-w-md bg-zinc-950/80 border-white/10 text-zinc-100 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-zinc-100">Authentication</CardTitle>
          <CardDescription className="text-zinc-500">
            Sign in to edit network topology and inject persistent faults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-200">
                <AlertDescription>Signed in as {user.email}</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={() => router.push('/')} className="flex-1">
                  Go to Dashboard
                </Button>
                <Button onClick={signOut} variant="outline" className="border-white/10">
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900/70">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-widest text-zinc-400">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-zinc-900/70 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs uppercase tracking-widest text-zinc-400">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-zinc-900/70 border-white/10"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <LogIn size={14} className="mr-2" />
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email2" className="text-xs uppercase tracking-widest text-zinc-400">
                      Email
                    </Label>
                    <Input
                      id="email2"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-zinc-900/70 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password2" className="text-xs uppercase tracking-widest text-zinc-400">
                      Password
                    </Label>
                    <Input
                      id="password2"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-zinc-900/70 border-white/10"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <UserPlus size={14} className="mr-2" />
                    {loading ? 'Creating account...' : 'Sign up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {error && (
            <Alert className="mt-4 bg-red-500/10 border-red-500/30 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="mt-4 bg-blue-500/10 border-blue-500/30 text-blue-200">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="text-[10px] text-zinc-600 font-mono mt-6">
        RLS · anon: read · authenticated: write
      </div>
    </div>
  );
}
