import type { Board } from '~/types/board'

const NEW_BOARD_NAME = 'Unbenanntes Board'

// The list of all boards for the overview page. Like useBoard, every change updates the state
// right away and then tells the backend. Only creating waits, so the new board exists before it opens.
export function useBoards() {
  const api = $fetch.create({ baseURL: useRuntimeConfig().public.apiBase })
  const boards = useState<Board[]>('boards', () => [])

  async function load() {
    boards.value = await api<Board[]>('/boards')
  }

  async function create() {
    const id = crypto.randomUUID()
    await api('/boards', { method: 'POST', body: { id, name: NEW_BOARD_NAME } })
    return id
  }

  function rename(id: string, name: string) {
    boards.value = boards.value.map(board => (board.id === id ? { ...board, name } : board))
    api(`/boards/${id}`, { method: 'PATCH', body: { name } })
  }

  // The backend also deletes all objects on the board.
  function remove(id: string) {
    boards.value = boards.value.filter(board => board.id !== id)
    api(`/boards/${id}`, { method: 'DELETE' })
  }

  return { boards: readonly(boards), load, create, rename, remove }
}
