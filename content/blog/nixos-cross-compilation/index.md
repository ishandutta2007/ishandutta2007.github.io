+++
title = "Setting up a reproducible cross-compiling environment in NixOS"
date  = "2025-01-21"
+++

NixOS makes it very hard to run dynamically linked application, to the point
where packaging is the path of least resistance. I don't consider this a
problem of NixOS, but rather a problem of dynamic linking. This is why when I
distribute a compiled application to a NixOS system, I usually do one of the
following:

- Create a statically linked Linux executable and use it directly.
- Cross-compile the application to Windows and run the .exe file with Wine.

To do either of these, a cross-compiling NixOS environment is required, so this
article documents my process of setting that up for Rust, Zig, C, and C++.

<!-- more -->

# Why do you need cross-compilation for static linking

The statement sound absurd, but this has been the state of Linux development
forever, more particularly development on **GNU**/Linux systems that uses the
GNU standard C library, or Glibc. Glibc is designed with dynamic linking in
mind for performance and sharing between multiple programs. Other than not
working on NixOS, dynamic linking also causes ABI incompatibilities and [DLL
hells](//en.wikipedia.org/wiki/DLL_hell). This is why nowadays people bundle
applications with their dynamically linked dependencies together in package
formats such as Flatpak, AppImage, or the Nix package format.

To statically link your application, you can either skip the libc layer and
directly invoke system calls, or you can use a different implementation of libc
that allows static linking. Linking against a different standard C library is
considered a different compilation target, so it requires a different toolchain
and a cross-compilation approach. A popular Glibc alternative is Musl, which
allows efficient static linking. This is what I often use to produce statically
linked Linux binaries.

# Rust

Let's start with Rust, I wrote and cross-compiled [a web
server](//github.com/ishandutta2007/ninja) a while ago on a "normal" Linux distribution
(Fedora), so I have a rough idea on how to perform cross-compilation with Rust:

- Install the system packages required for cross-compiling to your target
- Add the target with `rustup target add`
- Compile with the `--target` argument

But before doing any cross-compilation, let's set up a baseline Rust project.

```nix
{
  description = "A basic Rust flake";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
  in {
    devShell.${system} = pkgs.mkShell {
      buildInputs = [
        pkgs.rustup
      ];

      shellHook = ''
        # Avoid polluting the home directory
        export RUSTUP_HOME=$(pwd)/.rustup/
        export CARGO_HOME=$(pwd)/.cargo/

        # Use binaries installed with `cargo install`
        export PATH=$PATH:$CARGO_HOME/bin

        # Install and display the current toolchain
        rustup show
      '';
    };
  };
}
```

The most important component of this flake is the `buildInputs` and `shellHook`
attributes. The `buildInputs` list specifies the system package of our
environment. Currently, we only have `rustup`, but that's enough for a simple
Rust environment. The `shellHook` script is executed when we activate the
environment. Currently, it sets the rustup and cargo installation path to make
this project more self-contained, and show the current toolchain. If we
activate the development shell with `nix develop`, this will be printed:

```
Default host: x86_64-unknown-linux-gnu
rustup home:  .../.rustup/

no active toolchain
```

You might be tempted to install a toolchain with the `rustup toolchain install`
command, which is perfectly fine, but there's a more declarative and
self-contained way, using
[`rust-toolchain.toml`](//rust-lang.github.io/rustup/overrides.html#the-toolchain-file).
This approach fits the NixOS mentality better, and is also a standardized way
to configure per-project Rust toolchains.

```toml
[toolchain]
channel = "stable"
components = [ "rust-analyzer" ]
profile = "minimal"
```

I also added the `rust-analyzer` component for IDE integration while we're at
it. Exiting and re-entering the environment, you'll see `rustup` installing our
Rust environment. Pay attention to the last two line.

```
stable-2025-01-09-x86_64-unknown-linux-gnu (overridden by '.../rust-toolchain.toml')
rustc 1.84.0 (9fc6b4312 2025-01-07)
```

Pay attention to the last two line. It shows that the installed toolchain
version is `stable-2025-01-09`. For reproducibility, let's pin that version in
our `rust-toolchain.toml` file. If you need an older compiler for whatever
reason, look up the compiler version in [releases.rs](releases.rs/docs/) and
grab the release date.

```toml
[toolchain]
channel = "stable-2025-01-09"
```

We're finished with the baseline Rust project. You can now create and build a
Rust application:

```bash
$ cargo init . --name example
$ cargo build --release
$ file target/release/example
```

It will show that the application is a dynamically linked 64-bit ELF
executable. So let's try to change that.

## Add the Musl target

As mentioned above, I'll use Musl as a Glibc alternative to statically link the
application. Let's try the steps that I roughly remember from Fedora:

**Step 1:** Install the system packages required for cross-compiling to your
target. For this, we'll have to edit the Nix flake and add more build inputs.
For now, the Musl-configured C compiler is all we need.

```nix
{
  # ...
  devShell.${system} = let
    pkgsMusl = import pkgs.path {
      system = system;
      crossSystem = {
        config = "x86_64-unknown-linux-musl";
      };
    };
  in pkgs.mkShell {
    buildInputs = [
      pkgsMusl.stdenv.cc
      pkgs.rustup
    ];

    # ...
  };
}
```

**Step 2:** Add the target to rustup. Instead of using `rustup target add`,
we'll edit the `rust-toolchain.toml` file for the same reason as above.

```toml
[toolchain]
# ...
targets = [ "x86_64-unknown-linux-musl" ]
```

**Step 3:** Compiling with the `--target` argument. To avoid passing `--target`
all the time, we can set the `CARGO_BUILD_TARGET` environment variable.

```nix
pkgs.mkShell {
  # ...
  CARGO_BUILD_TARGET = let
    toolchainStr = builtins.readFile ./rust-toolchain.toml;
    targets = (builtins.fromTOML toolchainStr).toolchain.targets;
  in builtins.head targets;
  # ...
}
```

This will read the `rust-toolchain.toml` file and grab the first specified
target. Building again, we will indeed get a statically linked executable.

```bash
$ cargo build
$ file target/x86_64-unknown-linux-musl/release/example
```

So the cross-compiling environment worked, at least for the task of linking
against a different libc. Let's try building something more complicated, what
about this site's [generator](//www.getzola.org/)?

```bash
$ cargo install --git https://github.com/getzola/zola.git --target=x86_64-unknown-linux-musl
```

The compilation failed because a C library can't be built. This is because the
C compiler and linker are not set up correctly. I don't know why this is the
case only for building C libraries, but it is what is it. To fix this problem,
We can add these two environment variables:

```nix
{
  # ...
  devShell.${system} = let
    pkgsMusl = import pkgs.path {
      system = system;
      crossSystem = {
        config = "x86_64-unknown-linux-musl";
      };
    };

    ccMusl = pkgsMusl.stdenv.cc;
  in pkgs.mkShell {
    buildInputs = [
      ccMusl
      pkgs.rustup
    ];

    
    # IMPORTANT! Set up the compiler and linker for C libraries
    CARGO_TARGET_X86_64_UNKNOWN_LINUX_MUSL_LINKER = ccMusl;
    CC_x86_64_unknown_linux_musl = ccMusl;

    # ...
  };
}
```

So this adds a 4th step to our process: "Set up the C compiler and linker for
the target". This might also be important in non NixOS environments, but
previously I haven't tried building a project with C dependencies. With this,
we finally manage to build and install a statically linked Zola.

```bash
$ cargo install --git https://github.com/getzola/zola.git --target=x86_64-unknown-linux-musl
$ file `which zola`
```

## Add the Windows target

Cross-compiling to Windows is fairly easy thanks to the [MinGW-w64
project](//www.mingw-w64.org/). You might be heard of it as a "GCC on Windows"
program. But you can also use its compiling to Windows capabilities on Linux
for cross-compilation. Compiling Rust to Windows is similar to linking against
Musl, so let's try the steps mentioned above. Here's the final flake after
these 4 steps:

```nix
{
  description = "A basic Rust flake";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
  in {
    devShell.${system} = let
      targetName = {
        mingw = "x86_64-w64-mingw32";
        musl = "x86_64-unknown-linux-musl";
      };

      # Generate the cross compilation packages import
      pkgsCross = builtins.mapAttrs (name: value: import pkgs.path {
        system = system;
        crossSystem = {
          config = value;
        };
      }) targetName;

      # Grab the corresponding C compiler binaries
      ccPkgs = builtins.mapAttrs (name: value: value.stdenv.cc) pkgsCross;
      cc = builtins.mapAttrs (name: value: "${value}/bin/${targetName.${name}}-cc") ccPkgs;
    in pkgs.mkShell {
      buildInputs = [
        pkgs.rustup
      ] ++ builtins.attrValues ccPkgs;

      # Set the default target to the first available target
      CARGO_BUILD_TARGET = let
        toolchainStr = builtins.readFile ./rust-toolchain.toml;
        targets = (builtins.fromTOML toolchainStr).toolchain.targets;
      in builtins.head targets;

      # Set up the C compiler
      CARGO_TARGET_X86_64_UNKNOWN_LINUX_MUSL_LINKER = cc.musl;
      CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER = cc.mingw;

      # Set up the C linker
      CC_x86_64_unknown_linux_musl = cc.musl;
      CC_x86_64_pc_windows_gnu = cc.mingw;

      shellHook = ''
        # Avoid polluting home directory
        export RUSTUP_HOME=$(pwd)/.rustup/
        export CARGO_HOME=$(pwd)/.cargo/

        # Use binaries installed with `cargo install`
        export PATH=$PATH:$CARGO_HOME/bin

        # Install and display the current toolchain
        rustup show
      '';
    };
  };
}
```

And here's the new `rust-toolchain.toml`. The only difference is the added
`x86_64-pc-windows-gnu` target. I'll also set it as the default target by
moving it to the front.

```toml
[toolchain]
channel = "stable-2025-01-09"
components = [ "rust-analyzer" ]
profile = "minimal"
targets = [ "x86_64-pc-windows-gnu", "x86_64-unknown-linux-musl" ]
```

Compiling our example with `cargo build`, we get the following error:

```bash
  = note: /nix/store/.../bin/x86_64-w64-mingw32-ld: cannot find -l:libpthread.a: No such file or directory
          collect2: error: ld returned 1 exit status
```

So we need to add `libpthread` as a linker flag. I use the constructs below to
make adding additional libraries easier by listing out the Nix packages.

```nix
pkgs.mkShell {
  RUSTFLAGS = builtins.map (a: "-L ${a}/lib") [
    pkgsCross.mingw.windows.mingw_w64_pthreads
  ];
}
```

With this, we're now capable of building both the example and Zola, and you can
run the resulting binaries with [Wine](//www.winehq.org/). But you can't use
commands such as `cargo run` and `cargo test`, and using Wine will bring
configuration from your system Wine prefix, which will hurt reproducibility. So
let's set up Wine, create a local Wine prefix and set it as the runner for
Cargo.

```nix
let
  # ...
  wine = pkgs.wineWowPackages.stable;
in pkgs.mkShell {
  buildInputs = [
    pkgs.rustup
    wine
  ] ++ builtins.attrValues ccPkgs;
  
  # ...

  # Use wine for `cargo run`, `cargo test`, etc.
  CARGO_TARGET_X86_64_PC_WINDOWS_GNU_RUNNER = "${wine}/bin/wine64";

  shellHook = ''
    # Avoid polluting the home directory
    export RUSTUP_HOME=$(pwd)/.rustup/
    export CARGO_HOME=$(pwd)/.cargo/
    export WINEPREFIX=$(pwd)/.wine/

    # Use binaries installed with `cargo install`
    export PATH=$PATH:$CARGO_HOME/bin

    # Install and display the current toolchain
    rustup show
  '';
}
```

So we finished our flake for cross compiling Rust using Musl and MinGW. There
might be problems with it, like how we encountered one before adding the
compiler and linker environment variables. But the cool thing with Nix is that
once you solve a problem, the solution is reproducible, so you practically
solved it forever.

# Zig

If you think that we did above is utterly insane, don't worry. Zig is much,
much easier to set up. Here's the baseline flake for a Zig project.

```nix
{
  description = "A basic Zig flake";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
  in {
    devShell.${system} = pkgs.mkShell {
      buildInputs = [
        pkgs.zig
      ];
    };
  };
}
```

That's it. No toolchain management, not setting up PATHs, not even a shell
hook. This is because everything is self-contained in the zig package. Also,
guess what, cross-compilation is supported out of the box. You don't even need
to add system packages.

```bash
zig init
zig build -Dtarget=x86_64-linux-musl
zig build -Dtarget=x86_64-windows-gnu

file zig-out/bin/example
file zig-out/bin/example.exe
```

In fact, remember how I said that another way to make a statically linked
binary is to skip the libc layer and directly invoke system calls? In Zig, libc
is optional, so everything is statically linked by default. I want to say good
things about Zig and its ease of installation, but that the topic for another
article.

However, similar to Rust, you need to set up Wine to use `zig build run` or
`zig build test` when cross compiling to Windows. The process is pretty
straightforward, add the Wine package, create a local Wine prefix and tell the
build system to use Wine.

```nix
pkgs.mkShell {
  buildInputs = [
    pkgs.zig
    pkgs.wineWowPackages.stable
  ];

  shellHook = ''
    export WINEPREFIX=$(pwd)/.wine/
  '';
}
```

```zig
pub fn build(b: *std.Build) void {
  // ...

  // Detect cross-compilation and enable Wine
  if (target.result.os.tag == .windows and builtin.os.tag != .windows) {
    b.enable_wine = true;
  }
  // ...
}
```

As you can see, it's very easy to create a Zig cross-compiling environment. But
to be honest, as everything is bundled with Zig already, if I don't need Wine
or don't care too much about reproducibility, I'd just use a simple [ad-hoc
shell](//nix.dev/tutorials/first-steps/ad-hoc-shell-environments.html).

# C and C++

Just when you think that it couldn't get better, Zig supports compiling C and
C++, with cross-compilation support, out of the box, in a single package. The
fact that they managed to pull this off is baffling to be. This means that we
can just use our Zig environment for C and C++ development. The build script is
different, but it's project-dependent anyway, so I won't show it here.

If you want an example project, here's [one](//github.com/ishandutta2007/svgv). Although
the project requires Gdi+, I can comfortably develop it on Linux, run it with
Wine or send it to my Windows VM. There was no `flake.nix` because I used to
just create an ad-hoc shell every time I need Wine and the Zig compiler.

Using Zig to build C or C++ also allows us to benefit from incremental
compilation and the smart caching system. Zig is also surprisingly good for
writing build scripts, even better than CMake and the like. If you don't want a
full-blown build system, or needs to integrate with one that supports a more
traditional compiler, you can use the `zig cc` or `zig c++` command which still
support cross-compilation and incremental compilation.

# Conclusion

This article shown how to set up a cross-compiling NixOS environment for some
programming language. It focused mostly on Rust, as it's the hardest language
to set up. Setting up that environment is not trivial, as it requires knowledge
of both the Nix ecosystem and the language toolchain. But I think that the
reproducibility is totally worth it. Every time I want to make a new Rust
project, I just need to grab the `flake.nix` and `rust-toolchain.toml` files,
and `nix develop` myself into the newly created environment. Trying to
cross-compile also shows many of Zig's advantages. The biggest of which being
that it was a new language designed from the ground up with the intention of
having cross-compiling as a first class use case.

Modern software is needlessly complicated to set up, and I think that projects
such as Docker and NixOS are not long term solutions. I think that the only
reliable solution is to have easy distribution as a goal from the start.
Cross-compilation is one method to prevent you from straying too far away from
that goal. If you can cross-compile your code and run it on another target, it
means that your application is portable and reliable, which usually makes them
trivial to set up and use.
