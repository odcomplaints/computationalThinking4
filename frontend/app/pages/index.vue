<script setup lang="ts">
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import type { Board } from '~/types/board'

const { boards, load, create, rename, remove } = useBoards()
await load()

// Which board is being renamed right now, and the name typed so far.
const renamingId = ref<string | null>(null)
const draftName = ref('')

// Focuses the rename field as soon as it appears, with the old name selected.
const vFocus = { mounted: (input: HTMLInputElement) => input.select() }

async function onCreate() {
  await navigateTo(`/boards/${await create()}`)
}

function startRename(board: Board) {
  renamingId.value = board.id
  draftName.value = board.name
}

// An empty name keeps the old one.
function finishRename(board: Board) {
  if (renamingId.value !== board.id) return
  renamingId.value = null
  const name = draftName.value.trim()
  if (name && name !== board.name) rename(board.id, name)
}

function onRemove(board: Board) {
  if (confirm(`Board „${board.name}“ und alle Objekte darauf löschen?`)) remove(board.id)
}
</script>

<template>
  <main class="mx-auto max-w-xl px-4 py-12">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Boards</h1>
      <Button @click="onCreate">
        <Plus /> Neues Board
      </Button>
    </div>

    <p v-if="boards.length === 0" class="text-muted-foreground">Noch keine Boards.</p>

    <ul class="divide-y rounded-xl border">
      <li v-for="board in boards" :key="board.id" class="flex items-center gap-2 px-4 py-3">
        <input
          v-if="renamingId === board.id"
          v-model="draftName"
          v-focus
          class="flex-1 rounded-md border px-2 py-1"
          aria-label="Board-Name"
          @keydown.enter="finishRename(board)"
          @keydown.escape="renamingId = null"
          @blur="finishRename(board)"
        >
        <NuxtLink v-else :to="`/boards/${board.id}`" class="flex-1 font-medium hover:underline">
          {{ board.name }}
        </NuxtLink>
        <Button variant="ghost" size="icon-sm" aria-label="Board umbenennen" @click="startRename(board)">
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Board löschen" @click="onRemove(board)">
          <Trash2 />
        </Button>
      </li>
    </ul>
  </main>
</template>
