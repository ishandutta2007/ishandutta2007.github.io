+++
title = "I switched to Fish as my interactive shell"
date = "2024-10-01"
+++

ZSH has been my shell of choice since I started my command-line-centric
workflow. It's a popular shell with a [large](//github.com/zsh-users)
[community](//ohmyz.sh/) and an unprecedented level of customizability. ZSH is
also POSIX-compliant, which was very important to me for some reason. However,
after some reconsideration, I decided to port my config to the Fish shell, and
this is why.

<!-- more -->

# Performance

Performance is the price you have to pay for flexibility, and for a while it
felt that the customizability and features of ZSH were worth it. But recently,
I noticed that I frequently started typing before ZSH was fully loaded. I
decided to benchmark the start-up time ZSH compared to 2 other shells, namely
[Fish](//fishshell.com/) and [Nu](//www.nushell.sh/). Because these shells are
on par with my customized ZSH by default, it's fair to compare them that way.
Here is the result:

<figure>
    <img src="benchmark.png" alt="ZSH vs Fish vs Nu benchmark">
    <figcaption>start-up time differences between ZSH, Fish and Nu shell</figcaption>
</figure>

I'm surprised that Fish is almost 4 times faster than ZSH, and can start up
(and exit) in less than 1/60 of a second, which is faster than the refresh rate
of my monitor. This is a great result, while start-up time doesn't accurately
reflect the shell's responsiveness during interactive usage, it is usually a
good enough indicator. There have been many reasons for me to switch to Fish,
which I will discuss below, but the performance benefit is the final nail in
the ZSH coffin.

# Fish features

Out-of-the-box, Fish is already packed with many useful features, such as
syntax highlighting, autosuggestions, and prompts with git integration. They
worked so well that I didn't have to install any extensions. Of course, ZSH has
all these features, but they are not built-in, so they probably contributed to
the performance difference we observed earlier.

Other than that, there are some features that feel "nicer" in Fish, such as vi
mode and completion menus, and I consider good performance to be a feature in
and of itself. Fish also has sensible defaults, which shrunk the size of my
configuration file, and fewer configurations means less worrying about messing
up somewhere.

# Non POSIX-compliant

Another selling point of Fish is its syntax, which took its own turn away from
the POSIX standards. Although I find the syntax much nicer than POSIX-
compliant shells, I won't use it for anything other than writing my Fish
config. If I care about portability, I'd use regular shell scripting.
Otherwise, I'd use something like Python, Deno, or even Nu.

The non-compliancy extends beyond scripting and also affect interactive use.
This, compared with the fact that you can get all of Fish's features with a
configured ZSH, is why I've been staying away from Fish. However, I've been
adopting modern, non-standard alternatives, from programming style, paradigm,
languages, to softwares that I use. I'm starting to see that while standards
have their values, they are also limitations that sometimes you have to break
free to reach new heights.

# Drawbacks of using Fish

Because Fish is not as configurable as ZSH, there are things that I'd like to
change but are impossible to do. For example, I like autosuggestions, but don't
like using my history as a source, and there's currently no option to configure
that. I'm also used to being able to use vim keybindings on the tab completion
menu, and there's no way (that I know of) to enable it in Fish. However, I can
work around these problems, and other Fish features make dealing with them
worth it.

Being non-POSIX-compliant also means that you're relying on shell-related
applications to support Fish. For example, to activate Python virtual
environments, I have to execute `{path-to-env}/bin/activate.Fish` instead of
`{path-to-env}/bin/activate`. If the maintainer doesn't care to maintain the
Fish version of the script, I'm effectively on my own. There might be many
other intricacies of using Fish instead of a POSIX-compliant shell, and so far
I haven't encountered any of them.

# What about Nu

Nu is another modern, non-standard shell, which offers a unique approach to
working with your terminal. From my understanding, Nu adds data types to its
language instead of just working with raw textual data. There are also
pipelines, which enable powerful data manipulation. Its syntax and error
messages also make scripting in it much better than other shells or even
programming languages.

However, Nu is still changing quite often, so it's probably not a good idea to
use it as an interactive shell. While the structured data is good for
manipulation, Nu failed to display it in a way that look as good as regular
textual output, at least to me. Also, since most UNIX command-line tools
operate on plain text, I doubt that Nu will work well in cases involving
third-party tools.

I think that Fish is a better general-purpose, interactive shell. However, I'm
still open to the idea of switching completely to Nu in the future. Until then,
I still keep Nu around for data manipulation and scripting. Also, if I ever use
Windows on any of my machine, I'll use Nu as an interactive shell there. Nu is
great, and I recommend everyone to [check it out](//www.nushell.sh/).

# Final thoughts

So after more than 2 years, I finally migrated from ZSH to Fish. I'm still
amazed at how quickly my shell instances start up now. As of the time of
writing, I've partly gotten used to Fish's syntax differences in interactive
use, and completely ported my old ZSH config. I'm enjoying the benefits of
using Fish already, but only time will tell if Fish behaves well along the
road.
