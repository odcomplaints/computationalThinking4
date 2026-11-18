import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { addObject, getObjects, removeObject, updateObject } from './store.ts'

const PORT = 3001

const app = new Hono()

// The frontend runs on a different port, so the browser needs permission to call us.
app.use('/api/*', cors())

app.get('/api/objects', c => c.json(getObjects()))

// Used for new objects and copies: the client already chose the id.
app.post('/api/objects', async (c) => {
  addObject(await c.req.json())
  return c.body(null, 201)
})

// Used for moving, resizing, text and style changes.
app.patch('/api/objects/:id', async (c) => {
  updateObject(c.req.param('id'), await c.req.json())
  return c.body(null, 204)
})

app.delete('/api/objects/:id', (c) => {
  removeObject(c.req.param('id'))
  return c.body(null, 204)
})

serve({ fetch: app.fetch, port: PORT }, () => console.log(`Backend running on http://localhost:${PORT}`))
