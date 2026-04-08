import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import AdminDashboard from './_components/AdminDashboard'

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Obtener el bar asociado al admin
  const { data: barAdmin } = await supabase
    .from('bar_admins')
    .select('bar_id, role, bars(id, name, slug, tv_pin)')
    .eq('user_id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminDashboard user={user as any} barAdmin={barAdmin as any} />
}
