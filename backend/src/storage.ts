// The backend treats objects as plain JSON; it only relies on every object having an id.
export type BoardObject = { id: string } & Record<string, unknown>
export type Board = { id: string; name: string; createdAt: string }

// Boards and their objects live in the Supabase tables "boards" and "objects", reached through Supabase's REST API.
// This module is the only place that knows about the database. The secret key stays in the backend.
process.loadEnvFile(new URL('../.env', import.meta.url).pathname)
const API_URL = `${process.env.SUPABASE_URL}/rest/v1`
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!

// Object properties (as the frontend names them) and their table columns. Other properties are not stored.
// board_id is missing on purpose: an object always stays on the board it was created on.
const COLUMNS: Record<string, string> = {
  id: 'id', type: 'type', x: 'x', y: 'y', width: 'width', height: 'height',
  text: 'text', fontSize: 'font_size', bold: 'bold', color: 'color',
}

function toRow(object: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(object).filter(([key]) => key in COLUMNS).map(([key, value]) => [COLUMNS[key], value]),
  )
}

// Empty columns are left out, so a circle has no text, just like before.
function toObject(row: Record<string, unknown>) {
  const { font_size, board_id, created_at, ...rest } = row
  return Object.fromEntries(
    Object.entries({ ...rest, fontSize: font_size }).filter(([, value]) => value !== null),
  ) as BoardObject
}

function toBoard(row: Record<string, unknown>): Board {
  return { id: row.id as string, name: row.name as string, createdAt: row.created_at as string }
}

async function request(method: string, path: string, body?: unknown): Promise<Record<string, unknown>[]> {
  const response = await fetch(API_URL + path, {
    method,
    headers: { 'apikey': SECRET_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Supabase ${method} failed (${response.status}): ${await response.text()}`)
  return response.json()
}

const eq = (value: string) => `eq.${encodeURIComponent(value)}`

export async function listBoards() {
  return (await request('GET', '/boards?order=created_at.desc')).map(toBoard)
}

export async function getBoard(id: string) {
  const [board] = await request('GET', `/boards?id=${eq(id)}`)
  return board && toBoard(board)
}

export async function insertBoard(id: string, name: string) {
  const [board] = await request('POST', '/boards', { id, name })
  return toBoard(board!)
}

export async function renameBoard(id: string, name: string) {
  const [board] = await request('PATCH', `/boards?id=${eq(id)}`, { name })
  return board && toBoard(board)
}

// The database also deletes all objects on the board.
export async function deleteBoard(id: string) {
  const deleted = await request('DELETE', `/boards?id=${eq(id)}`)
  return deleted.length > 0
}

export async function listObjects(boardId: string) {
  return (await request('GET', `/objects?board_id=${eq(boardId)}&order=created_at,id`)).map(toObject)
}

export async function insertObject(boardId: string, object: BoardObject) {
  const [inserted] = await request('POST', '/objects', { ...toRow(object), board_id: boardId })
  return toObject(inserted!)
}

export async function updateObject(boardId: string, id: string, changes: Record<string, unknown>) {
  const { id: _ignored, ...rest } = changes
  const [updated] = await request('PATCH', `/objects?board_id=${eq(boardId)}&id=${eq(id)}`, toRow(rest))
  return updated && toObject(updated)
}

export async function deleteObject(boardId: string, id: string) {
  const deleted = await request('DELETE', `/objects?board_id=${eq(boardId)}&id=${eq(id)}`)
  return deleted.length > 0
}
