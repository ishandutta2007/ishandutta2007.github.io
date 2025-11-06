+++
title = "What I learned in 2024"
date  = "2025-01-12"
+++

Usually, people write this kind of post somewhere at the end of the year. But I
had another deadline and haven't collected my thoughts yet, so this post came
quite late. Nonetheless, I really wanted to look back at 2024 because it's been
quite an interesting year for me.

<!-- more -->

2023-2024 is my first academic year in college, and to me college is more like
for applying what I learned in an academic environment than for learning. I'm
not built for learning a standardized curriculum and prefer learning things as
I need them, on my own. However, there is a good thing that came out of it.

# Implementing data structures

In my third semester, I got enrolled in a Data structures and algorithm course.
I was taught by some of the best, but the course itself is kinda superficial.
In the course, you don't learn to solve any real problem, just memorizing a
bunch of data structures, algorithms, their properties, and whatnot. You don't
even have to implement most of what being taught, the most complex data
structure you have to implement is the AVL tree.

But this course made me do something that I wouldn't do on my own: Implementing
data structures. I even took a special assignment of implementing a red-black
tree, which was fun and nightmarish at the same time. I wasn't a data structure
person and prefer implementing algorithms instead. For me, algorithms were just
more unique and interesting, and I thought that you can just use data
structures from (standard) libraries.

But I realized that just like algorithms, data structures can also be carefully
tuned to fit your particular data and use case. Implementing them is also good
for practicing memory operations. This year, I implemented these data
structures:

- Stack and queue using [arrays](/blog/queue/) and linked lists
- Associative containers using [hash tables](/blog/string-matching/)
  and BSTs
- Priority queue using BSTs and binary heaps
- Spatial acceleration structures using Quadtrees and KD-Trees

Overall, I think that implementing these data structures are crucial, as now I
have better understanding and control of how my data is laid out in memory.
Also, if I ever need a data structure, I can just straight up implementing them
because I'm more confident that I can correctly implement it.

# Starting this website

I think the most influential decision I made in 2024 is to start this website.
With that, I've been trying to better articulate my thoughts and ideas, and
writing them down coherently. I don't know if I ever feel satisfied with my
writings, but I'm proud that I manage to write *something* every month or so
last year.

Besides writing, I also learned how to use a static site generator to build
content-based web applications. After a year, it's safe to say that Zola is
pretty awesome. There are some features that I wanted to use, such as tags,
pagination, search, etc. But I think it's better to wait for the content of
this website to grow before doing anything.

If there's anything on this website that I'm proud of, it's the CSS design. It
was the first time that I design a multipage website, and I'm pretty happy that
it came together quite nicely. I also learned how to incorporate SVG design
assets to make the website more organic and playful. There are still things
that I'd like to add to the design, such as custom fonts and a dark theme.

# Resource lifetime and ownership

This seems like a Rust thing, and indeed, I learned it using Rust as it forces
you to think about it. But in reality, the concept of lifetime and ownership
extends to other programming languages, just that it wasn't strictly enforced.
Learning this made me code better in other languages where resource (mostly
memory) management is manual.

In C++, I was able to use `std::unique_ptr` in more dynamic and powerful ways,
such as composing them in `struct`s or `class`es, knowing when to move, copy,
or reference them. It has gotten to the point where it's now my default way of
doing heap allocation. Similarly, I no longer blindly copy everything when
it doesn't affect the time complexity. The benefit of learning resource
lifetime and ownership is not safety, you can achieve safety in other ways. The
main benefit is performance, as garbage collection and reference counting is
not required, and you avoid lots of unnecessary resource allocation and
deallocation.

For C, single-resource lifetime isn't enough to make me feel confident with
resource management, but it was a step in the right direction. I work better
with pointers, reduced `malloc`, `memcpy` and `free`, but it wasn't enough. I
have to start learning how to group objects with the same lifetime into
[arenas](/blog/arena) and dynamic arrays, start thinking not in terms of
individual lifetimes, but in systems and groups of objects. This was my first
step in learning data-oriented design and resulted in much more robust and
performant code.

# Functional programming

It's pretty clear that Rust had a massive influence on me in 2024, and I think
the biggest of which is that it introduced me to functional programming. I've
known functional programming since around 2020, but my imperative brain
couldn't really comprehend it. Rust slowly and subtly helped me approach some
functional programming concepts, such as:

- Thinking in types and functions instead of classes
- Algebraic data types, especially [tagged union](/blog/polymorphism)
- Pattern matching and type decomposition
- Expression-based programming
- Monadic error handling
- Functional sequence manipulation

Being an imperative programmer, I'm not as efficient with these concepts
compared to their imperative alternatives, but I'm slowly getting the hang of
it. I learned some concepts faster, for example functional sequence
manipulation, because I used similar techniques (Python's
[comprehension](//docs.python.org/3/tutorial/datastructures.html#list-comprehensions)
and C# [LINQ](//learn.microsoft.com/en-us/dotnet/csharp/linq/)).

Rust is great because I can turn back to imperative programming when it's more
appropriate, but it also made me rely too much on my old imperative style. I
only fully embraced functional programming when I have to configure my new
NixOS system. Nix is a great application of functional programming and gave a
huge motivation to learn more about it.

# Heading to 2025

So those are what I learned last year. With that being said, what am I going to
learn in 2025? I don't stick to plans very well, so I'm just going to list out
what I wanted to learn instead. Firstly, Rust has been my source of influence
in 2024, so this year I wanted something different. As mentioned above, I
dipped my toe into the world of data-oriented design, so I wanted a language
that facilitate it. One such language is Zig, and I've already been using it
for as a build system for C and C++ last year. There's one of my project idea
that could benefit from Zig features, so I'm looking forward to start
developing it and learn Zig.

Metaprogramming is a topic that I've always been interested with. My approach
to metaprogramming has been one of the following:

- C++ `template`/`constexpr`
- Scripts that run as part of the build process to dynamically generate code

The latter is especially powerful and capable of doing almost everything that I
ever wanted to do with metaprogramming, to the point that I just use it with C
instead of C++. But this year, I want to learn other approaches to
metaprogramming, such as:

- Zig compile time code execution and reflection
- LISP quoting and quasiquoting
- Rust AST metaprogramming with macros

It's pretty obvious how I will learn these approaches. I haven't decided which
flavor of LISP to use, but then again, I don't know if I'll learn this at all.
I doubt that any of these approaches are as efficient and flexible as the code
generating scripts approach, but I still want to try them. There are more
things that I want to try, such as functional languages like Haskell or OCaml,
but I think that for the time being, I should focus on data-oriented design and
metaprogramming.
