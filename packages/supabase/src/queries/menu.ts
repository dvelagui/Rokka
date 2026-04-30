import { getSupabaseBrowserClient } from '../client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string
  bar_id: string
  subcategory_id: string
  name: string
  price: number
  is_available: boolean
  sort_order: number
}

export interface MenuSubcategory {
  id: string
  category_id: string
  name: string
  sort_order: number
  items: MenuItem[]
}

export interface MenuCategory {
  id: string
  bar_id: string
  name: string
  emoji: string
  sort_order: number
  subcategories: MenuSubcategory[]
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Estructura completa del menú.
 * - `adminView = false` → solo ítems disponibles (para clientes)
 * - `adminView = true`  → todos los ítems
 */
export async function getMenu(barId: string, adminView = false): Promise<MenuCategory[]> {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('menu_categories')
    .select(`
      id, bar_id, name, emoji, sort_order,
      menu_subcategories (
        id, category_id, name, sort_order,
        menu_items (
          id, bar_id, subcategory_id, name, price, is_available, sort_order
        )
      )
    `)
    .eq('bar_id', barId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  // Supabase returns the nested relation as `menu_subcategories` / `menu_items`
  // (the actual table names). We remap them to the domain field names.
  type RawItem = { id: string; bar_id: string; subcategory_id: string; name: string; price: number; is_available: boolean; sort_order: number }
  type RawSub  = { id: string; category_id: string; name: string; sort_order: number; menu_items: RawItem[] }
  type RawCat  = { id: string; bar_id: string; name: string; emoji: string; sort_order: number; menu_subcategories: RawSub[] }

  return ((data ?? []) as unknown as RawCat[]).map((cat) => ({
    id:         cat.id,
    bar_id:     cat.bar_id,
    name:       cat.name,
    emoji:      cat.emoji,
    sort_order: cat.sort_order,
    subcategories: (cat.menu_subcategories ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sub) => ({
        id:          sub.id,
        category_id: sub.category_id,
        name:        sub.name,
        sort_order:  sub.sort_order,
        items: (sub.menu_items ?? [])
          .filter((item) => adminView || item.is_available)
          .sort((a, b) => a.sort_order - b.sort_order),
      })),
  } satisfies MenuCategory))
}

// ── Categorías ────────────────────────────────────────────────────────────────

export async function createCategory(
  barId: string,
  data: { name: string; emoji?: string },
): Promise<MenuCategory> {
  const supabase = getSupabaseBrowserClient()
  const { data: row, error } = await supabase
    .from('menu_categories')
    .insert({ bar_id: barId, name: data.name, emoji: data.emoji ?? '🍽️' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { ...(row as MenuCategory), subcategories: [] }
}

export async function updateCategory(
  categoryId: string,
  data: Partial<{ name: string; emoji: string; sort_order: number }>,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('menu_categories')
    .update(data)
    .eq('id', categoryId)
  if (error) throw new Error(error.message)
}

/** Elimina categoría y todas sus subcategorías e ítems (cascade por FK). */
export async function deleteCategory(categoryId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId)
  if (error) throw new Error(error.message)
}

// ── Subcategorías ─────────────────────────────────────────────────────────────

export async function createSubcategory(
  categoryId: string,
  data: { name: string; sort_order?: number },
): Promise<MenuSubcategory> {
  const supabase = getSupabaseBrowserClient()
  const { data: row, error } = await supabase
    .from('menu_subcategories')
    .insert({ category_id: categoryId, name: data.name, sort_order: data.sort_order ?? 0 })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { ...(row as MenuSubcategory), items: [] }
}

// ── Ítems ─────────────────────────────────────────────────────────────────────

export async function createMenuItem(
  subcategoryId: string,
  barId: string,
  data: { name: string; price: number; isAvailable?: boolean; sort_order?: number },
): Promise<MenuItem> {
  const supabase = getSupabaseBrowserClient()
  const { data: row, error } = await supabase
    .from('menu_items')
    .insert({
      subcategory_id: subcategoryId,
      bar_id:         barId,
      name:           data.name,
      price:          data.price,
      is_available:   data.isAvailable ?? true,
      sort_order:     data.sort_order ?? 0,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as MenuItem
}

export async function updateMenuItem(
  itemId: string,
  data: Partial<{ name: string; price: number; is_available: boolean; sort_order: number }>,
): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('menu_items')
    .update(data)
    .eq('id', itemId)
  if (error) throw new Error(error.message)
}

/** Eliminar subcategoría (cascade a ítems via FK). */
export async function deleteSubcategory(subcategoryId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from('menu_subcategories').delete().eq('id', subcategoryId)
  if (error) throw new Error(error.message)
}

/** Eliminar ítem del menú. */
export async function deleteMenuItem(itemId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function toggleItemAvailability(itemId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { data: current, error: fetchErr } = await supabase
    .from('menu_items')
    .select('is_available')
    .eq('id', itemId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const newValue = !(current as { is_available: boolean }).is_available
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: newValue })
    .eq('id', itemId)
  if (error) throw new Error(error.message)
  return newValue
}
