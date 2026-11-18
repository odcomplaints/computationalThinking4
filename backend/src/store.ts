import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

// The backend does not need to know the variants: an object is anything with an id.
export type BoardObject = { id: string } & Record<string, unknown>

const DATA_DIR = new URL('../.data/', import.meta.url)
const DATA_FILE = new URL('board.json', DATA_DIR)

// What a fresh board looks like before anything has been saved.
const INITIAL_OBJECTS: BoardObject[] = [
  { id: 'note-1', type: 'sticky-note', x: 120, y: 120, width: 192, height: 192, text: 'Hello, board!', color: 'yellow', fontSize: 18, bold: false },
  { id: 'note-2', type: 'sticky-note', x: 360, y: 120, width: 192, height: 192, text: 'Drag me around', color: 'pink', fontSize: 18, bold: false },
  { id: 'text-1', type: 'text', x: 600, y: 120, width: 240, height: 72, text: 'Just some text', fontSize: 18, bold: false },
  { id: 'circle-1', type: 'circle', x: 600, y: 240, width: 144, height: 144, color: 'blue' },
]

// The board lives in memory and is written to a JSON file after every change,
// so it survives a restart of the server.
let objects: BoardObject[] = existsSync(DATA_FILE) ? JSON.parse(readFileSync(DATA_FILE, 'utf8')) : INITIAL_OBJECTS

function save() {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(objects, null, 2))
}

export function getObjects() {
  return objects
}

export function addObject(object: BoardObject) {
  objects = [...objects, object]
  save()
}

export function updateObject(id: string, changes: Partial<BoardObject>) {
  objects = objects.map(object => (object.id === id ? { ...object, ...changes, id } : object))
  save()
}

export function removeObject(id: string) {
  objects = objects.filter(object => object.id !== id)
  save()
}
