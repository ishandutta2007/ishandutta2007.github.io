+++
title = "Easy, efficient, and practical queue implementation"
date  = "2024-02-24"
+++

From breadth-first search to task scheduling, queues are extremely useful in
computer programming. Although [many programming
languages](//en.wikipedia.org/wiki/Double-ended_queue#Operations) support them,
I think that it's important to understand and know how to implement them. I
like to implement data structures on-the-fly and customize them for the problem
I'm trying to solve. A more practical reason to understand queues is that
JavaScript doesn't have an efficient queue implementation.

<!-- more -->

I'll probably update this part later, but according to my programming
techniques syllabus, I'm going to learn how to implement stacks and queues
using linked lists. In paper, it makes lots of sense because the important
operations (enqueue, dequeue) have `O(1)` time complexity. But in reality, with
a naive linked list implementation---which I'm 100% sure I will be taught as
the de facto standard---every insertion is a heap allocation, which is
horrible, especially if your item is small. You can reduce allocations by
having each node store multiple items, which is what C++ and Python's
implementation does. A further optimization would be to reuse the nodes by
putting them in a [free
list](//www.gingerbill.org/article/2021/11/30/memory-allocation-strategies-005/).
You can use the linked list for both the queue and the free list! When you have
large objects, can't afford amortized time complexity, and don't have an
advanced memory allocator, a linked list queue implementation is actually
great. But the code will not be pretty, and there are other alternatives that
you should consider.

In this article, I'll introduce a queue implementation that:

- Has dynamic size, with amortized `O(1)` insertion complexity.
- `O(1)` complexity for everything else, including random access.
- Easy to understand and implement.
- Easy to extend into a [deque](//en.wikipedia.org/wiki/Double-ended_queue).
- Highly efficient on modern hardware.

This implementation is nothing new. It's called a growable ring buffer, and
it's how Rust and many other high-level languages implement queues and deques.

# The stack counterpart

In my experiences, queues are slightly more complicated than stacks. For
example, in the linked list implementation, you need an extra pointer to the
last node along with the pointer to the first one. So I think that it's easier
to show a stack implementation, which is more intuitive, then extrapolate it
for queues. 

It's very common to use a dynamic array, e.g., `std::vector` for a fast stack
implementation. So let's implement that from the ground up. For both the stack
and queue, we just need to implement the push and pop operations.

## Fixed stack with overflow

First, let’s remove the complexity of a dynamically sized stack and just
implement a static one. When there’s no more space, it will overflow. For this,
we need an array and a pointer or index pointing to the top of the stack.

```c,linenos
#define STACK_CAP 1024
typedef struct {
    Item data[STACK_CAP];

    uint32_t top;
} Stack;

bool Stack_push(Stack *stack, Item item) {
    if (stack->top == STACK_CAP) return false; // overflow

    stack->data[stack->top++] = item;
    return true;
}

Item *Stack_pop(Stack *stack) {
    if (stack->top == 0) return NULL; // underflow
    return stack->data + (--stack->top);
}
```

I use a 32-bit unsigned index instead of a pointer because on 64-bit machines I
can save some memory. You can implement more features, but that's the core of
it and what you mostly need. But currently its size is fixed, so let's try to
fix that with some heap memory.

## Dynamic-array based stack

For the stack to resize dynamically, you need to use a heap-allocated buffer
and store the current stack's capacity. When there's no more space, we can
add more by doubling the buffer using `realloc`.

```c,linenos
typedef struct {
    Item *data;

    uint32_t top;
    uint32_t cap;
} Stack;

Stack Stack_new(void) {
    return (Stack) {
        .data = malloc(sizeof(Item)),
        .top = 0,
        .cap = 1,
    };
}

void Stack_destroy(Stack stack) {
    free(stack.data);
}

void Stack_push(Stack *stack, Item item) {
    if (stack->top == stack->cap) {
        stack->data = realloc(stack->data, (stack->cap *= 2) * sizeof(Item));
    }

    stack->data[stack->top++] = item;
}

Item *Stack_pop(Stack *stack) {
    if (stack->top == 0) return NULL;
    return stack->data + (--stack->top);
}
```

There's a bit more code required for dynamic resizing. But in general, I think
that the implementation is still easy to understand. Small reallocation is
faster and happens more frequently, and large reallocation is slower and
happens less frequently. So on average, pushing into the stack is extremely
fast. This is the idea behind dynamic arrays, and why they have amortized
constant time complexity for appending an element to the end.

# Implementing queues

Now we know how to implement a stack using a fixed array and a pointer, and how
to expand the stack at runtime with heap memory. Let's apply this knowledge to
implementing queues. The idea is similar: first we build queues on top of a
static array, then we try to grow it.

## Fixed queue with circular buffer

Let’s first extending the fixed stack and turn it into a queue. To do this, we
need to use a data structure known as a [circular
buffer](//en.wikipedia.org/wiki/Circular_buffer). Instead of just having a
pointer pointing to the head of the stack, we use another one for the tail. And
the pointers cycle back to the start of the array instead of overflowing.

```c,linenos
#define QUEUE_CAP 1024
typedef struct {
    Item data[QUEUE_CAP];

    uint32_t head;
    uint32_t tail;
} Queue;

void Queue_push(Queue *queue, Item item) {
    queue->data[queue->head] = item;
    queue->head = (queue->head + 1) % QUEUE_CAP;
}

Item *Queue_pop(Queue *queue) {
    Item *item = queue->data + queue->tail;
    queue->tail = (queue->tail + 1) % QUEUE_CAP;
    return item;
}
```

Because the pointers always point to valid memory, we don’t have to manually
handle overflow and underflow. Currently, the queue will overwrite data when it
overflows and return garbage data when it's empty. But they are data that the
queue owns, so that won’t be a problem. However, it’s more convenient if we can
detect overflow, and we need it to resize the queue later anyways. One way to
do this is to keep track of the size of the array.

```diff
#define QUEUE_CAP 1024
typedef struct {
    Item data[QUEUE_CAP];

    uint32_t head;
    uint32_t tail;
+   uint32_t len;
} Queue;

-void Queue_push(Queue *queue, Item item) {
+bool Queue_push(Queue *queue, Item item) {
+   if (queue->len == QUEUE_CAP) return false; // overflow
    queue->data[queue->head] = item;
    queue->head = (queue->head + 1) % QUEUE_CAP;
+   ++queue->len;
+   return true;
}

Item *Queue_pop(Queue *queue) {
+   if (queue->len == 0) return NULL; // underflow
    Item *item = queue->data + queue->tail;
    queue->tail = (queue->tail + 1) % QUEUE_CAP;
+   --queue->len;
    return item;
}
```

So to turn a stack into a queue, we have to keep track of two more variables.
There are other ways to remove the length and only use the head and tail by
keeping `tail != head`, but this doesn’t feel very natural to me. The modulo
operation to cycle the pointers back to the start is expensive, but we can
optimize it by using a power-of-two capacity and a bitwise operator to speed it
up.

```c
bool Queue_push(Queue *queue, Item item) {
    if (queue->len == QUEUE_CAP) return false; // overflow
    queue->data[queue->head] = item;
    queue->head = (queue->head + 1) & (QUEUE_CAP - 1);
    ++queue->len;
    return true;
}
```

I don’t know if compilers can automatically detect and optimize power-of-two
modulos into bitwise operations, but it’s safer to just do them yourself. From
now on, I’ll assume that you’re using a power-of-two capacity and bitwise
operations.

## Resizing the queue

Resizing the stack array is easy: just give it more memory. For queues,
however, as the pointers wrap around, we need to unwrap them after we allocate
more memory so that the queue doesn't overwrite itself.

```
Before:
[ D E F G H A B C ]
            |
tail: ------+
head: ------+

Resize:
[ D E F G H A B C _ _ _ _ _ _ _ _ ]
            |
tail: ------+
head: ------+

Unwrap:
[ _ _ _ _ _ A B C D E F G H _ _ _ ]
            |               |
tail: ------+               |
head: ----------------------+
```

This can be done easily and efficiently with `realloc` and `memcpy`.

```c,linenos
typedef struct {
    Item *data;
    uint32_t head;
    uint32_t tail;

    uint32_t len;
    uint32_t cap;
} Queue;

Queue Queue_new(void) {
    return (Queue) {
        .data = malloc(sizeof(Item)),
        .head = 0,
        .tail = 0,
        
        .len = 0,
        .cap = 1
    };
}

void Queue_destroy(Queue queue) {
    free(queue.data);
}

void Queue_push(Queue *queue, Item item) {
    if (queue->len == queue->cap) {
        queue->data = realloc(queue->data, (queue->cap <<= 1) * sizeof(Item));
        memcpy(queue->data + queue->len, queue->data, queue->head * sizeof(Item));
        queue->head += queue->len;
    }
    queue->data[queue->head] = item;
    queue->head = (queue->head + 1) & (queue->cap - 1);
    ++queue->len;
}

Item *Queue_pop(Queue *queue) {
    if (queue->len == 0) return NULL;
    Item *item = queue->data + queue->tail;
    queue->tail = (queue->tail + 1) & (queue->cap - 1);
    --queue->len;
    return item;
}
```

That's the entire implementation of the queue. It looks quite long, but the
core part---the `push` and `pop` functions---are less than 20 lines of code.
The rest, like memory layout and initialization, are trivial and easy to
remember. Because the data is stored in a contiguous block of memory, the
performance is great, and we don't have to aggressively optimize it like the
linked list implementation.

Currently, we push items to the head and remove them from the tails, but you
can easily do the opposite. Just decrement the pointers instead, and doing it
before dereferencing. If you implement all four operations, then you have
effectively turned the queue into a double-ended queue! Other than the code
size, there’s no overhead to doing it.

## JavaScript implementation

At the start of the article, I mentioned the lack of a native, efficient queue
implementation in JavaScript. So here’s one using this technique:

```js,linenos
class Queue {
    #start = 0
    #end = 0
    #len = 0

    #cap = 1 << 10

    #data = new Array(this.#cap)

    enqueue(item) {
        if (this.#len == this.#cap) {
            this.#data = this.#data.concat(this.#data)
            this.#end += this.#cap
            this.#cap <<= 1
        }
        this.#start = (this.#start - 1) & (this.#cap - 1)
        this.#len++
        this.#data[this.#start] = item
    }

    dequeue() {
        if (this.#len == 0) return null
        this.#end = (this.#end - 1) & (this.#cap - 1)
        this.#len--
        return this.#data[this.#end]
    }
}
```

It’s the same as the C variant, but I push items backward into the queue
because it’s more convenient to return the item when performing dequeue. Also,
to resize it, all I have to do is
[concatenate](//developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat)
the buffer with itself. Doing that is very close to a native memory operation
and should be really fast.

# Conclusion

If you ever need a queue and your programming language doesn’t provide one,
then a growable ring buffer is a good choice. It’s fast, easy to implement, and
you can extend it into a double-ended queue with no overhead. However, like
with dynamic arrays, sometimes you know or can compute the upper bound of how
many items can be inside the queue at a given moment; e.g., with BFS, the
maximum is the number of nodes in the graph. In that case, it’s better to use a
static ring buffer, either stack or heap allocated, instead. You should also
consider other stack and queue implementations, even linked list ones, as they
might fit your constraints better.
