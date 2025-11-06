+++
title = "Implementing a 64-bit Pseudo-random number generator"
date  = "2025-03-22"
+++

Let's face it, determinism is boring. I've been using Pseudo-random number
generators (PRNGs) for as long as I can remember. My usual PRNG is PCG-32 with
a fixed increment, but it's time for me to pick a larger PRNG for 64-bit output
and multithreaded generation.

<!-- more -->

I mostly use PRNGs for Monte Carlo simulations and randomized algorithms. For
these applications, existing PRNGs in many programming languages usually have
these problems:

- Performance: The biggest culprit is the MT19937 generator. Although
implemented as the default PRNG in C++, Python, and countless other languages,
this PRNG is needlessly big and slow. I wanted a PRNG that is small enough so
that it can be incorporated nicely into the algorithm using it. It should also
produce numbers fast enough so that it doesn't become the bottleneck of the
algorithm.

- Statistical quality: Some default PRNG, such as `rand()` in C, or even the
aforementioned MT19937, failed to pass statistical tests. Passing doesn't mean
that the PRNG is good, but failing means that it generates biased output, and
may tamper with the behavior of the algorithm using it.

- Reproducibility: I want to be able to control and reproduce the output of
algorithms using PRNG. This means controlling both the PRNG implementation and
the seeding procedure. Some existing PRNG doesn't have a specified algorithm
(`RAND_MAX` is implementation defined) and/or doesn't allow you to seed it
(`Math.random()` in JavaScript), so it's not a good idea to rely on them.

There's also the concern of cryptographic security, but most of my usage are
non-adversarial, so it's not important to me. Another issue that recently
caught my attention is correlation in parallel environment, which I will
address in this article.

# Problems with my current PRNG

As mentioned above, my previous PRNG of choice is PCG-32, specifically this
function:

```zig
const Pcg32 = struct {
  state: u64,

  fn next(self: *Pcg32) u32 {
    const state = self.state;
    self.state = state *% 0x5851f42d4c957f2d +% 0x14057b7ef767814f;

    const xorshifted: u32 = @truncate((state ^ (state >> 18)) >> 27);
    const rot: u5 = @intCast(state >> 59);
    return (xorshifted >> rot) | (xorshifted << -% rot);
  }
};
```

It's fast, have robust statistical quality, and extremely easy to seed. But
unfortunately, it only produces 32-bit output. As the 32-bit variant requires
64-bit arithmetic, the 64-bit variant of PCG requires 128-bit arithmetic, which
is quite slow on modern hardware. I can modify PCG-32 to generate two words at
a time with vectorization:

```zig
fn next_u64(self: *Pcg32) u64 {
  const s0 = self.state;
  const s1 = s0 *% 0x5851f42d4c957f2d +% 0x14057b7ef767814f;
  self.state = s0 *% 0x685f98a2018fade9 +% 0x1a08ee1184ba6d32;
  const s: @Vector(2, u64) = .{ s0, s1 };

  const mask: @Vector(2, u64) = comptime @splat(0xffffffff);
  const xorshifted = ((s ^ (s >> @splat(18))) >> @splat(27)) & mask;
  const rot: @Vector(2, u5) = @intCast(s >> @splat(59));
  const out = (xorshifted >> rot) | (xorshifted << -% rot);

  return (out[0] << 32) | @as(u32, @truncate(out[1]));
}
```

This makes PCG-32 faster than PCG-64 on my machine, but it requires specialized
instruction, and the period of the generator is now 2^63, which is too small
for the size of the output. The small period causes the generator to omit some
64-bit values, which causes problems detectable with [the birthday
test](//www.pcg-random.org/posts/birthday-test.html).

So, to improve upon PCG-32, we need a generator that:

- Can generate both 32-bit and 64-bit values faster than PCG-32
- Have a large period (at least 2^128)

# Selecting a new PRNG

With the requirements listed above, the obvious choice is to use the [Xoshiro
family](//prng.di.unimi.it/) of PRNG, specifically the Xoshiro256++ variant. It
is fast, has great statistical quality, and has a period of 2^256. However,
there are a few problems with the generator.

Firstly, it's not trivial to seed, seeding Xoshiro256 requires 256 bits of high
hamming weight. Without sufficient entropy, you need to use a [seed
sequence](//www.pcg-random.org/posts/developing-a-seed_seq-alternative.html),
or, as the authors of Xoshiro recommended, a secondary PRNG.

> We suggest to use SplitMix64 to initialize the state of our generators
> starting from a 64-bit seed, as research has shown that initialization must
> be performed with a generator radically different in nature from the one
> initialized to avoid correlation on similar seeds. 

Secondly, this is mostly the matter of taste, but I prefer generators based on
congruential arithmetic, or LCGs. They are usually simpler to understand and
implement, and their statistical quality have been rigorously evaluated. And on
modern hardware, they are very efficient... up to a certain size.

```zig
const Lehmer64 = struct {
  state: u128,

  fn next(self: *Lehmer64) u64 {
    // Multiplier from: https://arxiv.org/abs/2001.05304
    self.state *%= 0xdefba91144f2b375;
    return @intCast(self.state >> 64);
  }
};
```

At 128-bit of state, you need to use a half-width multiplier to avoid the full
128-bit by 128-bit multiplication overhead. This negatively affect statistical
quality, but it's remedied by the 128-bit state space and truncation. This
generator is considered [one of the
fastest](//lemire.me/blog/2019/03/19/the-fastest-conventional-random-number-generator-that-can-pass-big-crush/),
and serves as a good baseline. I was wondering if I can further reduce the
statistical quality to increase the speed and state size, but Sebastiano Vigna
--- one of the author of the Xoshiro family --- already have a suggestion:

> Nonetheless, you might wish to use at all costs, for some reason, a PRNG
> based on congruential arithmetic with 64 bits of output, 128 bits or more of
> state, and using 128-bit multiplications.
>
> In that case, you have a much better option: Marsaglia's Multiply-With-Carry
> generators and their generalizations. For example, MWC128 is a generator with
> 128 bits of state that is much faster than a PCG generator, and the design
> can be extended, say, to 256 bits of state.

The quote above comes from [an article debunking the PCG
scheme](//pcg.di.unimi.it/pcg.php). While the concerns that the author raise
don't significantly impact my common usage of the generator, he made some very
good points worth thinking, especially the ones above about MWC generators.

# Multiply-With-Carry PRNGs

George Marsaglia's Multiply-With-Carry generators are exactly what I need. They
use a carefully designed multiplier with reduced statistical quality to improve
the execution speed and period length. Vigna provides a 256-bit instance of the
generator, and shown that it's one of the fastest 64-bit generator available:

```zig
const Mwc256 = struct {
  state: [3]u64,
  carry: u64,

  const MUL = 0xfff62cf2ccc0cdaf;

  fn next(self: *Mwc256) u64 {
    const result = self.state[2];
    const m = @as(u128, self.state[0]) * MUL + self.carry;
    self.state[0] = self.state[1];
    self.state[1] = self.state[2];
    self.state[2] = @truncate(m);
    self.carry = @intCast(m >> 64);
    return result;
  }
};
```

The Lehmer64 generator above requires a 128-bit by 64-bit multiplication. When
compiled to x64, it consists of 2 multiplications and 1 addition. In contrast,
the MWC-256 generator requires a 64-bit by 64-bit multiplication and a 128-bit
addition, which compiles down to 1 multiplication and 2 additions instead,
which is slightly faster. There's also the overhead of shuffling the state
array, but it can be done very efficiently when the generator is inlined.

## Properties

But what are the properties of MWC generators, and how good are they compared
to other schemes? Each MWC generator is just an LCG underneath, for the
instance above, it's equivalent to the following LCG:

```zig
const A = 6276160742880412490562503672514912579384108730125152944128;
const M = 115774730989377786055465590234430405857705840712624444254491694307097180110847;

fn next(state: *u256) u64 {
  const result: u64 = @truncate(state.* >> 128);
  state.* = @intCast((@as(u512, state.*) * A) % M);
  return result;
}
```

It's amazing how the multiplier `A` can be carefully designed so that the
256-bit multiplication and modulo can be reduced into a 64-bit multiplication,
a 128-bit addition, and storage-bit truncation. This particular form of the
multiplier, along with its statistical implications, will be explored later.
But first, here are some properties of the MWC-256 generator:

The modulus `M` is actually `MUL * 2^192 - 1`, and is a prime number. LCGs with
power-of-2 modulus, such as Lehmer64 and PCG generators, have the problem of
low bits have a shorter period than the high bits, which isn't a problem with
prime modulus LCGs. The generator has 2 cycles, each with a period of `M / 2`,
which is also a prime number. Since the generator is fundamentally just an LCG,
it inherits all features and properties of LCGs.

# Statistical testing

Although we have 256-bit of state to work with, LCG has some serious
statistical flaws. Because I don't have the resource for full-scale statistical
testing, I'm going to perform what called small-scale testing. The idea
originates from the [PCG paper](//www.pcg-random.org/pdf/hmc-cs-2014-0905.pdf),
which argues that passing statistical tests is not enough, you need to test
scaled down versions of your generator and make sure that they also pass.
Luckily, it's very easy to scale down MWC-256, and LCG based generators in
general. Here's a variant with 40-bit of state and 8-bit of output, in LCG
format.

```c
uint8_t mwc_next(uint64_t *state) {
    const __uint128_t mul = 902823936;
    uint8_t s = *state >> 20;
    *state = (mul * *state) % 924491710463;
    return s;
}
```

If we plug this generator to [PractRand](//pracrand.sourceforge.net/), we can
observe that it fails after 32 MB of output. In comparison, here's a 40-bit
variant of PCG XSH-RR:

```c
uint16_t pcg_next(uint64_t *state) {
    uint64_t s = *state;
    *state = (s * 568512975829 + 1) & 0xffffffffff;

    uint16_t xorshifted = (s ^ (s >> 10)) >> 20;
    uint16_t rot = s >> 36;
    return (xorshifted << rot) | (xorshifted >> (16 - rot));
}
```

This generator fails after 16 GB of output, which is a lot better than the MWC
generator. I'd also like to test a 40-bit xoshiro generator, but I don't
understand the math enough to do so. However, we can safely say that at the
same state size, the MWC generators are inferior. This is why I decided to
improve the statistical quality of MWC with a PCG-style output permutation
function.

# Adding an output permutation

Currently, this is the code for the LCG form of the MWC-256 generator:

```zig
fn next(state: *u256) u64 {
  const result: u64 = @truncate(state.* >> 128);
  state.* = @intCast((@as(u512, state.*) * A) % M);
  return result;
}
```

In case you haven't known this already, this is not just a regular LCG, but
rather a truncated LCG. These often have better statistical quality, as they
can discard bits with low period and improve security while doing so (although
truncated LCGs are vulnerable to LLL based attacks). Dropping the 128 lower
bits seems reasonable because they are only shifted during the state
transition, only the higher bits have something interesting going on. This is
why the algorithm can be implemented using 64-bit multiplication.

The 64 highest bits are also discarded, and unlike the lower bits, they are
actually quite thoroughly mixed during the state transition. Therefor, it's a
good idea to only discard the 128 lower bits and fully use the 128 upper bits.
But the output is 64-bit, so the most obvious output permutation is to xor them
together, similar to the PCG XSL output permutation.

```zig
fn next(state: *u256) u64 {
  const result: u64 = @truncate((state.* >> 128) ^ (state.* >> 192));
  state.* = @intCast((@as(u512, state.*) * A) % M);
  return result;
}
```

With this tiny modification, the failure point of the MWC generator moved from
16 MB to 64 GB of output! This is roughly the same as, if not better than PCG,
probably thanks to the prime modulus. If we scale the generators to their full
state size, we can assume that if statistical flaws were found for PCG-64, it
would take 2^128 times that effort to find statistical flaws for our new
generator.

It might be tempting to add a random rotate, similar to the XSL-RR variant of
PCG, but I think that the statistical quality is already good enough. Also,
random rotate is used to make sure that all bits of the LCG have full period,
which we already solved by using a prime modulus. This gives us a new generator
with the speed of MWC and the enhanced statistical quality of PCG. If we
combine the state transition and output permutation, then we get an operation
as follow:

```zig
const m = @as(u128, self.state[0]) * MUL + self.carry;
return @truncate(m) ^ @intCast(m >> 64);
```

This is very similar to a recently popular operation for non-cryptographic
hashing: folded-multiply. It's widely used in many hash functions, such as
[xxhash](//xxhash.com/), [wyhash](//github.com/wangyi-fudan/wyhash) and its
[many](//github.com/golang/go/blob/d12fe60004ae5e4024c8a93f4f7de7183bb61576/src/runtime/hash64.go#L25)
[derivatives](//github.com/rust-lang/rustc-hash). Although there are no formal
analysis of this operation that I know of, considering its widespread use it
must be really effective.

So, this generator needs a name. We can use the PCG naming scheme and call it
PCG MWC XSL 256/64. Or we can use the Xo(ro)shiro naming convention and call it
mwc256x. But I'm free to come up with any name I want, so I'm going to call it
FMC-256 or Folded-multiply-carry 256. This is because the generator feels like
an MWC and folded-multiply tightly coupled together.

# Searching for a multiplier

Let's finally address the elephant in the room: the particular form of the
multiplier that makes this generator so efficient on modern hardware. In fact,
both the modulus and the multiplier are carefully derived for efficient
execution. The LCG modulus `M` actually has this form:

```
M = (MUL << 192) - 1
```

Where `MUL` is the MWC multiplier. The LCG multiplier `A` is actually the
[multiplicative modular
inverse](//en.wikipedia.org/wiki/Modular_multiplicative_inverse) of `2^64` and
`M`, which means that the MWC have the same lattice structure as a LCG with
multiplier `2^64` and prime modulus `M`. There are two major issues with this
construction:

- The multiplier is not a primitive root modulo `M`, so the generator can't be
full-period. The maximum period is only `M / 2`, which is also chosen to be
prime.

- `2^64` have terrible lattice structure. It's both too small compared to `M`
and too simple. Because of that, we can't use the usual method to find good
multipliers.

But how do you usually find a good LCG multiplier? A reliable method is to
evaluate them with the [spectral test](//en.wikipedia.org/wiki/Spectral_test).
So let's do that with Vigna's multiplier:

| f2       | f3       | f4       | f5       | f6       |
| -------- | -------- | -------- | -------- | -------- |
| 0.000000 | 0.000000 | 0.840802 | 0.000002 | 0.000564 |

This looks utterly terrible, so is every other multipliers. I don't know what
other criteria did Vigna use to search for a multiplier other than the period
length, but I have a heuristic in mind. LCG multipliers are used not just for,
well, LCGs, but they are also used as output permutation and hash functions.
There's no way for me to quantify this, but empirically, good LCG multiplier
tend to work really well as a bit-mixer. So let's test Vigna's multiplier as a
64-bit LCG multiplier:

| f2       | f3       | f4       | f5       | f6       |
| -------- | -------- | -------- | -------- | -------- |
| 0.905671 | 0.616314 | 0.641113 | 0.559620 | 0.601442 |

With this heuristic in mind, I set up a search algorithm to look for numbers
`MUL` with these criteria:

- Be very large (`MUL > 0.75 * 2^64`)
- The LCG modulus is prime (`(MUL << 192) - 1` is prime)
- The period is prime (`(MUL << 191) - 1` is prime)
- Have good lattice structure when used as a 64-bit LCG multiplier

After searching for about 21 CPU hours, I came across this multiplier:
`0xffff1aa1c69c8d92`. Interestingly, it's both larger than Vigna's multiplier
and have better 64-bit LCG spectral score.

| f2       | f3       | f4       | f5       | f6       |
| -------- | -------- | -------- | -------- | -------- |
| 0.909715 | 0.721577 | 0.683022 | 0.665940 | 0.807217 |

Vigna might have other priorities for selecting a multiplier, so his constant
might be better in ways that I'm not aware of. But I think that with the state
size of 2^256 and an output permutation, a good multiplier probably won't
matter too much.

# The final PRNG

So this is the PRNG that I ended up with: FMC-256, a 256-bit
multiply-with-carry pseudo-random number generator with a xor-folding output
permutation. Although 256-bit is more than enough for my common usage, if I
ever need more (or less) I can easily extend the design. Let's see if it lives
up to my requirements above.

## Statistical quality

With the xor-folding output function, the statistical quality of the generator
is roughly on par with PCG XSH-RR of the same size. Vigna also claims that at
256-bit, the MWC alone passes all statistical tests. If I have more time and
resource, I will test the full 256-bit version both with and without the output
permutation to see if it's true. But for now I can only rely on Vigna words and
the small-scale testing that I've done.

## Performance

Measuring performance of PRNGs is a tricky task as there are so many factors at
play. From my "instruction count analysis", I predicted that MWC-256 will be a
bit faster than Lehmer64, but by how much? And what about after applying the
output permutation? What about 32-bit number generations? To answer these
question, we decided to run a benchmark based on the task of computing PI using
Monte Carlo method.

<figure>
    <img src="performance.svg" alt="Performance comparison of different prngs">
</figure>

Note that for 32-bit generators, FMC-256 and Wyrand are the same generator as
their 64-bit counterpart, only their output are further truncated down to
32-bit. This shows that although FMC-256 was designed for 64-bit generation,
they are also quite competitive as 32-bit generators. For 64-bit generation, as
predicted earlier, FMC-256 is a bit faster than Lehmer64, even with the added
output permutation. It's also the fastest generator with what I consider
"enough state size (128-bit)".

Through the benchmark, we can conclude that FMC-256 achieved the original
performance goal: Can generate both 32-bit and 64-bit values faster than
PCG-32. Although, remember that benchmark results does not fully represent
real-world performance characteristics, it is only a rough estimation.

## Ease of seeding

One of my criticism of Xoshiro256++ is that it's hard to seed them. Since
FMC-256 is just an LCG underneath, it's as easy to seed as an LCG. A
requirement is that the state is non-zero, which corresponds to the existence
of a non-zero element in the state array. Another requirement is that the state
is smaller than the modulus, which corresponds to the carry being smaller than
the multiplier minus 1.

However, there's a problem with similar state creating correlated sequences.
This is partially solved with the output permutation, but to be extra secure,
the state can be advanced several times (10 from my experience) to fully mix
the key. This removes the requirement of a seed sequence or separate PRNG.

## Parallel generation

Previously, when I need to run randomized algorithms on multiple thread, I
usually initialize one on each thread from an external entropy source. This has
several problems:

1. Since I'm initializing from an external entropy source, the results are not
reproducible.
2. There's a chance that these random sequences overlap each other, creating
correlation.

The second problem can be addressed by increasing the state size, further
minimizing the chance of creating overlapping sequences. But there's a simple
technique to solve both of these problems: State partitioning. Instead of
choosing random seeds, we create a single generator from a single seed. To
create N generators for N threads, we iteratively advance the generator by a
huge jump and copy the generator. This ensures that the generators are far away
from each other so that they don't overlap, and since we're using a single
seed, the results are fully reproducible.

I'm not aware of a way to jump the generator ahead in MWC form, so this feature
is implemented entirely in LCG form, which means doing 256-bit modular
arithmetic with a prime modulus. Luckily, Zig already have 256-bit integers, so
I don't have to reimplement them. Since we're doing multiplication, the results
can overflow up to 512 bits. And 512-bit modulo is excruciatingly slow.
Although jump-ahead is not a frequent operation, I can't allow myself to write
code this slow, so I optimized it to use [Montgomery
reduction](//en.algorithmica.org/hpc/number-theory/montgomery/).

# Conclusion

This article documented my process of finding and implementing a 64-bit PRNG.
I'm really happy with the result, as it has the state space of 256-bit, the
same statistical quality as PCG (of the same size), and similar speed to
Lehmer64. I'm going to use this generator for future large scale simulations
(until problems start popping up). This article also mentions some other
generator, so let briefly go over them and talk about the mean reason why I
decided not to use them for general-purpose 64-bit generation.

**PCG 128/64:** It's not practically scalable to larger state size due to its
low speed.

**Xoshiro256++:** F2 Linear generators are too "magical" to me. I want to be
able to understand the math before using them, and hopefully someday I will.

**Lehmer64:** Similar to PCG, along with not having good statistical quality.

**SplitMix64:** It generates 64-bit numbers from 64 bits of state, so it can
only output a random permutation. This causes statistical issues but sometimes
can be useful, like when searching for MWC multipliers.

**Wyrand:** It also generates 64-bit numbers from 64 bits of state, but unlike
SplitMix, it omits some numbers from its output. It's not possible to scale the
generator to 128-bit because the output function is not a bijection, so even
with 128 bits of state the output's period is less than 2^64. Also, it was
[shown to fail PractRand](//github.com/wangyi-fudan/wyhash/issues/135).

I’m not saying by any means that the FMC-256 is perfect, but it strikes a good
balance for what I want need from a PRNG. The full source code is available
[here](//github.com/ishandutta2007/fmc-prng), but if you need a small C version, here it
is:

```c
typedef struct {
  uint64_t state[3];
  uint64_t carry;
} Fmc256;

#define MUL 0xffff1aa1c69c8d92

Fmc256 Fmc256_new(uint64_t seed[4]) {
  Fmc256 rng;
  memcpy(&rng, seed, sizeof(rng));
  rng.carry = rng.carry % (MUL - 2) + 1;
  return rng;
}

uint64_t Fmc256_next(Fmc256 *rng) {
  uint64_t result = rng->state[2] ^ rng->carry;
  __uint128_t m = (__uint128_t)rng->state[0] * MUL + rng->carry;
  rng->state[0] = rng->state[1];
  rng->state[1] = rng->state[2];
  rng->state[2] = m;
  rng->carry = m >> 64;
  return result;
}
```
