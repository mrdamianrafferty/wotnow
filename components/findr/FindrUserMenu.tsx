import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../lib/supabase/client';
import { User as UserType } from '@supabase/supabase-js';
import { User, LogIn, LogOut } from 'lucide-react';

export default function FindrUserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/findr');
  };

  // Get avatar URL from OAuth provider (Google/Apple)
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const hasAvatar = !!avatarUrl;

  if (loading) {
    return (
      <div className="skeleton h-10 w-10 rounded-full"></div>
    );
  }

  if (!user) {
    return (
      <Link href="/findr/auth" className="btn btn-ghost btn-sm gap-2">
        <LogIn className="w-4 h-4" />
        Sign In
      </Link>
    );
  }

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-base-200">
          {hasAvatar ? (
            <Image
              src={avatarUrl}
              alt="Profile"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}
              unoptimized // OAuth avatars are already optimized
            />
          ) : (
            <User className="w-6 h-6" />
          )}
        </div>
      </div>
      <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300">
        <li className="menu-title px-4 py-2">
          <span className="text-xs text-base-content/70 truncate">
            {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
          </span>
        </li>
        <li>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-base-content hover:text-base-content">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </li>
      </ul>
    </div>
  );
}
