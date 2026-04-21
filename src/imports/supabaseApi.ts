import type { SupabaseClient } from '@supabase/supabase-js'
import { DRAWING_BUCKET, supabase } from './supabaseClient'
import type { Drawing } from './drawingRecord'
import type { SavedProfileRow } from './savedProfiles'
import { displayLabel } from './savedProfiles'

export async function deleteDrawingsByAuthorLabel(userId: string, authorName: string): Promise<void> {
  if (!supabase) return
  const label = displayLabel(authorName)
  const { data: rows } = await supabase
    .from('drawings')
    .select('image_path')
    .eq('user_id', userId)
    .eq('author_display_name', label)

  const paths = (rows ?? []).map((r) => r.image_path as string).filter(Boolean)
  if (paths.length > 0) {
    const { error: stErr } = await supabase.storage.from(DRAWING_BUCKET).remove(paths)
    if (stErr) console.warn('deleteDrawingsByAuthorLabel storage:', stErr.message)
  }

  const { error } = await supabase.from('drawings').delete().eq('user_id', userId).eq('author_display_name', label)
  if (error) console.error('deleteDrawingsByAuthorLabel:', error.message)
}

type DrawingRow = {
  id: string
  created_at: string
  user_id: string
  author_display_name: string
  monster_json: string
  prompt_text: string | null
  image_path: string
}

type ProfileRow = {
  id: string
  user_id: string
  display_name: string
  monster_json: string
}

function publicImageUrl(client: SupabaseClient, path: string): string {
  const { data } = client.storage.from(DRAWING_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function rowToDrawing(
  client: SupabaseClient,
  row: DrawingRow,
  likeCount: number,
  likedByMe: boolean,
): Drawing {
  return {
    id: row.id,
    image: publicImageUrl(client, row.image_path),
    timestamp: row.created_at,
    userName: row.author_display_name,
    userMonster: row.monster_json,
    prompt: row.prompt_text ?? undefined,
    likeCount,
    likedByMe,
  }
}

export async function fetchDrawingsFeed(userId: string): Promise<Drawing[]> {
  if (!supabase) return []

  const { data: rows, error: dErr } = await supabase
    .from('drawings')
    .select('*')
    .order('created_at', { ascending: false })

  if (dErr || !rows) {
    console.error('fetchDrawingsFeed:', dErr?.message)
    return []
  }

  const { data: likes, error: lErr } = await supabase.from('drawing_likes').select('drawing_id, user_id')

  if (lErr) {
    console.error('fetchDrawingsFeed likes:', lErr.message)
  }

  const countByDrawing = new Map<string, number>()
  for (const l of likes ?? []) {
    const id = l.drawing_id as string
    countByDrawing.set(id, (countByDrawing.get(id) ?? 0) + 1)
  }

  const likedByMe = new Set<string>()
  for (const l of likes ?? []) {
    if (l.user_id === userId) likedByMe.add(l.drawing_id as string)
  }

  return (rows as DrawingRow[]).map((row) =>
    rowToDrawing(supabase!, row, countByDrawing.get(row.id) ?? 0, likedByMe.has(row.id)),
  )
}

export async function insertDrawing(params: {
  userId: string
  authorDisplayName: string
  monsterJson: string
  promptText: string
  pngDataUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const id = crypto.randomUUID()
  const path = `${params.userId}/${id}.png`

  const res = await fetch(params.pngDataUrl)
  const blob = await res.blob()

  const { error: upErr } = await supabase.storage.from(DRAWING_BUCKET).upload(path, blob, {
    contentType: 'image/png',
    upsert: true,
  })

  if (upErr) {
    console.error('upload drawing:', upErr.message)
    return { ok: false, error: upErr.message }
  }

  const { error: insErr } = await supabase.from('drawings').insert({
    id,
    user_id: params.userId,
    author_display_name: displayLabel(params.authorDisplayName),
    monster_json: params.monsterJson,
    prompt_text: params.promptText || null,
    image_path: path,
  })

  if (insErr) {
    console.error('insert drawing:', insErr.message)
    await supabase.storage.from(DRAWING_BUCKET).remove([path])
    return { ok: false, error: insErr.message }
  }

  return { ok: true }
}

export async function deleteDrawing(userId: string, drawingId: string): Promise<boolean> {
  if (!supabase) return false

  const { data: row } = await supabase
    .from('drawings')
    .select('user_id, image_path')
    .eq('id', drawingId)
    .maybeSingle()

  if (!row || row.user_id !== userId) return false

  const { error: delDb } = await supabase.from('drawings').delete().eq('id', drawingId)
  if (delDb) {
    console.error('delete drawing:', delDb.message)
    return false
  }

  const { error: delSt } = await supabase.storage.from(DRAWING_BUCKET).remove([row.image_path as string])
  if (delSt) {
    console.warn('delete storage object:', delSt.message)
  }

  return true
}

export async function toggleDrawingLike(userId: string, drawingId: string, currentlyLiked: boolean): Promise<boolean> {
  if (!supabase) return false

  if (currentlyLiked) {
    const { error } = await supabase.from('drawing_likes').delete().match({ drawing_id: drawingId, user_id: userId })
    if (error) console.error('unlike:', error.message)
    return !error
  }

  const { error } = await supabase.from('drawing_likes').insert({ drawing_id: drawingId, user_id: userId })
  if (error) console.error('like:', error.message)
  return !error
}

export async function fetchProfilesForUser(userId: string): Promise<SavedProfileRow[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, monster_json')
    .eq('user_id', userId)
    .order('display_name', { ascending: true })

  if (error || !data) {
    console.error('fetchProfilesForUser:', error?.message)
    return []
  }

  return (data as Pick<ProfileRow, 'display_name' | 'monster_json'>[]).map((r) => ({
    name: r.display_name,
    monster: r.monster_json,
  }))
}

export async function fetchAllProfiles(): Promise<SavedProfileRow[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, monster_json')
    .order('display_name', { ascending: true })

  if (error || !data) {
    console.error('fetchAllProfiles:', error?.message)
    return []
  }

  return (data as Pick<ProfileRow, 'display_name' | 'monster_json'>[]).map((r) => ({
    name: r.display_name,
    monster: r.monster_json,
  }))
}

export async function upsertProfileCloud(userId: string, displayName: string, monsterJson: string): Promise<boolean> {
  if (!supabase) return false

  const label = displayLabel(displayName)
  const lower = label.toLowerCase()

  const { data: rows } = await supabase.from('profiles').select('id, display_name').eq('user_id', userId)

  const match = rows?.find((r) => (r.display_name as string).trim().toLowerCase() === lower)

  if (match?.id) {
    const { error } = await supabase
      .from('profiles')
      .update({ monster_json: monsterJson, display_name: label, updated_at: new Date().toISOString() })
      .eq('id', match.id)
    if (error) console.error('upsertProfile update:', error.message)
    return !error
  }

  const { error } = await supabase.from('profiles').insert({
    user_id: userId,
    display_name: label,
    monster_json: monsterJson,
  })
  if (error) console.error('upsertProfile insert:', error.message)
  return !error
}

export async function deleteProfileCloud(userId: string, displayName: string): Promise<boolean> {
  if (!supabase) return false
  const label = displayLabel(displayName)
  const lower = label.toLowerCase()
  const { data: rows } = await supabase.from('profiles').select('id, display_name').eq('user_id', userId)
  const match = rows?.find((r) => (r.display_name as string).trim().toLowerCase() === lower)
  if (!match?.id) return true
  const { error } = await supabase.from('profiles').delete().eq('id', match.id)
  if (error) console.error('deleteProfileCloud:', error.message)
  return !error
}

export function subscribeDrawingsChanges(onChange: () => void): (() => void) | null {
  const client = supabase
  if (!client) return null

  const channel = client
    .channel('scribbld-drawings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drawings' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drawing_likes' }, () => onChange())
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
