import type { Board } from '~/types/board'
import type { BoardObject, ObjectTemplate, Rect, StyleChanges, TextObject } from '~/types/canvas-object'

const TEXT_DEFAULTS = { text: '', fontSize: FONT_SIZES.M, bold: false }

// Starting attributes of a new object, per variant. Only variants with text get text attributes.
const DEFAULTS: Record<BoardObject['type'], Rect & Partial<TextObject>> = {
  'sticky-note': { x: 0, y: 0, width: GRID_SIZE * 8, height: GRID_SIZE * 8, ...TEXT_DEFAULTS },
  'text': { x: 0, y: 0, width: GRID_SIZE * 10, height: GRID_SIZE * 3, ...TEXT_DEFAULTS },
  'circle': { x: 0, y: 0, width: GRID_SIZE * 6, height: GRID_SIZE * 6 },
}

type ObjectChanges = Partial<Rect> & StyleChanges & { text?: string }

// Changes are sent to the backend after a short pause, so dragging or typing
// does not send one request per pixel or letter.
const SAVE_DELAY = 300
const pendingChanges = new Map<string, { changes: ObjectChanges; timer: ReturnType<typeof setTimeout> }>()

// The board state is the single source of truth for which board is open and which objects it has.
// Components only read it; every change goes through one of the functions below,
// which update the state right away and then tell the backend.
export function useBoard() {
  const api = $fetch.create({ baseURL: useRuntimeConfig().public.apiBase })
  const board = useState<Board | null>('board', () => null)
  const objects = useState<BoardObject[]>('objects', () => [])
  const objectsUrl = () => `/boards/${board.value!.id}/objects`

  // An unknown board leaves board empty, so the page can say so.
  async function load(id: string) {
    try {
      const [loadedBoard, loadedObjects] = await Promise.all([
        api<Board>(`/boards/${id}`),
        api<BoardObject[]>(`/boards/${id}/objects`),
      ])
      board.value = loadedBoard
      objects.value = loadedObjects
    }
    catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 404) throw error
      board.value = null
      objects.value = []
    }
  }

  function insert(object: BoardObject) {
    objects.value = [...objects.value, object]
    api(objectsUrl(), { method: 'POST', body: object })
  }

  function addObject(template: ObjectTemplate, centerX: number, centerY: number) {
    const defaults = DEFAULTS[template.type]
    const id = crypto.randomUUID()
    const x = snapToGrid(centerX - defaults.width / 2)
    const y = snapToGrid(centerY - defaults.height / 2)
    insert({ ...defaults, ...template, id, x, y } as BoardObject)
    return id
  }

  // Works for every variant: the copy keeps all attributes except the id.
  function addCopy(source: BoardObject) {
    const id = crypto.randomUUID()
    insert({ ...source, id })
    return id
  }

  function removeObject(id: string) {
    clearTimeout(pendingChanges.get(id)?.timer)
    pendingChanges.delete(id)
    objects.value = objects.value.filter(object => object.id !== id)
    api(`${objectsUrl()}/${id}`, { method: 'DELETE' })
  }

  function updateObject(id: string, changes: ObjectChanges) {
    objects.value = objects.value.map(object => (object.id === id ? ({ ...object, ...changes } as BoardObject) : object))
    scheduleSave(id, changes)
  }

  // Collects the changes per object and sends them together once nothing changed for SAVE_DELAY.
  function scheduleSave(id: string, changes: ObjectChanges) {
    const pending = pendingChanges.get(id)
    clearTimeout(pending?.timer)
    const merged = { ...pending?.changes, ...changes }
    // The url is taken now, so the save still reaches this board if another one is opened meanwhile.
    const url = `${objectsUrl()}/${id}`
    const timer = setTimeout(() => {
      pendingChanges.delete(id)
      api(url, { method: 'PATCH', body: merged })
    }, SAVE_DELAY)
    pendingChanges.set(id, { changes: merged, timer })
  }

  function moveObject(id: string, x: number, y: number) {
    updateObject(id, { x, y })
  }

  function resizeObject(id: string, rect: Rect) {
    updateObject(id, rect)
  }

  function updateText(id: string, text: string) {
    updateObject(id, { text })
  }

  function updateStyle(id: string, changes: StyleChanges) {
    updateObject(id, changes)
  }

  return { board: readonly(board), objects: readonly(objects), load, addObject, addCopy, removeObject, moveObject, resizeObject, updateText, updateStyle }
}
