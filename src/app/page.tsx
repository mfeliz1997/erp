import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirección inteligente basada en sesión
  if (user) {
    redirect('/overview');
  } else {
    redirect('/login');
  }
}