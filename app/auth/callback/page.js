'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const finish = async () => {
      // The supabase-js client auto-handles the code exchange via URL fragments/queries.
      const { data } = await supabase.auth.getSession();
      router.replace(data.session ? '/' : '/login');
    };
    finish();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090d] text-zinc-300">
      <div className="flex items-center gap-3">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm tracking-wider uppercase">Signing you in...</span>
      </div>
    </div>
  );
}
