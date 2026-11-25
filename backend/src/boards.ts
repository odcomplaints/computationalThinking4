import { Hono } from 'hono'
import { deleteBoard, getBoard, insertBoard, listBoards, renameBoard } from './storage.js'

// REST routes for the boards. Newest boards come first.
export const boards = new Hono()

const isName = (name: unknown): name is string => typeof name === 'string' && name.trim() !== ''

boards.get('/', async c => c.json(await listBoards()))

boards.get('/:id', async (c) => {
  const board = await getBoard(c.req.param('id'))
  if (!board) return c.json({ error: 'Board not found' }, 404)
  return c.json(board)
})

boards.post('/', async (c) => {
  const { id, name } = await c.req.json()
  if (typeof id !== 'string') return c.json({ error: 'Board needs an id' }, 400)
  if (!isName(name)) return c.json({ error: 'Board needs a name' }, 400)
  if (await getBoard(id)) return c.json({ error: 'A board with this id already exists' }, 409)
  return c.json(await insertBoard(id, name.trim()), 201)
})

boards.patch('/:id', async (c) => {
  const { name } = await c.req.json()
  if (!isName(name)) return c.json({ error: 'Board needs a name' }, 400)
  const renamed = await renameBoard(c.req.param('id'), name.trim())
  if (!renamed) return c.json({ error: 'Board not found' }, 404)
  return c.json(renamed)
})

boards.delete('/:id', async (c) => {
  const deleted = await deleteBoard(c.req.param('id'))
  if (!deleted) return c.json({ error: 'Board not found' }, 404)
  return c.body(null, 204)
})
