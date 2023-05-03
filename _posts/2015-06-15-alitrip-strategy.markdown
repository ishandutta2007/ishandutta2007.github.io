---
layout:     post
title:      "聊聊「阿里旅行 · 去啊」"
subtitle:   "聊聊在线旅行行业与老东家的产品思路"
date:       2015-06-15
author:     "Ishan"
header-img: "img/post-bg-alitrip.jpg"
catalog: true
tags:
    - 产品
    - 阿里
---

## 前言

近几年，互联网产品从线上斗到了线下，互联网行业和传统行业的跨界融合屡见不鲜，“渗透传统行业”几乎成为了全行业下一轮创新的标配，新词“互联网+”也应运而生：

> 将互联网行业的生产要素，深度融入经济、社会等各个领域，尝试改变一些传统的实体经济行业，创造出新的产品形态、商业模式和生态

O2O 领域已经有了非常多成功的案例：从最早的千团大战，到前年打车大战，再到餐饮 O2O……传统行业被撬动的同时，无数新的市场也在被发掘：

* 金融： 蚂蚁金服、芝麻信用、京东白条
* 通信： 微信电话本，阿里通信
* 交通： 打车、租车、专车
* 地产： 二手房、租房
* 医疗、家电、教育、票务……

当然，还有我们的在线旅游行业，BAT 纷纷入局，盛况空前。


## 正文

历史总是现在与未来的明鉴，**垂直领域互联网产品**更是与行业的历史紧密相连。想要用互联网产品解决传统行业的问题，就得先了解这个行业的发展规律，看看这个行业都经历过怎样的变革。

### 传统老大：旅行社

旅行社，一个耳熟能详的名字。在互联网的变革到来之前，旅游行业几乎就是旅行社的天下。

在行业术语里，旅行社被称为 **TA：Travel Agency —— 旅游代理**。
旅行社为你提供旅游信息，代理你办航班，定酒店，买门票，办签证，找导游。通过代理你的旅游消费行为，TA 从中获利。

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.013.jpg)

### 第一轮革命：兴起的电商与 OTA

1995 年，中国互联网沸腾元年，北京上海接入 Internet 节点。
1998 年，中国互联网电商元年，第一笔在线交易产生。
1999 年，马云的阿里巴巴创办。同年，旅游行业未来的两大巨头，**携程**、**艺龙** 双双出世。

携程、艺龙利用互联网的体验优势，迅速占领了 TA 的市场，它们被称作 **OTA：Online Travel Agency**

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.014.jpg)

在他们诞生之初，其实都叫 XX旅行网。那为什么不说他们是做网站的，而说他们是做 TA 的呢？

这叫要引出本文涉及的第一个常见商业模式：

#### Agency 模式

Agency，即**代理模式**。通过代理用户的消费行为，代理商就可以靠佣金的方式从中获利。
举个例子：假设携程旅行网今天给某某酒店拉来了 100 个日间，那么这个酒店就要以 30元/日间 的方式给携程旅行网反多少的红利。

**佣金，说白了，就是中介费。**

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.016.jpg)

了解了 Agency 模式，我们再回过来看携程、艺龙：
虽然渠道改成了互联网，但其商业模式还是 TA 的那套玩法，它们其实是在和传统 TA 分同一块蛋糕。
还是咨询、酒店、机票、旅游团、旅游套餐，只是**你们在线下玩，我去线上玩了**，我有渠道优势。

### 第二轮革命：比价搜索与去哪儿

时光飞驰到 2005 年，单纯做线下已经满足不了很多传统 TA 们了，大家纷纷向携程、艺龙学习，进攻线上，转型 OTA 。

就在这样的格局下，**去哪儿** 横空出世，一下占据了半壁江山：

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.021.jpg)

去哪儿做了一件什么事呢，它把这些 OTA 的数据全都爬过来，做了一个**比价平台**。这样，用户就可以在去哪儿的网站上看看哪家 OTA 更便宜，然后用户就去消费哪家的服务。

所谓“比价平台”，本质上说，就是 **Search Engine —— 搜索引擎**。

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.018.jpg)

这个这个玩法一下就厉害了：
**去哪儿挡在了用户和所有 OTA 之间，OTA 还是做原来的事情，而去哪儿则拿下了用户找 OTA 的过程**。同是搜索引擎的百度也是如此：百度自己并不生产内容，而是拿下了用户找内容的过程。

That's why search engine awesome：因为用户在互联网的信息海洋上找信息太难了，所以用户必须要靠搜索引擎来解决这个痛点，而搜索引擎自己也就成为了渠道：

#### Channel 模式

Channel，即**渠道模式**。通过优化用户的体验路径，在用户和 B 方之前挡了一道，主要对 B 盈利。
最常见的对 B 盈利方式就是广告：**Pay For Performance**

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.019.jpg)

简单看一眼携程和去哪儿的收入占比就可以发现：

* 携程主要靠来自酒店、机票的佣金盈利
* 去哪儿则主要靠 PFP 广告盈利

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.020.jpg)

通过去哪儿的比价平台，小 OTA 开始有机会通过价格战和大 OTA 周旋。去哪儿在给予了小 OTA 机会的同时也造就了自己，这和 2003 年淘宝 C2C 的崛起，颇有异曲同工之意。


### 第 2.5 轮革命：尴尬的淘宝旅行

为什么说淘宝旅行是 2.5 次革命呢，因为它想革，但没革上。
为什么没有革上呢？

**首先是切入时机太晚**

阿里其实 2010 年就开始做淘宝旅行了，一直划分在淘宝网下，由那时的淘宝北研（淘宝 UED 北京研发）团队负责，这个团队吸纳了大批雅虎中国的精英，技术水平相当高。
可是 2010 年才切入这个市场实在是太晚了，携程、去哪儿的口碑和用户习惯早都养成好几年了，没人会去你淘宝上搜航班酒店，你有大入口也没有用。

**二是资源倾斜不足**

2010 年还没有什么 **互联网+** 的概念，结合传统行业也还没有现在这么热，淘宝做旅游这事用了多大力气推很难说，反正我是没听过。
阿里同年的发展重心还是在其电商体系的完善上：**淘宝商城** 启用独立域名，其 B2C 的模式刚好弥补了淘宝 C2C 的问题，这货就是后来的**天猫**，我们可以比较一下两者在资源倾斜上的差异：


 BU | 2008 | 2010 | 2011 | 2012 | 2013 | 2014 | 2015
---- | ------------- | ------------
天猫 | 淘宝商城  | 独立域名 | 分拆 | 更名天猫<br>天猫事业部（1/7）|
去啊 |  | 淘宝旅行 |  | | 航旅事业部（1/25）| 分拆<br>更名去啊 | 独立域名

**三是思路问题**

淘宝旅行想怎么玩呢，它实际上就是想用淘宝/天猫的思路去做在线旅行，其实背后还是淘宝卖家和天猫卖家，只不过这次的商户换成 OTA 入驻了，然后大家开开心心像卖衣服一样去卖旅行产品。


![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.023.jpg)

听上去很美，不但利用了阿里系的大量资源，还直接复刻了淘宝/天猫的牛逼模式 —— 平台模式

#### Platform 模式

Platform，即**平台模式**，可以说是当今最叼的商业模式了，它相当于构建了一个完整的生态、市场环境，在这里整合买卖双方的资源。通过维护市场秩序、制定市场规则，让市场活跃，从而**赚取场子费**。

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.026.jpg)

想想看，每一笔交易都在你的地盘上发生，只要市场一直活跃，你就可以在其中**双边、多边盈利**Essence What bidding ranking, advertising platform, VIP privilege, the profit model is too rich

The dream was done and returned to Taobao. Being a platform is the dream of each product, it must be right. So where is the question?

**太不垂直了！** The tourism industry requires credibility: Wherever you go, it is Class B merchant (OTA, brand chain hotel, direct sales, etc.), which fundamentally guarantees the product experience. Taobao travel products are full of small sellers such as small travel agencies and individuals, which seriously affects the purchase experience. Can you imagine that a hotel finds the seller of the following dozen or twenty pages. After selecting the seller, you have to pull it with someone for half an hour on Wangwang? The cheap price, as the sole advantage, is at the cost of serious sacrifice product purchase experience, which is extremely worthwhile. What's more, most of the audiences of tourism products are still people with strong consumption power, and they value merchants/product quality rather than prices.

### 第三轮革命：Now

OK，经过这么一番折腾，第三次变革就来了。
BAT 纷纷介入，行业进入了传说中的 BATX 格局：

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.028.jpg)

Ali has recently moved frequently, pushing it, not to mention it, it is also the purchase of offline hotel software stone bases. In conjunction with the Ant Financial service period, sesame credit has carried out "hotel credit residence"
Where is Baidu invested early, the two search engines starting with each other. At the same time, Baidu also quietly released a water test product like Baidu Travel
Tencent's investment in Yilong, Tongcheng.com, etc., also trying QQ tourism and other products

Update: However, around 2015.5, Ctrip announced the acquisition of Yilong, a very dramatic situation ...

Why do you intervene?
The first is that the Internet combines the tide of traditional industries. Everyone finds that the tourism industry is a gold mine. The market is actually very large ...
Second, there are indeed many business models that can be broken in this area. Many segments have begun to start with startups. The ecology of the entire industry is becoming more and more abundant:

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.029.jpg)

At this time, local tyrant companies like BAT want to come in to collect the net -have to smash a platform!
Therefore, this round of games will definitely see a large reshuffle (Yilong is killed in the first one)

那么，这轮革命怎么演变呢？

**一是模式融合**，以前做 OTA 的做 
OTA, do channels to do channels, try to be platforms on platforms. Now, everyone knows that the platform model may be a better form, and one after another has begun to evolve.

* Do all of OTA, win all kinds of Niubi direct business, the most typical is flight
* Both are platforms, especially the relatively high -quality B2C platform. Then try the possible C2C product form (to go to the inn, a good attempt)

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.030.jpg)

**二是思路进化**

* 从单一的购买/渠道业务转向服务平台。融合周边服务，拉上细分领域，外围行业一起玩
* 强调用户体验与用户留存，强调**一站式服务**、**个性化服务** 等更极致的产品形态

![img](/img/in-post/post-alitrip-pd/post-alitrip-pd.031.jpg)
And these evolutions are exactly what the Ali travels and go. Starting from the large version of 5.0, Taobao Travel will have ** wash your mind ** to pursue a more extreme, more vertical, and experience better product form.

Let's witness the growth of the way, and the change in the online tourism industry!

---

*本篇完。*



> 本文作者系前「阿里旅行 · 去啊」前端实习生，本文系业余时间学习之作。
> 如有任何知识产权、版权问题或理论错误，还请指正。
> 转载请注明原作者及以上信息。
