const containers = document.querySelectorAll(".intro__tile__container")

const animation_classes = ["slide-right", "slide-left", "slide-down", "slide-up"]

const SIZE = 3

let current = SIZE * SIZE - 1
let last = -1
let current_el = containers[current]

function step() {
  const nexts = new Array(4)
  let nexts_len = 0

  const row = ~~(current / SIZE)
  const col = ~~(current % SIZE)

  if (col > 0 && current - 1 != last) {
    nexts[nexts_len++] = [0, current - 1]
  }
  if (col < SIZE - 1 && current + 1 != last) {
    nexts[nexts_len++] = [1, current + 1]
  }
  if (row > 0 && current - SIZE != last) {
    nexts[nexts_len++] = [2, current - SIZE]
  }
  if (row < SIZE - 1 && current + SIZE != last) {
    nexts[nexts_len++] = [3, current + SIZE]
  }

  const [dir, next_empty] = nexts[~~(nexts_len * Math.random())]

  const next = containers[next_empty]

  const child = next.firstElementChild
  child.classList.remove(...animation_classes)
  child.classList.add(animation_classes[dir])

  current_el.appendChild(child)

  last = current
  current = next_empty
  current_el = next

  setTimeout(step, 1000 * Math.random() + 1000)
}

step()
