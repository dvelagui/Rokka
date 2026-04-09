/**
 * Layout for authenticated main routes (future sub-pages like /menu, /chat).
 * Providers are already mounted in the root layout — this is a pass-through
 * that can be extended to add per-route structure (modals, back nav, etc.).
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
