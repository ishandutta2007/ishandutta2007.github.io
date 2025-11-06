+++
title = "Struct of Arrays (SoA) in TypeScript with metaprogramming"
date  = "2025-09-17"
+++


Struct of Arrays (SoA) is the bread and butter and textbook example of
[Data-oriented design](//en.wikipedia.org/wiki/Data-oriented_design). It's
mostly popular in [game development](//unity.com/dots) due to enhanced
performance in many gamedev specific operations. You might also encounter SoAs
in analytic and processing heavy databases such as
[Pandas](//pandas.pydata.org/) or [DuckDB](//duckdb.org/). Of course, in the
web development space nobody cares about data layout and optimization. Despite
that, I wrote an SoA library in TypeScript, not for the performance gain, but
for trying out TypeScript's type-level metaprogramming.

<!-- more -->

# Why do we need SoA

I won't go too in-depth about the difference between Struct of Arrays (SoA) and
Array of Structs (AoS). The gist of it is to store each struct field in
separate arrays, which has the following benefits:

- No padding between array items
- Easier parallelism thanks to homogenous data
- Improve cache usage when only some fields are needed for a computation

In JavaScript, we get even more benefits thanks to typed arrays

- More compact and stored contiguously, reducing memory consumption
- Allows for smaller types than 64-bit floating-point numbers

Here's an example of the difference between AoS and SoA in TypeScript. This is
the AoS approach, where we use a single array to store all fields.

```ts
type Monster = {
  x: number
  y: number

  hp: number
}

const monsters = new Array<Monster>()

monsters.push({
  x: 0,
  y: 0,
  hp: 100,
})
```

This is clear and intuitive, but let's take a look at an operation: counting
alive monsters


```ts
function countAlive(monsters: readonly Monster[]): number {
  let count = 0
  for (const { hp } of monsters) {
    if (hp > 0) count += 1
  }
  return count
}
```

With the current V8 engine, the runtime has to iterate over the `monsters`
array, follow the pointer to get the actual `Monster` object, and access the
`hp` property. This pollutes the cache with unnecessary information such as the
monsters' coordinates, while the upcoming `hp` are not loaded. In contrast with
the SoA approach:

```ts
type Monsters = {
  x: Float32Array
  y: Float32Array
  hp: Uint8Array
}

const monsters: Monsters = /* ... */
```

The first difference is that the fields are properly typed with the exact
numeric type, and it uses way less memory than the AoS approach --- 9 bytes per
element instead of at least 32 bytes. Also, counting alive monsters is
significantly more optimized:

```ts
function countAlive(monsters: Monsters): number {
  let count = 0
  for (const hp of monsters.hp) {
    if (hp > 0) count += 1
  }
  return count
}
```

There's no more pointer chasing, no more property access, no more cache
pollution, just a simple, sequential memory access. However like always,
there's a catch. With the AoS approach, adding an element to the monster list
is easy:

```ts
function addMonster(monsters: Monster[], monster: Monster) {
  monsters.push(monster)
}
```

For the SoA with typed arrays, to begin with, how do you even push an element
to the end of typed arrays? You'll have to write dynamic array implementation
on top of typed array. It's actually quite simple, as I covered
[before](/blog/queue/), but then you need to make sure that you push to all
arrays and that they are synchronized:

```ts
function addMonster(monsters: Monsters, monster: Monster) {
  monsters.x.push(monster.x)
  monsters.y.push(monster.y)
  monsters.hp.push(monster.hp)
}
```

This is one of the reasons why some people want SoAs to be a first-class
language feature so that we can use them with better ergonomics. In other
words, we want the performance of SoAs while retaining the intuitiveness of
AoSs. I wanted to see if this is possible with TypeScript metaprogramming.

# Implementation

When I design modules, I usually start with imagining how I'm going to use it.
In this case, we need to support the following basic operations:

1. Access/modify an array corresponding to a struct field
2. Access/modify an element at a specified index
3. Push an "item" to the end of the array
4. Remove and return the last element of the array

Only the first operation is unique to this data structure, so I mostly focused
on it. I decided to call it `view`, as we are "viewing" into the underlying
layout of the array. Using the previous example, here's how I'd like to use
this operation:

```ts
const {x, y, hp} = monsters.view()
```

Note that `x`, `y`, and `hp` must be of the correct type, `Float32Array`,
`Float32Array`, and `Uint8Array`, respectively. The `Monsters` type above is in
this type already, so our class needs to behave as follows:

```ts
monsters.view() => Monsters
```

One way to do this is to directly store the object:

```ts
class SoAMonsters {
  data: Monsters

  view(): Readonly<Monsters> {
    return this.data
  }
}
```

The view is marked as `Readonly` not because we can't write to the data, but
because we want to disallow changing the properties themselves (JS/TS
immutability is weird, I know):

```ts
monsters.view().x = new Float32Array() // should give type error
```

However, you'll soon realize that certain operations require iterating over the
properties, so it's better to store the data as an array instead of an object.
And we can reconstruct the objects using another keys array.

```ts
class SoAMonsters {
  keys = ['x', 'y', 'hp'] as const

  data: [Float32Array, Float32Array, Uint8Array]

  view(): Readonly<Monsters> {
    const result = {}
    for (let i = 0; i < keys.length; ++i) {
      result[keys[i]] = data[i]
    }
    return result
  }
}
```

The TypeScript compiler isn't happy with this, as we are writing dynamic
properties to an object. We can get around this using the `Record` helper type
and type assertion. It's not more type-safe, but it tells the compiler to shut
up.

```ts
class SoAMonsters {
  // -- snip --
  view(): Readonly<Monsters> {
    const result: Record<string, ArrayLike<Number>> = {}

    for (let i = 0; i < keys.length; ++i) {
      result[keys[i]] = data[i]
    }

    return result as Monsters
  }
  // -- snip --
}
```

With this representation, accessing/modifying data at an arbitrary index is
also similar:

```ts
class SoAMonsters {
  // -- snip --
  get(index: number): Monster {
    const result: Record<string, number> = {}

    for (let i = 0; i < keys.length; ++i) {
      result[keys[i]] = data[i][index]
    }

    return result as Monster
  }

  get(index: number, item: Monster): void {
    for (let i = 0; i < keys.length; ++i) {
      data[i][index] = item[keys[i]]
    }
  }
  // -- snip --
}
```

Note that this constructs/decomposes an object every operation, so it is likely
to be very slow. But it makes working with the array a bit easier; just try to
avoid them in tight loops.

## Initialize, push and memory allocation

I'd argue that for an SoA abstraction, size-affecting operations are the most
important, as it ensures that the backing arrays are all consistent and
synchronized. In [another article](/blog/queue), I demonstrated how to create a
dynamic array with the push-to-end operation. Here's a simplified
implementation in JavaScript:

```ts
function reallocate(array, constructor, capacity) {
  const newArray = new constructor(capacity)
  newArray.set(array)
  return newArray
}

class Stack {
  data: Uint32Array
  len: number

  push(item) {
    if (this.len == this.data.length) {
      this.data = reallocate(this.data, Uint32Array, this.data.length << 1)
    }
    this.data[this.len] = item
    this.len += 1
  }
}
```

Ignoring the missing type definitions in the `reallocate` function, if we were
to extrapolate this to SoA, we get the following:

```ts
class SoAMonsters {
  keys = ["x", "y", "hp"] as const
  constructors = [Float32Array, Float32Array, Uint8Array] as const

  data: InstanceType<typeof this.constructors>
  len: number
  capacity: number

  push(item: Monster) {
    if (this.len == this.capacity) {
      this.capacity <<= 1

      for (let i = 0; i < this.data.length; ++i) {
        this.data[i] = reallocate(this.data[i], this.constructors[i], this.capacity)
      }
    }

    this.set(this.len, item)
    this.len += 1
  }
}
```

If you noticed, this is our first usage of type-system metaprogramming, the
`typeof` keyword, `as const` operator, and `InstanceType` utility type. We'll
dive deeper into it later when we generalize the array to support arbitrary
object shapes. But for now it's used so that we don't have to define the
constructors and types separately.

Finally, let's initialize the array and start pushing items into it. I strictly
follow the static factory method over constructor principle, which I might
write about in the future.

```ts
class SoAMonsters {
  private keys = ["x", "y", "hp"] as const
  private constructors = [Float32Array, Float32Array, Uint8Array] as const

  private constructor(
    private data: InstanceType<typeof this.constructors>,
    private size: number,
    private capacity: number,
  ) {}

  get len() {
    return this.size
  }

  static withCapacity(capacity: number): SoAMonsters {
    return new SoAMonsters(constructors.map(x => new x(capacity)), 0, capacity)
  }

  static init(): SoAMonsters {
    return SoAMonsters.withCapacity(4)
  }
  // -- snip --
}
```

This avoids the confusion between initialization with a preallocated capacity
and initialization with an existing length (like `new Array(length)`) among
other things. Notice that I also made all properties private, the length
read-only, and used `size` as the internal name.

This works, but we can optimize it further. Instead of allocating a typed array
for each property, we can just allocate a single, large array buffer. Then, for
each property, we create a non-overlapping view onto the allocated array
buffer. You can think of it as allocating the typed arrays from an
[arena](/blog/arena) instead of arbitrarily from the heap.

```ts
function allocateArrays(constructors, capacity) {
  let size = 0
  for (let i = 0; i < constructors.length; ++i) {
    const elemSize = constructors[i].BYTES_PER_ELEMENT
    size = (size + elemSize - 1) & -elemSize
    size += capacity * elemSize
  }

  const buffer = new ArrayBuffer(size)
  const result = new Array(constructors.length)
  let offset = 0
  for (let i = 0; i < constructors.length; ++i) {
    const elemSize = constructors[i].BYTES_PER_ELEMENT
    offset = (offset + elemSize - 1) & -elemSize
    result[i] = new constructors[i](buffer, offset, capacity)
    offset += capacity * elemSize
  }

  return result
}
```

Notice that we need to align the buffer, just like with the arena allocator.
Then we can update the initialization and reallocation code to use the new
allocation strategy.

```ts
function reallocate(arrays, constructors, capacity) {
  const data = allocateArrays(constructors, capacity)
  for (let i = 0; i < data.length; ++i) {
    data[i].set(arrays[i])
  }
  return data
}

class SoAMonsters {
  // -- snip --
  static withCapacity(capacity: number): SoAMonsters {
    return new SoAMonsters(allocateArrays(constructors, capacity), 0, capacity)
  }

  static init(): SoAMonsters {
    return SoAMonsters.withCapacity(4)
  }

  push(item: Monster): void {
    if (this.len == this.capacity) {
      this.capacity <<= 1
      this.data = reallocate(this.data, this.constructors, this.capacity)
    }

    this.set(this.len, item)
    this.len += 1
  }
  // -- snip --
}
```

That's basically it. Implementing "pop", or removing and returning the last
item, is left as an exercise for the reader.

# Generalize to arbitrarily shape

Now let's get to the good part, using type-level metaprogramming to fill in the
missing type annotations and generalize the data structure. We can start with
defining the layout of the monster object.

```ts
type MonsterLayout = {
  x: 'f32'
  y: 'f32'
  hp: 'u8'
}
```

Now we need to think of a constraint for the layout. Here's what I came up with:

1. It must be an object type
2. The key can be any arbitrary string
3. The value must be one of the values corresponding to the available typed
   array

To address the first two constraints, we can use the `Record` like we used
above, and for the final constraint, we can use a union. But since the values
are related to the available typed array, let's make a mapping and
automatically generate types.

```ts
const arrayTypes = {
  'i8': Int8Array,
  'u8': Uint8Array,
  'i16': Int16Array,
  'u16': Uint16Array,
  'i32': Int32Array,
  'u32': Uint32Array,
  'f32': Float32Array,
  'f64': Float64Array,
} as const

type Constraint = Record<string, keyof typeof arrayTypes>
```

Notice that we used a value object, which is not erased during TypeScript
transpilation. This is because we might use it later for looking up the typed
array constructors. Taking the `typeof` operator gives us a mapped type from a
string union to typed array constructors. Taking the `keyof` operator gives us
the union itself, which evaluates to

```ts
'i8' | 'u8' | 'i16' | 'u16' | 'i32' | 'u32' | 'f32' | 'f64'
```

Using this as the record value restricts the layout to these values. And we can
ensure that we can use these values to index the `arrayTypes` object. We can
also get the constructors and a union of typed arrays similarly.

```ts
type Constructors = (typeof arrayTypes)[keyof typeof arrayTypes]
type ArrayTypes = InstanceType<Constructors>
```

If `keyof T` returns the key of a mapped type, then `T[keyof T]` returns the
values. This is pretty straightforward and reflects property access at run
time. Notice that the type of, for example, `Uint32Array` is
`Uint32ArrayConstructor`. this is because the `arrayTypes` object operates in run
time, so we are dealing with the actual value `Uint32Array` which is a
constructor. To get back the class, we can use the utility type `InstanceType`.

This gives us the types needed to annotate the functions above, such as

```ts
function allocateArrays(
  constructors: ArrayLike<Constructors>,
  capacity: number,
): ArrayTypes[]


function reallocate(
  old: ArrayLike<ArrayTypes>,
  constructors: ArrayLike<Constructors>,
  capacity: number,
): ArrayTypes[]
```

With the constraint defined, we can start writing the generic class:

```ts
class ParallelArray<T extends Constraint> {
  private constructor(
    private readonly constructors: Constructors[],
    private readonly keys: (keyof T)[],
    private data: ArrayTypes[],
    private size: number,
    private capacity: number,
  ) {}

  static init<T1 extends Constraint(): ParallelArray<T1> {
    return ParallelArray.withCapacity<T1>(4)
  }

  static withCapacity<T1 extends Constraint>(
    capacity: number
  ): ParallelArray<T1> {
    // not implemented
  }
}

type MonsterLayout = {
  x: 'f32'
  y: 'f32'
  hp: 'u8'
}

const monsters = ParallelArray.init<MonsterLayout>()
```

This seems like a solid interface, but you'll soon realize that you can't do
anything with the generic parameter other than define types. Implementing the
`init` function is impossible because we didn't pass in anything. This gives us
an important takeaway of TypeScript type-level metaprogramming: You can
generate types from values, but not the other way around. So you have to move
as much logic to the value-level as possible, even though it's called
type-level metaprogramming. This is one of TypeScript's limitations, but in
this case it's easy to get around. We can make the layout a run time parameter
and let the type system infer the generic parameter.

```ts
class ParallelArray<T extends Constraint> {
  // -- snip --
  
  static init<T1 extends Constraint(layout: T1): ParallelArray<T1> {
    return ParallelArray.withCapacity<T1>(4)
  }

  static withCapacity<T1 extends Constraint>(
    layout: T1,
    capacity: number,
  ): ParallelArray<T1> {
    // not implemented
  }
}


// NOTE: const, not type
const monsterLayout = {
  x: 'f32',
  y: 'f32',
  hp: 'u8',
} as const

const monsters = ParallelArray.init(monsterLayout)
```

With the layout as a concrete value, we can finally implement `withCapacity`:

```ts
class ParallelArray<T extends Constraint> {
  // -- snip --
  static withCapacity<T1 extends Constraint>(
    layout: T1,
    capacity: number,
  ): ParallelArray<T1> {
    const keys = Object.keys(layout)
    const constructors = keys.map((k: keyof T1) => arrayTypes[layout[k]])

    return new ParallelArray<T1>(
      constructors,
      keys,
      allocateArrays(constructors, capacity),
      0,
      capacity,
    )
  }
}
```

The implementation is smilar to before. The only difference is that we have to
populate the read-only properties `keys` and `constructors` from the layout
type. You can see that some duplicate code started to emerge:

```ts
class ParallelArray<T extends Constraint> {
  // -- snip --
  private readonly keys: (keyof T)[]
  // -- snip --

  static withCapacity<T1 extends Constraint>(
    layout: T1,
    capacity: number,
  ): ParallelArray<T1> {
    // -- snip --
    const key = Object.keys(layout)
    // -- snip --
  }
  // -- snip --
}
```

We have to both define the type of `keys` as `keyof T` type and initialize the
value with `Object.keys(layout)` where `layout` is of type `T`. Similar story
with `constructors` and it's even worse. This happens a lot with TypeScript,
and the only way is to keep the type-level logic as minimal as possible and let
type inference do its thing.

## Type transformation

Finally, we need to generalize the `Monster` and `Monsters` types. The first
one is a record with the same keys as the layout and number values, so
implementing it is straightforward.

```ts
type Item<T extends Constraint> = Record<keyof T, number>

type Monster = Item<typeof monsterLayout>
```

With the `Item<T>` generic type, we can implement the `get`, `set`, `push`,
`pop` methods. I'll only show the method signature; the implementation is the
same as above.

```ts
class ParallelArray<T extends Constraint> {
  get(idx: number): Item<T>
  set(idx: number, item: Item<T>): void
  push(item: Item<T>): void
  pop(): Item<T> | undefined
}
```

For the `Monsters` type, it's also a record, but the values depend on the keys
based on the `arrayTypes` object, so we need to create our own mapped type.

```ts
type View<T extends Constraint> = {
  [K in keyof T]: InstanceType<(typeof arrayTypes)[T[K]]>
}
```

This is a bit convoluted, so let's break down a concrete example: the monster
layout that we've been working with.

```ts
const monsterLayout = {
  x: 'f32',
  y: 'f32',
  hp: 'u8',
} as const

type Monsters = View<typeof monsterLayout>
```

In this case, `T` is `typeof monsterLayout`, which is the type that only
accepts the value of `monsterLayout`. You can think of it as the same thing but
operates on type-level. Therefore, `keyof T` is the union containing all keys
of `monsterLayout`, in other words:

```ts
'x' | 'y' | 'hp'
```

The syntax of mapped type `{[K in keyof T] ...}` means that we iterate over all
possible values of `keyof T`, and construct a corresponding value for each
value of `K`. The `Monsters` type will be expanded as follows:

```ts
type Monsters = {
  'x': InstanceType<(typeof arrayTypes)[(typeof monsterLayout)['x']]>,
  'y': InstanceType<(typeof arrayTypes)[(typeof monsterLayout)['y']]>,
  'hp': InstanceType<(typeof arrayTypes)[(typeof monsterLayout)['hp']]>,
} 
```

We can slowly deconstruct this type, starting with this syntax
`(typeof obj)[key]`. This is equivalent to `typeof obj[key]`, so we can look up
the `monsterLayout` and `arrayTypes` objects.

```ts
type Monsters = {
  'x': InstanceType<(typeof arrayTypes)[typeof 'f32']>,
  'y': InstanceType<(typeof arrayTypes)[typeof 'f32']>,
  'hp': InstanceType<(typeof arrayTypes)[typeof 'u8']>,
} 
```

But `u8` and `f32` are literal types, so we can drop the `typeof`, giving us

```ts
type Monsters = {
  'x': InstanceType<typeof Float32Array>,
  'y': InstanceType<typeof Float32Array>,
  'hp': InstanceType<typeof Uint8Array>,
} 
```

We already established that taking the type of a concrete class value gives its
constructor, and the `InstanceType` utility type gives us back the class type.

```ts
type Monsters = {
  'x': Float32Array,
  'y': Float32Array,
  'hp': Uint8Array,
} 
```

This is exactly the `Monsters` type we manually defined before, and hopefully
you can see how it will work with any objects that satisfies `Constraint`. From
the `View<T>` type, you can annotate and implement the `view` method. So this
concludes the implementation of the `ParallelArray` class.

# Extra features

Here are some extra features that I left out of this article. Mainly because
they are not specific to the idea of SoA and can be trivially implemented from
the described methods above.

- **Resizing:** Modify the array so that its length becomes a specified length.
  If the new length is smaller, the array is truncated; otherwise, the array is
  padded with zero.
- **Power of 2 size:** The internal array buffer is aligned to have
  power-of-two capacity. It may or may not affect performance, and it's just a
  matter of taste.
- **Lazy view updating:** The view is only changed after some operations:
  `push`, `pop`, `resize`, etc. So these operations mark the view as dirty, and
  they are corrected when requested. Otherwise, a cached view is used.
- **Out parameter for get and pop:** This is only for marginally improving the
  performance of single element indexing, especially when the out object is
  reused.
- **Copying:** Create a separate copy of the array with the same data. This is
  extremely fast thanks to typed arrays.

There are also some other useful features that I haven't implemented:

- **Slicing:** Creating subarray references is very useful and makes the
  implementation of several algorithms extremely clean. However, implementing
  this requires creating a fixed-size variant of the array, which requires
  careful consideration.
- **Sorting:** Naturally, this data structure is not compatible with the native
  `Array.prototype.sort`, but this can be implemented using index sorting and
  in-place permutation. Also, for integer values, we can use radix sort, which
  may or may not be faster than the native JavaScript sorting algorithm. This
  is very interesting, and I'll make sure to implement and perform benchmarks
  in the future.
- **Arbitrary insert/remove:** I don't use this often, or at all, actually, so
  I don't bother implementing it. If you need to use this feature, consider
  alternative data representation (even linked lists).

# Microbenchmarks

While the reduced memory usage benefit is crystal clear, I can't make any claim
about performance without proper measurement. I planned on conducting more
elaborate tests later, but for now microbenchmarks are all that we have. For
this, we'll use the following layout:

```ts
const particleLayout = {
  id: 'u32',
  x: 'f32',
  y: 'f32',
  vx: 'f32',
  vy: 'f32',
} as const

type Particle = Item<typeof particleLayout>

type ParticlesSoA = ParallelArray<typeof particleLayout>
type ParticlesAoS = Particle[]
```

We'll test the following operations:

1. Fill an array with `push`
2. Fill an array by resizing and assigning in a loop
3. Access elements with `get` (wide)
4. Access elements with `view` (narrow)
5. Copying

I tested with 1 million random items. For the read tests, I tested both random
access and sequential access patterns. For more information about the test
procedure, take a look at the [benchmark
file](//github.com/ziap/parallel-array/blob/master/src/bench.ts).

| Benchmark                | Array of Objects (AoS) | Parallel Array (SoA) | Difference |
| ------------------------ | ---------------------- | -------------------- | ---------- | 
| push                     | 92.3 ms                | **85.4 ms**          | 1.08x      |
| push (withCapacity)      | -                      | **79.9 ms**          | 1.16x      |
| resize + assign          | 41.8 ms                | **24.9 ms**          | 1.68x      |
| wide read (sequential)   | **6.4 ms**             | 50.4 ms              | **7.87x**  |
| wide read (random)       | **167.3 ms**           | 180.5 ms             | 1.07x      |
| narrow read (sequential) | 5.5 ms                 | **0.7 ms**           | **7.85x**  |
| narrow read (random)     | 148.1 ms               | **9.9 ms**           | **14.96x** |
| copy                     | 34.1 ms                | **7.6 ms**           | **4.49x**  |

There's a lot to unpack here, so I won't. Make of that what you will with the
benchmark results above. I want to perform more thorough benchmarks to see the
actual difference in real-world usage. My two cents from just this is that the
SoA `ParallelArray` is an okay implementation with acceptable overhead such
that we get improvements over the standard, natively implemented JavaScript
array in places where it is expected to perform better.

# Conclusion

So that's how I implemented a convenient and type-safe SoA on top of typed
arrays in TypeScript. As I said at the beginning, I started this endeavor to
learn more about type-level metaprogramming in TypeScript. Is this useful for
web development? Most likely not; the typical front-end workload does not
require processing massive amounts of data in a tight time window. And if you
need better performance, then [WebAssembly](/blog/wasm) is probably a better
choice.

I still think that this problem is interesting because it involves
metaprogramming for constructing types on the fly, and there's the challenge of
balancing between convenience and abstraction overhead. In the next articles,
I'll write about using this data representation to optimize two problems: a
typical game/simulation scenario and a state-space search algorithm. The full
implementation is available [here](//github.com/ziap/parallel-array/).
