+++
title = "Introduction to freestanding WebAssembly"
date  = "2024-10-21"
+++

I've been using WebAssembly (WASM) for quite a while, and the learning
resources are sparse and incomplete. This is especially true for freestanding
WASM, or using WASM directly without using tools that make interacting with the
web easier. This is an attempt for me to reflect on what I discovered and
hopefully introduce more people to this weird intersection of system
programming and web development.

<!-- more -->

# What and why

WASM is a way to run bytecode compiled from different languages on the
web. This enables many opportunities, including:

- Increased performance: optimizing compilers are solving an NP-hard problem in
  a really short time, so optimizing JIT compilers for dynamically typed
  languages are solving an even harder problem in a shorter time. Although v8's
  performance is amazing, it's still better if we can move the optimization
  step to compile-time instead of run-time, which allows deeper optimization
  and better performance.

- Native-web code sharing: For better or for worse, the web has become the
  easiest platform to access and use software products. So distributing your
  application on the web or just having a small web demo can be beneficial.
  With WASM, you can compile an existing native app to the web or write an
  application for both the web and native at the same time. The approach is the
  opposite of Electron's, where you bring native code to the browser, not the
  other way around, but it achieves the same result with less overhead.

- Use language features not available in JavaScript: With WASM, you can use
  languages other than JavaScript to develop for the web. This means that you
  can get features that are not available in JavaScript, such as:
  + Better type system (than TypeScript, but that's subjective)
  + Compile-time code execution
  + Low-level memory access

## Freestanding WASM

Because WASM is only a bytecode format, it can only perform basic, but
Turing-complete computations. To do anything useful, such as writing something
to a DOM element, you need to write bindings, usually in JavaScript. There are
tools that automate this process, such as [Emscripten](//emscripten.org/) and
[wasm-bindgen](//rustwasm.github.io/docs/wasm-bindgen/), but they have
overheads that I prefer to avoid:

- Additional dependency: using binding generators means that you are now
  relying on them, and they are not lightweight. I don't know about
  wasm-bindgen, but Emscripten was painful to set up. With freestanding WASM,
  you only depend on your compiler, which you already have if you're developing
  in that language.

- Large bundle size: although this might only be because limitations of current
  tooling, currently Emscripten generates lots of code that might be considered
  unnecessary, and the situation is even worse for wasm-bindgen. For example,
  the [WASM cube demo of the sokol
  library](//floooh.github.io/sokol-html5/cube-sapp.html) requires a 80.14 kB
  WASM module and a 33.42 kB *minified* JavaScript bundle, just for a simple
  demo. Because WASM is served on the web, large bundle size means slower
  loading time and worse user experience.

Most of the time, the overheads are worth it, and I recommend using the tools
mentioned above for large projects. But if you want to minimize the overhead of
using WASM as much as possible, or if you want to get your hands dirty and have
fun, I recommend learning freestanding WASM.

# Writing freestanding WASM

To demonstrate writing freestanding WASM, I'll use the C programming language.
[Clang](//clang.llvm.org) is the only C compiler that supports compiling to
WASM as far as I know. You'll also need the WASM linker
[wasm-ld](//lld.llvm.org/WebAssembly.html). Check the availability of these
tool using this command:

```sh
clang --version
wasm-ld --version
```

## Not "Hello, world!", yet

Sadly, we can't do the typical "Hello, world!" because strings don't exist in
WASM. So we'll do the simpler "add two numbers" instead. I'll cover "Hello,
world!" later in this article.

```c
// add.c
#define export __attribute__((visibility("default")))
#include <stdint.h>

typedef int32_t i32;

export i32 add(i32 a, i32 b) {
  return a + b;
}
```

Everything looks like regular C code, but with some typedefs to match C types
with WASM types. You might be wondering about this line:

```c
#define export __attribute__((visibility("default")))
```

To reduce memory size and enable further optimization, we don't want to
export everything by default. We still want to expose symbols during
compilation so that different modules of your code can interact with each
other. But for the final WASM binary, we want to control which symbol are
exported. To do that, we mark every functions that we want to export with the
`visibility("default")` attribute.

If you are using C++, then you also want this:

```c++
#define export extern "C" __attribute__((visibility("default")))
```

Other than doing what is stated above, this declaration also enforces the
function to use the C calling convention, which is compatible with the WASM
module ABI. If you don't do this, the compiler still manages to export your
function, but the name will be mangled.

When compiling to freestanding WASM, you can't use most of the C standard
library. Some useful headers are still available:

```c
#include <stdint.h>  // Fixed width integer types
#include <stddef.h>  // NULL, size_t, offsetof
#include <stdbool.h> // bool, true, false
```

For everything else, you can use GCC and clang's
[builtins](//gcc.gnu.org/onlinedocs/gcc/Other-Builtins.html), but they may or
may not try to link with the standard library. If it does try, the compilation
will fail, and you'll have to implement the functions yourself or avoid using
them.

### Compiling

Okay, let's try to compile this into a WASM module:

```sh
clang --target=wasm32 -nostdlib -fvisibility=hidden \
  -Wl,--no-entry -Wl,--export-dynamic \
  -o add.wasm add.c
```

That's way more involved than compiling a native executable, so let's break
down what's going on:

**Compiler flags:**

- `--target=wasm32`: Set the compilation target to 32-bit WASM
- `-nostdlib`: Disable the standard library
- `-fvisibility=hidden`: Only export certain functions as mentioned above

**Linker flags:**

Linker flags are provided directly when invoking clang with the `-Wl,` prefix.

- `--no-entry`: We don't have a `main(void)` function
- `--export-dynamic`: Dynamically export the marked functions

You may find that the command is long and repetitive, so let's make a build
script:

```sh
#!/bin/sh -xe

CC="${CC:-clang}"

CFLAGS="--target=wasm32 -nostdlib -fvisibility=hidden"
LDFLAGS="--no-entry --export-dynamic"

for FLAG in $LDFLAGS
do
  CFLAGS+=" -Wl,$FLAG"
done

clang $CFLAGS -o add.wasm add.c
```

Running the script, you'll see the `add.wasm` module. This is not the most
optimal yet, but let's try to run it first.

### Running

Unfortunately, like what we've been doing so far, running WASM modules is also
grunt work. We'll need:
- An HTML web page
- A WASM loader in JavaScript
- A web server
- A web browser

You can use any web server and [a compatible web
browser](//webassembly.org/features/). For simplicity, I'll implement both the
web page and the loader script in a single HTML file:

```html
<!-- index.html -->

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WASM Demo</title>
  <script type="module">
const wasm = await WebAssembly.instantiateStreaming(fetch('./add.wasm'))

const { exports } = wasm.instance

console.log(exports.add(34, 35))
  </script>
</head>

<body>

</body>

</html>
```

I think it's pretty clear what's going on inside this code. It fetches and
compiles the `add.wasm` module, then calls the exported add function.

Now, you can use any web server you want to host the website. I'll use the
Python `http.server` module:

```sh
python -m http.server 3000
```

Now, navigate to `http://localhost:3000` with any web browser, open the console
and if we did everything correctly so far, we should see the number 69. Nice!

### Adding optimizations

In the introduction I talked about how WASM allows you to perform optimization
at compile-time, so let's enable compiler optimizations, and also symbol
stripping while we're at it:

```diff
#!/bin/sh -xe

CC="${CC:-clang}"

-CFLAGS="--target=wasm32 -nostdlib -fvisibility=hidden"
+CFLAGS="--target=wasm32 -nostdlib -fvisibility=hidden -O3 -flto"
-LDFLAGS="--no-entry --export-dynamic"
+LDFLAGS="--no-entry --export-dynamic --strip-all --lto-O3"

for FLAG in $LDFLAGS
do
  CFLAGS+=" -Wl,$FLAG"
done

clang $CFLAGS -o add.wasm add.c
```

Doing this reduces the binary size from 274 bytes down to 101 bytes, which
already helped with download speed. However, it will also optimize the code for
it to run better.

To examine this, let's modify the program to make it a bit more complicated:

```c
export i64 add(i32 a, i32 b) {
  i64 result = 0;
  for (i32 i = a; i <= b; ++i) {
    result += i;
  }
  return result;
}
```

After compiling with optimization, you can inspect the generated WASM with the
`wasm2wat` command. For example:

```
$ wasm2wat add.wasm
(module
  (type (;0;) (func (param i32 i32) (result i64)))
  (func (;0;) (type 0) (param i32 i32) (result i64)
    (local i64 i64)
    local.get 0
    local.get 1
    i32.le_s
    if (result i64)  ;; label = @1
      local.get 1
      local.get 0
      i32.sub
      i64.extend_i32_u
      local.tee 2
      local.get 0
      i64.extend_i32_s
      local.tee 3
      i64.const 1
      i64.add
      i64.mul
      local.get 3
      i64.add
      local.get 0
      i32.const -1
      i32.xor
      local.get 1
      i32.add
      i64.extend_i32_u
      local.get 2
      i64.mul
      i64.const 1
      i64.shr_u
      i64.add
    else
      i64.const 0
    end)
  (memory (;0;) 2)
  (export "memory" (memory 0))
  (export "add" (func 0)))
```

As you can see, the function removed the for loop and used the summation
formula with some additional bookkeeping to improve the time complexity and,
more importantly, the execution speed of the algorithm.

### Extra tips

**Enable `memset`, `memmove`, `memcpy`**

Even if you don't declare these functions, the compiler will sometimes optimize
into these calls. So it's better to just declare and use them. Because we can't
`#include <string.h>`, we have to declare them ourselves:

```c
void *memset(void *s, int c, size_t n);
void *memcpy(void *restrict dest, const void *restrict src, size_t n);
void *memmove(void *dest, const void *src, size_t n);
```

We also have to enable the bulk memory WASM feature extension, which is [widely
supported](//caniuse.com/wasm-bulk-memory).

```sh
CFLAGS="--target=wasm32 -nostdlib -fvisibility=hidden -O3 -flto -mbulk-memory"
```

**Enable vectorization**

To further enhance compiler optimization, you can enable [WASM
SIMD](//v8.dev/features/simd), which allows the compiler to use SIMD operations
to optimize your code. For finer grained control, you can hand-write SIMD by
importing the [wasm_simd128.h header
file](//github.com/llvm/llvm-project/blob/main/clang/lib/Headers/wasm_simd128.h).

## Actual "Hello, world!"

Optimized calculation is cool and all, but your code is useless if it can't
interact with the platform it's running on, which in this case is your
browser. Let's first try to access the benevolent `console.log` and write our
first WASM "Hello, world!". To access functions outside your module, you
need to declare their signatures directly in your code or in a header file. I
prefer to use the `extern` keyword to explicitly mark it as an externally
linked function.

```c
void puts(const char*);

export void greet() {
  puts("Hello, world!");
}
```

Currently, the function is undefined, so for it to compile, add the
`--allow-undefined` flag to the build script.

```diff
#!/bin/sh -xe

CC="${CC:-clang}"

CFLAGS="--target=wasm32 -nostdlib -fvisibility=hidden -O3 -flto"
-LDFLAGS="--no-entry --export-dynamic --strip-all --lto-O3"
+LDFLAGS="--no-entry --export-dynamic --allow-undefined --strip-all --lto-O3"

for FLAG in $LDFLAGS
do
  CFLAGS+=" -Wl,$FLAG"
done

clang $CFLAGS -o greet.wasm greet.c
```

As a side note, notice that we're declaring to use the `puts` function instead
of the more popular `printf` function. This is because formatted output are
more complicated than writing a simple string. If you ever need `printf`, you
can use [`stb_sprintf.h`](//github.com/nothings/stb/blob/master/stb_sprintf.h).

### Implementing `puts` in JavaScript

So, how do you declare the `puts` function and import it into the WASM module?
Let's use the familiar tool `wasm2wat` again to inspect the compiled code.

```linenos
(module
  (type (;0;) (func (param i32)))
  (type (;1;) (func))
  (import "env" "puts" (func (;0;) (type 0)))
  (func (;1;) (type 1)
    i32.const 1024
    call 0)
  (memory (;0;) 2)
  (export "memory" (memory 0))
  (export "greet" (func 1))
  (data (;0;) (i32.const 1024) "Hello, world!"))
```

Line 4 states that the module is expecting a function `puts` from the module
`env`. Let's try that and see how it goes.

```js
const env = {
  puts(x) {
    console.log(x)
  }
}

const wasm = await WebAssembly.instantiateStreaming(fetch('./greet.wasm'), { env })

const { exports } = wasm.instance

console.log(exports.greet())
```

That makes sense, right? We created an import object with field env containing
the function `puts` which takes an argument and logs it to the console.

However, when we run the code, we'll see `1024`, instead of the string "Hello,
world!" that we want. Nevertheless, we managed to define and import a function
from JavaScript.

### Accessing the string

If you have experience programming in C, you might already know what's going on
here. The little `*` in `const char *` denotes a pointer, which means that
we're passing a pointer to the start of a sequence of bytes representing the
string "Hello, world!" in memory. If we take a look at the last line, which
declares a [data
segment](//webassembly.github.io/spec/core/syntax/modules.html#syntax-data) for
the WASM module:

```
(module
  ;; ...
  (data (;0;) (i32.const 1024) "Hello, world!"))
```

We can see that the data segment is located at the index 1024 in the memory and
contains the string "Hello, world!". This is why we get `1024` when we log the
pointer in JS. It's the address of the first byte of the string that we want to
display.

So to dereference that pointer in JS, we need to use something called a [typed
array](//developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays).
You can think of the string "Hello, world!" as an array of unsigned 8-bit
integers that starts at the location `1024`. We can get exactly that using the
`Uint8Array` constructor.

```js
let memory

const env = {
  puts(str) {
    const memory_array = new Uint8Array(memory.buffer, str)
    console.log(String.fromCharCode(memory_array[0]))
  }
}

const wasm = await WebAssembly.instantiateStreaming(fetch('./greet.wasm'), { env })

const { exports } = wasm.instance
memory = exports.memory
exports.greet()
```

You might be wondering why do we keep track of the `exports.memory` and access
the `buffer` every time instead of storing `exports.memory.buffer`. This is
because WASM memory is resizable, and when it resizes, pointers pointing into the
old memory are invalidated.

Running this, we get `H` which is indeed the first character of the string.
Finally, we can start writing "Hello, world!" to the console!

### Writing the string

We can iterate over the memory array, pushing characters into a string until we
reach `\0` because C strings are null-terminated. However, to support Unicode,
it's better to use a [text decoder](//javascript.info/text-decoder) instead.

```javascript
const decoder = new TextDecoder()

const env = {
  puts(str) {
    const memory_array = new Uint8Array(memory.buffer, str)

    let len = 0;
    while (memory_array[len]) ++len

    const bytes = memory_array.slice(0, len)
    console.log(decoder.decode(bytes))
  }
}
```

Now the console gives us `Hello, world` exactly as we wanted. Let's change the
greet function a bit to see if it can print multiple strings and print Unicode
characters.

```c
export void greet(void) {
  puts("Hello, world!");
  puts("゠ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズ");
  puts("😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 🥰 😗 😙 😚");
}
```

When running, we should get those exact 3 strings logged into the console. Now
you have a very rudimentary way of communicating between WASM and JavaScript
using functions and pointers. We also parsed a simple C data structure (a
null-terminated string) in JavaScript. Extending this, you can do quite a lot
until dynamic memory allocation is required, which is the topic for another
article.

# Conclusion

Building a basic "Hello, world!", we managed to:

- Compile a C code into a WASM module
- Load and run WASM functions on a webpage via JavaScript
- Import functions from JavaScript to WASM
- Parse C strings into JavaScript strings

You might think that it's a lot of work for just "Hello, world!", and you are
absolutely correct. That's the cost of reducing file size and having absolute
control over your code. While it's better to use binding generators,
understanding WASM at this level helps you know what those tools are doing under
the hood, and you might be able to make better decisions that improve code
size and execution speed. You might also learn interesting techniques from both
the system programming world and the JavaScript world, such as text decoders and
typed arrays.

This post barely scratches the surface of freestanding WASM by literally
writing "Hello, world!". There's a lot more when it comes to WASM, such as
dynamic memory allocation, parsing more complex data structures, parallelism,
Canvas, and WebGL. Just like with the basics, resources for these subjects are
sparse, so I might not be experienced enough to talk about them. But I've been
doing freestanding WASM for quite a while already, and have managed to do
almost everything that I want and need to do. If I'm satisfied with my
knowledge and approach to using any of the previously mentioned subjects, I'll
write more articles about them on this site.
