+++
title = "Fast BPE tokenizer - Overview and arena allocated decoding"
date  = "2025-09-24"
+++

This is the first entry of a series of articles about designing an efficient
byte pair encoder (BPE) tokenizer. The tokenized text is then used to train an
n-gram model for the task of synthesizing placeholder text. These articles are
for sharing the design decisions and optimization techniques I applied. For the
first entry, I wanted to talk about an overview of the algorithm and an
efficient decoder implementation.

<!-- more -->

# Overview of the BPE Algorithm

BPE originally started as a text compression algorithm. But in order to
losslessly compress any data, you need to "learn" and exploit redundancies in
the dataset. It turns out that this particular compression technique learns
patterns and grammars so well that running machine learning models on the
compressed text helps with convergence and accuracy. This is why BPE
tokenization is a crucial component of modern LLMs.

For my implementation, this algorithm is separated into two parts:

- **Encoder:** trains on the input text and output a list of tokens and their
  corresponding pairs.
- **Decoder:** convert tokens back into text.

## BPE Decoding

Just like most compression algorithms, decoding is relatively simpler and
faster. In fact, unlike the encoder, this article will fully cover the process
of implementing an optimized BPE decoder. I'll also start explaining the
decoder first. For the example, we will use the first two sentences from the
"Lorem Ipsum" placeholder text.

> Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
> tempor incididunt ut labore et dolore magna aliqua.
>
> Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
> aliquip ex ea commodo consequat.

Assuming that after encoding, we have the following table:

<div style="display:flex; gap: 1rem; justify-content: space-between;">

| Token | Left | Right |
| ----- | ---- | ----- |
| 256   | 32   | 101   |
| 257   | 111  | 114   |
| 258   | 32   | 97    |
| 259   | 110  | 105   |
| 260   | 113  | 117   |
| 261   | 99   | 111   |
| 262   | 100  | 111   |
| 263   | 32   | 262   |
| 264   | 32   | 261   |
| 265   | 257  | 101   |
| 266   | 108  | 97    |
| 267   | 32   | 117   |

| Token | Left | Right |
| ----- | ---- | ----- |
| 268   | 108  | 105   |
| 269   | 99   | 105   |
| 270   | 105  | 115   |
| 271   | 115  | 101   |
| 272   | 105  | 112   |
| 273   | 110  | 271   |
| 274   | 264  | 273   |
| 275   | 270  | 32    |
| 276   | 268  | 260   |
| 277   | 258  | 276   |
| 278   | 267  | 116   |
| 279   | 266  | 98    |

| Token | Left | Right |
| ----- | ---- | ----- |
| 280   | 32   | 279   |
| 281   | 263  | 108   |
| 282   | 259  | 109   |
| 283   | 258  | 100   |
| 284   | 257  | 32    |
| 285   | 256  | 120   |
| 286   | 97   | 116   |
| 287   | 32   | 109   |
| 288   | 109  | 111   |
| 289   | 116  | 101   |
| 290   | 44   | 32    |
| 291   | 115  | 105   |

</div>

Note that the tokens start at `256` since `0` to `255` are reserved for
single-byte characters. So, how do you decode the token `274`. Looking up the
table, the token `274` consists of the token `264` on the left and the token
`273` on the right. So we expand into them. We do this recursively until each
token is a single-byte token or is less than `256`.

```
274 => (>264, 273<)
    => (>32, 261<, >110, 271<)
    => (32, >99, 111<, 110, >115, 101<)
    => " conse"
```

Note that this pattern appears twice in the input text (`amet,| conse|ctetur`
and `commodo| conse|quat`). This example is only for demonstrating BPE
decoding. A larger example is required to comment on the behavior of the
algorithm and the characteristics of the generated tokens.

## BPE Encoding

The algorithm for generating tokens from an input text proceeds as follow:

- While not enough tokens generated:
  - Select the pair that occurs the most in the input text.
  - If that pair occurs only once, stop.
  - Create and store a new token from the pair.
  - Replace all instances of that pair with the newly created token.

Because the algorithm is a bit more complicated, we'll use a smaller example
from the [huggingface LLM
course](//huggingface.co/learn/llm-course/chapter6/5), just `hug pug pun bun
hugs`. This example uses lowercase characters as single-byte characters, and
uppercase characters as the generated tokens.

First, enumerate over all pairs in the text:

```
hu ug g_ _p pu ug g_ _p pu un n_ _b bu un n_ _h hu ug gs
```

Then, collects unique pairs and count their occurences:

```
hu => 2
ug => 3
g_ => 2
_p => 2
pu => 2
un => 2
n_ => 2
_b => 1
bu => 1
_h => 1
gs => 1
```

The pair that occurs the most is `ug`, so we'll create a new token `A = (u, g)`
and substitute all instances of `ug` with `A`.

```
A = (u, g)

hA pA pun bun hAs
```

Repeat this until we have generated enough tokens or all pairs in the final
text are unique.

```
text: "hug pug pun bun hugs"

iteration: 1
new_token: A => (u, g)
text: "hA pA pun bun hAs"

iteration: 2
new_token: B => (h, A)
text: "B pA pun bun Bs"

iteration: 3
new_token: C => (_, p)
text: "BCACun bun Bs"

iteration: 4
new_token: D => (u, n)
text: "BCACD bD Bs"

iteration: 5
new_token: E => (D, _)
text: "BCACEbEBs"

final_tokens:
A => (u, g)
B => (h, A)
C => (_, p)
D => (u, n)
E => (D, _)

tokenized_text: "BCACEbEBs"
```

These tokens can then be decoded using the process above, and if you decode the
tokenized text sequence, you get back the original text. Therefore, we can say
that this encoding is lossless.

# Implementation

I implemented the algorithm in Rust because the algorithm is quite complex and
I want the extra bits of correctness aid that Rust provides. I was also not
trying to squeeze every bit of performance. Nor will I try to compete with
production-ready solutions such as [tiktoken](//github.com/openai/tiktoken) or
[the huggingface tokenizer](//github.com/huggingface/tokenizers). As such, the
implementation will not be optimized with SIMD, multi-threading, and aggressive
bound check removal. Here are the goals of the implementation:

- **Correctness:** Obviously, this also means minimizing `unsafe` code.
- **Optimal time complexity:** This means implementing complex, finicky data
  structures to achieve `O(n)` training, where `n` is the input length.
- **Reasonable data layout:** Applies principles of data-oriented design,
  structuring data based on how they are accessed and manipulated. Avoid small,
  decentralized allocations and strive for compact, fast (de)serialization.

I also hardcoded the target tokens to `65536 - 256 = 65280` tokens such that we
can represent them as 16-bit unsigned integers. The encoder will run until all
token pairs in the tokenized text are unique, or we have exhausted 16-bits of
tokens. GPT2 has [50257](//huggingface.co/docs/transformers/model_doc/gpt2)
tokens, so there's enough wiggle room for even an early LLM model.

## Decoding and Token Representation

Let's start with the decoder. We only have to think about how to decode a
single token, as the most efficient way to decode a sequence of tokens is to
sequentially decode each individual token. I also defined the input of the
decoder to be a simple list of pairs, and the index into the list denotes the
associated token. For example, the token table from above:

| Token | Left | Right |
| ----- | ---- | ----- |
| 256   | 32   | 101   |
| 257   | 111  | 114   |
| 258   | 32   | 97    |
| 259   | 110  | 105   |
| 260   | 113  | 117   |
| 261   | 99   | 111   |
| 262   | 100  | 111   |
| 263   | 32   | 262   |
| 264   | 32   | 261   |
| 265   | 257  | 101   |
| 266   | 108  | 97    |
| 267   | 32   | 117   |

Are represented as:

```rs
let pairs: [(u16, u16)] = &[
  (32, 101), (111, 114), (32, 97), (110, 105), (113, 117), (99, 111),
  (100, 111), (32, 262), (32, 261), (257, 101), (108, 97), (32, 117),
];
```

To get, for example, token `262`, we first subtract by the smallest
non-singe-byte token, which is `256`, and index the array, or `pairs[262 -
256]`. The optimal time complexity decoding algorithm can be implemented
recursively as described above:

```rs
struct Decoder {
  pairs: Box<[(u16, u16)]>,
}

impl Decoder {
  fn decode(&self, token: u16, out: &mut impl Write) -> std::io::Result<()> {
    if token < 256 {
      out.write(&[token as u8])?;
    } else {
      let (left, right) = self.pairs[token as usize - 256];
      self.decode(left, out)?;
      self.decode(right, out)?;
    }

    Ok(())
  }
}
```

This function takes a writer as its output, so you can output to a `Vec<u8>`

```rs
fn decode_all(decoder: &Decoder, tokens: &[u16]) -> Vec<u8> {
  let mut buf: Vec<u8> = Vec::new();

  for token in tokens {
    decoder.decode(token, &mut buf).unwrap();
  }

  buf
}
```

Or directly into a stream such as `stdout`. But there are two main problems:
it's a recursive function, and the memory access pattern is horrible. Let's use
the example from above.

```
274 => (>264, 273<)
    => (>32, 261<, >110, 271<)
    => (32, >99, 111<, 110, >115, 101<)
    => " conse"
```

Running the recursive algorithm will result in an access pattern as follows:

```
18 -> 8 -> 5 -> 17 -> 15
```

The pattern is random and has no spatial locality. This is not very
cache-friendly, especially when we scale up the input data size and number of
tokens. What if, instead, we eagerly precompute the decoded value of all
tokens, and decoding a token is just a simple table lookup?

```rs
struct Decoder {
  data: Box<[Box<[u8]>]>,
}

impl Decoder {
  fn new(pairs: &[(u16, u16)]) -> Self {
    unimplemented!();
  }

  fn decode(&self, token: u16) -> &[u8] {
    &*self.data[token as usize]
  }
}
```

It's just a simple array lookup, branchless (except for the bound check), and
gives you more flexibility. Previously you needed to provide a sink to write
the data to. Now you have direct access to the slice and can do whatever you
want with it. The caveat is that we now use more memory, but that was a
trade-off that I was willing to accept.

Now the problem becomes how to fill up the `data` array. Again, the optimal
algorithm in terms of time complexity is to iterate over all tokens and call
the recursive algorithm since we have to construct byte by byte anyway.
However, if you need to compute many values of a recursive sequence, [dynamic
programming](//cp-algorithms.com/dynamic_programming/intro-to-dp.html) comes to
mind.

```rs
struct Decoder {
  data: Box<[Box<[u8]>]>,
}

impl Decoder {
  fn new(pairs: &[(u16, u16)]) -> Self {
    let mut dp: Vec<Box<[u8]>> = (0..=255).map(|x| [x].into()).collect();
    dp.reserve(pairs.len());

    for &(left, right) in pairs {
      let mut buf: Vec<u8> = Vec::new();
      buf.extend_from_slice(&*dp[left as usize]);
      buf.extend_from_slice(&*dp[right as usize]);
      dp.push(buf.into());
    }
    
    Self { data: dp.into() }
  }

  fn decode(&self, token: u16) -> &[u8] {
    &*self.data[token as usize]
  }
}
```

This is much better already, as it effectively eliminated the recursion.
However, we used a [jagged array](//en.wikipedia.org/wiki/Jagged_array) which
is usually not good. Each token is potentially small (about 5 characters), so
this creates a lot of small, fragmented heap allocations. As usual, this is
also bad for cache locality and puts extra work on the memory allocator. We can
fix this using one of my favorite techniques: [arena allocation](/blog/arena).

In this approach, all of the data is stored in a contiguous buffer (or arena),
and the lookup table can be implemented as an array of slices into the buffer.
Each element is now a numeric offset, and the length can be inferred from the
next offset.

```rs
fn range(offsets: &[u32], idx: u16) -> std::ops::Range<usize> {
  let idx = idx as usize;
  let l = offsets[idx + 0] as usize;
  let r = offsets[idx + 1] as usize;
  l..r
}

struct Decoder {
  buffer: Box<[u8]>,
  offsets: Box<[u32]>,
}

impl Decoder {
  fn new(pairs: &[(u16, u16)]) -> Self {
    let mut buffer: Vec<u8> = (0..=255).collect();
    let mut offsets: Vec<u32> = (0..=255).collect();
    offsets.reserve(pairs.len() + 1);

    for &(left, right) in pairs {
      offsets.push(buffer.len() as u32);
      buffer.extend_from_within(range(&offsets, left));
      buffer.extend_from_within(range(&offsets, right));
    }
    offsets.push(buffer.len() as u32);

    Self { buffer: buffer.into(), offsets: offsets.into() }
  }

  fn decode(&self, token: u16) -> &[u8] {
    &self.buffer[range(&self.offsets, token)]
  }
}
```

I mean, just look at the layout of this thing. Like it's begging to be
serialized. Usually the decoder is an auxiliary data structure and is usually
instantiated on-the-fly instead of being serialized. But you can easily add
serialization if you want to: just directly copy the buffers instead of
traversing an array of arrays and collecting elements. I'm still deciding
between serializing the entire `Decoder` or only the `pairs` and reconstructing
the `Decoder` on-the-fly.

This streamlined the memory usage by reducing allocation overhead of small
decoded token strings. Each lookup entry is now a single `u32` which is 4
bytes, instead of a `Box<[u8]>` which is a pointer and a `usize`, so 16 bytes
on 64-bit architectures. Using a single buffer also helps with cache locality,
so decoding speed is likely to be improved.

# Conclusion

So that's it for the decoding process. I think that it fits really well with
the criteria that we established earlier. Decoding is relatively simple, and
even the naive implementation is optimal in terms of time complexity. But even
then we can still optimize for the memory access pattern, data layout, and
allocation overhead.

The data layout of the decoder is also what I used to represent the bigram
model for text generation, which is then cleverly constructed in linear time
using a modified version of counting sort. But that and the whole text
generation thing won't be covered in this series. Next I'll start talking about
training the byte pair encoder, starting with a naive `O(n^2)` algorithm.
