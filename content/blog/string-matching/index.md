+++
title = "String matching with compile time hash tables"
date  = "2024-11-29"
+++

I use switch statements a lot in C and even C++. The syntax sucks, but the
alternatives are either too verbose (table of function pointers) or don't
express the intention well (if-else chain). It was sad, but I accepted long ago
that switch statements only work on numeric types and usually use the
alternatives on strings and arrays. But switching on a string has become a
common operation for me, and I recently ended up with a reasonably good
solution for it.

<!-- more -->

# The problem

Suppose we need to run some code based on the current weekday. We actually have
two problems: representing the weekday and performing matching on the
representation. The most straightforward way to do this is to use strings to
represent weekdays and use one of the switch statement alternatives that I
mentioned above. For example:

```cpp
std::string current_weekday = "monday";

// if-else chain
if (current_weekday == "monday") {
    process_monday();
} else if (current_weekday == "tuesday") {
    process_tuesday();
} else if (current_weekday == "wednesday") {
    process_wednesday();
} else if (current_weekday == "thursday") {
    process_thursday();
} else if (current_weekday == "friday") {
    process_friday();
} else if (current_weekday == "saturday") {
    process_saturday();
} else if (current_weekday == "sunday") {
    process_sunday();
} else {
    fprintf(stderr, "Invalid weekday: `%s`\n", current_weekday);
}

// table of function pointers
using WeekdayMap = std::unordered_map<std::string_view, void process(void)>;
WeekdayMap weekday_map {
    {"monday", process_monday},
    {"tuesday", process_tuesday},
    {"wednesday", process_wednesday},
    {"thursday", process_thursday},
    {"friday", process_friday},
    {"saturday", process_saturday},
    {"sunday", process_sunday},
};

WeekdayMap::iterator it = weekday_map.find(current_weekday);
if (it != weekday_map.end()) {
    it->second();
}
```

There are several problems with this, but let's address the representation
first. Strings can contain more than just the valid values. Our
`current_weekday` string can contain random gibberish or even nothing at all.
This is why the matching code needs to have a code path that handles invalid
inputs. It's the same as the [billion-dollar
mistake](//www.infoq.com/presentations/Null-References-The-Billion-Dollar-Mistake-Tony-Hoare/),
just even worse because storing and matching on strings are more expensive than
null pointers. Before going through the solution for this, let's take a look at
the two methods of string matching first.

As mentioned in the introduction, if-else chains doesn't convey the intention
of matching on a set of values, at least in my opinion. For me, if-elses are
for checking on conditions, not values, and even if expressiveness isn't a
problem, then performance is. The time complexity of this method is `O(mn)`
where `m` is the number of strings to match against and `n` is the average
length. Also the amount of syntax noise is insane if there isn't enough reason
not to use it.

The function table approach is a bit better in terms of performance as it uses
an `std::unordered_map`, which is a stupid name for a hash table. Still,
`std::unordered_map` store its data on the heap, so this method doesn't work
when heap allocation is expensive or unavailable. And the fact that it uses
function pointers means that you can't capture the stack without explicitly
setting them as function arguments. We can get around this by using
`std::function` which is a polymorphic function type that supports lambdas,
which in turn supports stack capturing. But using `std::function` means that
you are using dynamic dispatch, which introduces even more performance
overhead.

# Representation

While the code above demonstrated a big problem with string matching in C++,
that problem actually comes from using strings in general. Strings are horrible
ways to represent a set of values, like a set of card suits ♦ ♣ ♥ ♠, a set of
people, or a set of days of the week. A better way to represent them is with
`enum`:

```cpp
enum Weekday {
    WEEKDAY_MONDAY = 0,
    WEEKDAY_TUESDAY,
    WEEKDAY_WEDNESDAY,
    WEEKDAY_THURSDAY,
    WEEKDAY_FRIDAY,
    WEEKDAY_SATURDAY,
    WEEKDAY_SUNDAY,
    WEEKDAY_COUNT,
};
```

They are compact, and can only represent the valid values unless you explicitly
cast an integer into them. More importantly, you can use switch statements to
match on them.

```cpp
Weekday current_weekday = WEEKDAY_MONDAY;

switch (current_weekday) {
    case WEEKDAY_MONDAY: {
        process_monday();
    } break;
    case WEEKDAY_TUESDAY: {
        process_tuesday();
    } break;
    case WEEKDAY_WEDNESDAY: {
        process_wednesday();
    } break;
    case WEEKDAY_THURSDAY: {
        process_thursday();
    } break;
    case WEEKDAY_FRIDAY: {
        process_friday();
    } break;
    case WEEKDAY_SATURDAY: {
        process_saturday();
    } break;
    case WEEKDAY_SUNDAY: {
        process_sunday();
    } break;
    case WEEKDAY_COUNT: {
        __builtin_unreachable();
    } break;
}
```

Using switch statements on strings is extremely convenient. The compiler will
warn you if you forgot to handle an enumerant, so adding new values is trivial.
Also notice how I add a `_COUNT` enumerant then in the switch case I have to
mark it as unreachable. The `_COUNT` enumerant is for determining the number of
elements in the enum, which is useful for iterating over all values or creating
static arrays.

# String matching with enums

But if enums are so useful, then why do we still need string matching? The
problem is that what if the inputs are specified as strings? In the original
problem, if `current_weekday` is of type `std::string`, how do we match over
them? If we want to keep the convenience and simplicity of using enums, then
you need to convert strings into them.

```cpp
std::string current_weekday = "monday";
Weekday current_weekday_enum = ...;

switch (current_weekday) {
    // ...
}
```

And how do we convert strings into enums? with string matching! So we
transformed a string matching problem into another problem; what's the point?
Well, this problem is very specific, unlike arbitrary code execution based on a
value, so we can construct a reusable solution.

```cpp
template<typename T, uint32_t N>
std::unordered_map<std::string_view, T> generate_map(const std::string_view (*string_table)[N]) {
  std::unordered_map<std::string_view, T> map;
  for (uint32_t i = 0; i < N; ++i) {
    map.insert({(*string_table)[i], (T)i});
  }
  return map;
}

constexpr std::string_view Weekday_str[WEEKDAY_COUNT] = {
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
};

using WeekdayMap = std::unordered_map<std::string_view, Weekday>;
WeekdayMap map = generate_map<Weekday>(&Weekday_str);

std::string current_weekday = "monday";

WeekdayMap::iterator it = map.find(current_weekday);
if (it == map.end) {
    fprintf(stderr, "Invalid weekday: `%s`\n", current_weekday);
} else {
    switch (it->second) {
        // ...
    }
}
```

While this solved the problem of converting from strings to enums, it's a bit
sluggish for general-purpose string matching. Also, this implementation still
has some problems:

- Problems related to the function table approach.
- It might be better to handle invalid input in the switch case instead of
  checking for iterator validity.
- It might be better if using enums is not required.

The first two problems require creating a custom hash table, so let's solve the
third one first. To do that, instead of creating a map from string to enum
value, we can instead create a map from string to integer and type-cast it to
enum values later.

```diff
-template<typename T, uint32_t N>
+template<uint32_t N>
-std::unordered_map<std::string_view, T> generate_map(const std::string_view (*string_table)[N]) {
+std::unordered_map<std::string_view> generate_map(const std::string_view (*string_table)[N]) {
- std::unordered_map<std::string_view, T> map;
+ std::unordered_map<std::string_view, uint32_t> map;
  for (uint32_t i = 0; i < N; ++i) {
-   map.insert({(*string_table)[i], (T)i});
+   map.insert({(*string_table)[i], i});
  }
  return map;
}

...
-WeekdayMap map = generate_map<Weekday>(&Weekday_str);
+WeekdayMap map = generate_map(&Weekday_str);
...


if (it == map.end) {
    fprintf(stderr, "Invalid weekday: `%s`\n", current_weekday);
} else {
-   switch (it->second) {
+   switch ((Weekday)it->second) {
        // ...
    }
}
```

Creating map to enums and map to integer both have their pros and cons, but for
the sake of generality, I decided to go with the map to integer configuration.
So in theory, we should be able to do something like this, right?

```cpp
constexpr std::string_view Weekday_str[] = {
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
};

std::unordered_map<std::string_view, uint32_t> map = generate_map(&Weekday_str);

std::string current_weekday = "monday";
switch (map[current_weekday]) {
  case map["monday"]: {
    process_monday();
  } break;
  // ...
}
```

Compiling this with Clang 18.1.8, I got:

```
test.cpp:29:10: error: case value is not a constant expression
   29 |     case map["monday"]: {
      |          ^~~~~~~~~~~~~
test.cpp:29:10: note: non-constexpr function 'operator[]' cannot be used in a constant expression
/usr/bin/../lib/gcc/x86_64-redhat-linux/14/../../../../include/c++/14/bits/unordered_map.h:991:7: note: declared here
  991 |       operator[](key_type&& __k)
      |       ^
1 error generated.
```

Case values needing to be known as compile time is something obvious but wasn't
considered before. I needed a custom, compile time hash table. Compile time
hash tables effectively solves the problem of memory allocation and table
creation overhead. And a custom hash table allows me to configure it to return
invalid input as a separate, special value instead of a default value like with
`std::unordered_map`.

# Implementing a hash table

Dynamic arrays and hash tables are pretty ubiquitous in programming, but unlike
arrays, which have a [universally acceptable
implementation](//en.wikipedia.org/wiki/Dynamic_array), hash tables are
surprisingly complex and diverse, with new
[breakthroughs](//www.youtube.com/watch?v=ncHmEUmJZf4&t=3s) and
[innovations](//engineering.fb.com/2019/04/25/developer-tools/f14/) popping up
now and then. Picking the hash function alone is an entire problem of its own;
do you want good performance, uniform distribution, or cryptographic security?
I decided to go with the FNV-1A hash function, which has decent performance and
quality. But most importantly, it's extremely simple and `constexpr`
compatible.

```cpp
template<typename T, const T PRIME, const T BASIS>
constexpr T fnv_1a(const char *str, uint32_t len) {
    T h = BASIS;

    for (uint32_t i = 0; i < len; ++i) h = (h ^ (uint8_t)str[i]) * PRIME;
    for (uint32_t t = len; t; t >>= 8) h = (h ^ (t & 0xff)) * PRIME;

    return h;
}

constexpr uint64_t hash64(const char *str, uint32_t len) {
    constexpr uint64_t prime = 0x100000001b3;
    constexpr uint64_t basis = fnv_1a<uint64_t, prime, 0>("some random seed", 16);
    return fnv_1a<uint64_t, prime, basis>(str, len);
}

constexpr uint32_t hash32(const char *str, uint32_t len) {
    uint64_t h = hash64(str, len);
    return h - (h >> 32);
}
```

There are some modifications to the hash function that I've made: - The
function also hashes the bits of the length for slightly better hash quality.
The function computes its own offset basis from a given random seed string. On
64-bit machines, the difference in 32-bit and 64-bit operations is negligible,
so to compute a 32-bit hash, I computed a 64-bit hash, then combined the 32-bit
parts of the hash with a subtraction for better diffusion.

Is this the best hash function for this purpose? Absolutely not. The best hash
function is unique for every set of strings, called a [perfect hash
function](//en.wikipedia.org/wiki/Perfect_hash_function). Generating perfect
hash functions at compile time is an interesting problem that I'm sure to
investigate, but for now I'm just going to use my modified FNV-1A hash function
and focus more on the "table" part of hash tables. I'm just going to show the
code, then explain it later.

```cpp
constexpr uint32_t compute_shift(uint32_t x) {
    uint32_t res = 1;
    uint32_t shift = 31;
    while (res < x) {
        res <<= 1;
        --shift;
    }
    return shift;
}

template<const size_t N>
class IndexMap {
public:
    constexpr IndexMap(const std::string_view (*map)[N]) : map{map}, keys{} {
        for (uint32_t i = 0; i < N; ++i) {
            std::string_view sv = (*map)[i];
            uint32_t h = hash32(sv.data(), sv.size()) >> IndexMap::ht_shift;
            while (this->keys[h]) {
                h = (h + 1) & (ht_size - 1);
            }
            this->keys[h] = i + 1;
        }
    }

    constexpr uint32_t operator[](std::string_view key) const {
        uint32_t h = hash32(key.data(), key.size()) >> IndexMap::ht_shift;
        while (this->keys[h] && (*this->map)[this->keys[h] - 1] != key) {
            h = (h + 1) & (ht_size - 1);
        }
        return this->keys[h] - 1;
    }

    static constexpr uint32_t invalid = -1;
private:
    static constexpr uint32_t ht_shift = compute_shift(N);
    static constexpr uint32_t ht_size = 1 << (32 - IndexMap::ht_shift);

    const std::string_view (*map)[N];
    uint32_t keys[IndexMap::ht_size];
};
```

The hash table is rather simple. FNV-1A has higher-quality high bits, so I
shifted the initial hash value. The table size is a power of two with values
ranging between 2N + 2 and 4N - 4, so the load factor is between 50% and 25%.
To make up for its low load factor, the hash table only references the strings,
so it can't live longer than the original array. So the extra memory usage is
`4 * sizeof(uint32_t)` --- or 16 --- bytes per string, which is the same as an
unoptimized binary search tree (left and right pointers). So the hash table is
actually quite memory-efficient, and the reduced load factor means that probing
performance is also great.

The stored indices are incremented by one, so that invalid keys are mapped to
zero, and subtracting them by one gives -1, which will be our special invalid
value. Also, you can seed that all functions, including the constructor, are
marked `constexpr`, so the hash table can be generated at compile time.
However, both the hash table and the array of strings must be stored in [static
storage](//en.cppreference.com/w/cpp/language/storage_duration) in order to use
them at compile time, such as for switch statements.

# Using the new hash table

## General string matching

This is what using the static hash table for general string matching looks
like. Notice that the template parameters are automatically inferred, which is
quite convenient, but also unclear.

```cpp
static constexpr std::string_view Weekday_str[] = {
  "case 1",
  "case 2",
  "case 3",
};

static constexpr IndexMap map {&Weekday_str};

std::string input = "case 2";

switch (map[input]) {
    case map["case 1"]: {
        handle_case_1();
    } break;
    case map["case 2"]: {
        handle_case_2();
    } break;
    case map["case 3"]: {
        handle_case_3();
    } break;
    case map.invalid: {
        fprintf(stderr, "Invalid input: `%s`\n", input);
    } break;
}
```

This simple hash table, while not the most efficient, satisfied all of our
requirements. It's generated at compile time, usable as a general string
matching construct, and handling invalid input is more streamlined. However,
C++'s compile time evaluation isn't flexible enough to do stuff such as check
if the switch cases are actually valid without doing severe metaprogramming
mental gymnastics.

## String to enum conversion

Using the hash table for our smaller problem of string to enum conversion is
similar, even better as you also get the benefit of compiler warning when you
missed a value. But you need to add an `_INVALID` enumerant to your enum so
that you can handle that in the switch case as well (and get warnings if you
forgot to).

```cpp
enum Weekday {
    WEEKDAY_INVALID = -1,
    WEEKDAY_MONDAY,
    WEEKDAY_TUESDAY,
    WEEKDAY_WEDNESDAY,
    WEEKDAY_THURSDAY,
    WEEKDAY_FRIDAY,
    WEEKDAY_SATURDAY,
    WEEKDAY_SUNDAY,
    WEEKDAY_COUNT,
};

static constexpr IndexMap<WEEKDAY_COUNT> map {&Weekday_str};

switch (map[current_weekday]) {
    case WEEKDAY_MONDAY: {
        process_monday();
    } break;
    case WEEKDAY_TUESDAY: {
        process_tuesday();
    } break;
    // ... 
    case WEEKDAY_INVALID: {
        fprintf(stderr, "Invalid weekday: `%s`\n", current_weekday);
    } break;
    case WEEKDAY_COUNT: {
        __builtin_unreachable();
    }
}
```

# Conclusion

This post showcased my new approach to string matching and string to enum
conversion. I'm pretty happy with the solution I came up with, but there are
lots to improve upon. Some of which are:

- Compile time hash function generation
- Robin Hood hashing
- SIMD probing
- C code generation

Generalizing the hash table to enable dynamic insertion and removal at run time
might be beneficial to solve some problems. Also, I find the technique of
string to index mapping interesting; it might be useful for creating dense
associative arrays with low memory footprints and fast iteration.
