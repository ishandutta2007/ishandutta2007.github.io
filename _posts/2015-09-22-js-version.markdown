---
layout:     post
title:      "「译」ES5, ES6, ES2016, ES.Next: JavaScript 的版本是怎么回事？"
subtitle:   "ES5, ES6, ES2016, ES.Next: What's going on with JavaScript versioning?"
date:       2015-09-22
author:     "Ishan"
header-img: "img/post-bg-js-version.jpg"
tags:
    - Web
    - JavaScript
    - 译
---


JavaScript 有着很奇怪的命名史。

1995 年，它作为网景浏览器（Netscape Navigator）的一部分首次发布，网景给这个新语言命名为 LiveScript。一年后，为了搭上当时媒体热炒 Java 的顺风车，临时改名为了 JavaScript *（当然，Java 和 JavaScript 的关系，就和雷锋和雷锋塔一样 —— 并没有什么关系）*

![java-javascript](/img/in-post/post-js-version/javascript-java.jpg)
<small class="img-hint">歪果仁的笑话怎么一点都不好笑</small>

> 译者注：[wikipedia 的 JavaScript 词条](https://en.wikipedia.org/wiki/JavaScript#History) 更详细的叙述了这段历史

In 1996, the Internet submitted JavaScript to [Ecma International (European Computer Manufacturer Association)] (http://www.ecma-iternational.org/) and finally determined new language standards, which is Ecmascript. Since then, ECMAScript has become the basis for all JavaScript to implement. JavaScript is called this language.

> 术语（译者注）：
> 
> * *标准（Standard）*： 用于定义与其他事物区别的一套规则
> * *实现（Implementation）*： 某个标准的具体实施/真实实践


However, JavaScript developers do not care much, because in the 15 years after birth, ECMAScript has not changed much, and many realizations in reality have been very different from standards. In fact, after the release of the first version of ECMAScript, two versions were released quickly, but since the release of ECMAScript 3 in 1999, no change has been successfully added to the official norm within ten years. Instead, the major browser manufacturers are scrambling to expand their language first. Web developers have no choice but to try to try and support these APIs. Even after the release of ECMAScript 5 in 2009, these new specifications still used these new specifications to get widespread support from the browser. Essence

> 译者注：[ECMAScript 第四版草案](https://en.wikipedia.org/wiki/ECMAScript#4th_Edition_.28abandoned.29)由于太过激进而被抛弃，Adobe 的 [ActionScript 3.0](https://en.wikipedia.org/wiki/ActionScript) 是 ECMAScript edition 4 的唯一实现（ Flash 差点就统一 Web 了）

By 2012, the incident suddenly began to change. Everyone began to push the support of the old version of the IE browser, and it became more feasible to write the code with the ECMAScript 5 (ES5) style. At the same time, a new ECMAScript specification has begun to start. At this point, everyone began to be used to describing the implementation of various JavaScript for the support of ECMASCRIPT specifications. Before being officially called ECMAScript 6th Edition (ES6), this new standard was originally called ES. Harmony. In 2015, TC39, responsible for formulating the draft ECMAScript standard, decided to change the system that defines the new standard to once a year, which means that once each new feature is approved, it can be added. Only after all characteristics are fine to be finalized. Therefore, before the announcement of ECMAScript in June, the 6th edition of ECMAScript was renamed ECMAScript 2015 (ES2015)

At present, there are still many new JavaScript features or grammar are being proposed, including [decorators (decorator)] (https://github.com/wycats/javaScript-decoRators), [async-Await (Async- Await asynchronous programming model) )] (Https://github.com/lukehoban/ecmascript- asyncawait) and [Static Class Properties (static class attributes)] (https://github.com/jeffmo/es-propett IES). They are usually called ES7, ES2016, or ES.NEXT, but in fact they can only be called proposals or possibilities. After all, the specifications of ES2016 have not yet been completed, and they may be introduced, or there may be no one. TC39 divides a proposal into 4 stages, and you can check the proposals on the [Babel's official website] (https://babeljs.io/docs/usage/experimental/).

所以，我们该如何使用这一大堆术语呢？下面的列表或许能帮助到你：

* **ECMAScript**：一个由 ECMA International 进行标准化，TC39 委员会进行监督的语言。通常用于指代标准本身。
* **JavaScript**：ECMAScript 标准的各种实现的最常用称呼。这个术语并不局限于某个特定版本的 ECMAScript 规范，并且可能被用于任何不同程度的任意版本的 ECMAScript 的实现。
* **ECMAScript 5 (ES5)**：ECMAScript 的第五版修订，于 2009 年完成标准化。这个规范在所有现代浏览器中都相当完全的实现了。
* **ECMAScript 6 (ES6) / ECMAScript 2015 (ES2015)**：ECMAScript 的第六版修订，于 2015 年完成标准化。这个标准被部分实现于大部分现代浏览器。可以查阅[这张兼容性表](http://kangax.github.io/compat-table/es6/)来查看不同浏览器和工具的实现情况。
* **ECMAScript 2016**：预计的第七版 ECMAScript 修订，计划于明年夏季发布。这份规范具体将包含哪些特性还没有最终确定
* **ECMAScript Proposals**：被考虑加入未来版本 ECMAScript 标准的特性与语法提案，他们需要经历五个阶段：Strawman（稻草人），Proposal（提议），Draft（草案），Candidate（候选）以及 Finished （完成）。

In this entire Blog, I will call the current ECMAScript version of ES6 (because this is most accustomed to most developers), and the specifications of next year are In the process of standardization), and the future language concepts that have not yet become ECMAScript or draft are called ECMAScript proposals or JavaScript proposals. I will use this article on any occasion that may cause confusion.

#### Some resources

  

* TC39's [github warehouse] (https://github.com/tc39/ecma262) can be seen
* If you are not familiar with ES6, Babel has a [very good feature overview] (https://babeljs.io/docs/learn-es2015/)
* If you want to go deep into ES6, there are two very good books here: [Exploring ES6] (http://exploringjs.com/) and nicholas zakas [understanding ecmascript 6] (https: // leanpub. COM /underStandings6). Axel's blog [2ality] (http://www.2ality.com/) is also a very good ES6 resource

<img class="shadow" width="320" src="/img/in-post/post-js-version/keep-calm-and-learn-javascript.png" />
<small class="img-hint">来学 JavaScript 吧！</small>

#### 著作权声明

This article is translated from [ES5, ES6, ES2016, ES.NEXT: What's Going On with Javascript Versioning?] s-going -ON-WITH-JAVASCRIPT-Versioning/)
Translator [Huang Xuan] (http://weibo.com/huxpro), published for the first time in [Ishan Blog] (http://huangxuan.me), please retain the above links for reprinting, please retain the above links.

