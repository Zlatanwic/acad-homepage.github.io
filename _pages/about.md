---
permalink: /
title: ""
description: "Kuo Li builds systems for intelligent models: LLM inference, GPU kernels, compilers, and agent infrastructure. Incoming Ph.D. student at Tsinghua University."
redirect_from:
  - /about/
  - /about.html
---

<figure class="scene stage" data-scene data-scene-src="{{ '/assets/js/scene.js' | relative_url }}" data-scene-state="fallback">
  <svg class="scene__fallback stage__fallback" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="scene-caption">
    <defs>
      <linearGradient id="cy-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f6fcff"/>
        <stop offset="100%" stop-color="#dff4fd"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="760" fill="url(#cy-sky)"/>
    <!-- Luminous Moon Disc & Wireframe Polyhedra -->
    <circle cx="945" cy="148" r="54" fill="#ffffff" opacity="0.92"/>
    <g fill="none" stroke="#3fb0f2" stroke-width="1.2" opacity="0.72">
      <polygon points="860,210 886,192 908,216 882,236"/>
      <line x1="860" y1="210" x2="908" y2="216"/>
      <line x1="886" y1="192" x2="882" y2="236"/>
    </g>
    <!-- Left Wing: Etihad Stadium Saddle Canopy & Cable-Stayed Masts -->
    <g stroke="#245da8" stroke-width="1.3" fill="none">
      <ellipse cx="330" cy="430" rx="220" ry="74" fill="#bcebf7" stroke="#3fb0f2"/>
      <ellipse cx="330" cy="430" rx="128" ry="42" fill="#6cabdd" stroke="#245da8"/>
      <ellipse cx="330" cy="434" rx="88" ry="26" fill="#eefbff" stroke="#ffffff"/>
      <line x1="152" y1="432" x2="152" y2="278"/>
      <line x1="232" y1="372" x2="232" y2="246"/>
      <line x1="330" y1="356" x2="330" y2="262"/>
      <line x1="428" y1="372" x2="428" y2="246"/>
      <line x1="508" y1="432" x2="508" y2="278"/>
      <!-- Fanning Stay-Cables -->
      <path d="M152 278 L208 416 M152 278 L112 448 M232 246 L278 392 M232 246 L186 402 M330 262 L330 388 M428 246 L382 392 M428 246 L474 402 M508 278 L452 416 M508 278 L548 448" stroke="#3fb0f2" stroke-width="1"/>
    </g>
    <!-- Right-Center: Fluted Blue Moon Spire, Turntable Truss & 1% Crimson Pendulum -->
    <g stroke="#245da8" stroke-width="1.3">
      <polygon points="736,156 792,156 806,448 722,448" fill="#bcebf7"/>
      <polygon points="764,156 792,156 806,448 764,448" fill="#6cabdd"/>
      <circle cx="764" cy="112" r="34" fill="#6cabdd"/>
      <ellipse cx="764" cy="112" rx="64" ry="15" transform="rotate(-16 764 112)" fill="none" stroke="#0a2a78" stroke-width="2"/>
      <ellipse cx="764" cy="272" rx="112" ry="24" fill="none" stroke="#245da8" stroke-width="1.6"/>
      <!-- 1% Crimson Pendulum Focus -->
      <line x1="690" y1="282" x2="684" y2="364" stroke="#e0304e" stroke-width="2"/>
      <rect x="670" y="364" width="28" height="6" fill="#e0304e" stroke="none"/>
    </g>
    <!-- Lower Center: Monumental Axial GPU Shroud & 9-Blade Intake Fan -->
    <g transform="translate(600,608)">
      <rect x="-210" y="-96" width="420" height="176" fill="#6cabdd" stroke="#0a2a78" stroke-width="1.5"/>
      <circle cx="0" cy="-8" r="76" fill="#0a2a66" stroke="#bcebf7" stroke-width="2"/>
      <g stroke="#bcebf7" stroke-width="4" stroke-linecap="round">
        <line x1="0" y1="-8" x2="0" y2="-74"/>
        <line x1="0" y1="-8" x2="42" y2="-58"/>
        <line x1="0" y1="-8" x2="65" y2="-19"/>
        <line x1="0" y1="-8" x2="57" y2="25"/>
        <line x1="0" y1="-8" x2="22" y2="54"/>
        <line x1="0" y1="-8" x2="-22" y2="54"/>
        <line x1="0" y1="-8" x2="-57" y2="25"/>
        <line x1="0" y1="-8" x2="-65" y2="-19"/>
        <line x1="0" y1="-8" x2="-42" y2="-58"/>
      </g>
      <circle cx="0" cy="-8" r="18" fill="#bcebf7" stroke="#0a2a78" stroke-width="1.5"/>
      <circle cx="5" cy="-12" r="4" fill="#e0304e"/>
    </g>
  </svg>
  <span class="scene-label" data-scene-label="stadium" aria-hidden="true">Etihad Stadium</span>
  <span class="scene-label" data-scene-label="spire" aria-hidden="true">Blue Moon Spire</span>
  <span class="scene-label" data-scene-label="kv" aria-hidden="true">KV-Cache Village</span>
  <span class="scene-label" data-scene-label="gpu" aria-hidden="true">Axial GPU Foundry</span>
  <figcaption id="scene-caption" class="visually-hidden">Paper-plane cyanotype 3D architecture uniting Manchester City's cable-stayed Etihad Stadium, a fluted Blue Moon spire with a Britpop turntable pendulum, a Tsinghua triple-arch gatehouse and KV-cache village, and a monumental axial GPU fan opening into a heatsink canyon and glowing silicon die.</figcaption>
</figure>

<!-- Act I: Unobstructed Architectural Panorama -->
<section class="hero-stage" id="hero" aria-label="Architectural stage">
  <div class="hero-stage__hud">
    <p class="hero-stage__tag">
      <span class="hero-stage__dot" aria-hidden="true"></span>
      <span data-en>MLSYS · LLM INFERENCE · GPU KERNELS · AGENT INFRA</span>
      <span data-zh lang="zh-CN">机器学习系统 · 大模型推理 · GPU 算子编译 · 智能体底座</span>
    </p>
    <p class="hero-stage__sub">
      <span data-en>Etihad Stay-Cables × Blue Moon Spire × Axial GPU Foundry</span>
      <span data-zh lang="zh-CN">伊蒂哈德斜拉索 × 蓝月观测塔 × 轴流显卡机芯</span>
    </p>
  </div>
  <a class="scroll-cue" id="cue" href="#desk">
    <span data-en>Scroll to fly in</span>
    <span data-zh lang="zh-CN">向下滚动 · 飞入桌面与显卡机芯</span>
    <b aria-hidden="true">▾</b>
  </a>
</section>

<!-- Acts II & III: Staggered Two-Lane Aqua Workstation Desk -->
<div class="desk" id="desk">
  <div class="desk__lane desk__lane--left">
    <!-- Left 1: About / Identity -->
    <section class="win win--about" id="win-about" aria-labelledby="hero-title">
      <header class="win__bar">
        <span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="win__title">
          <span data-en>01 // ABOUT</span>
          <span data-zh class="win__title-cn" lang="zh-CN">01 // 关于我</span>
        </span>
        <span class="win__code">SYS.ID</span>
      </header>
      <div class="win__body">
        <div class="about-head">
          <h1 id="hero-title" class="about-head__name">
            Kuo Li <span class="about-head__cn" lang="zh-CN">李阔</span>
          </h1>
          <p class="about-head__role">
            <span data-en>Incoming Ph.D. @ <a href="https://madsys.cs.tsinghua.edu.cn/" target="_blank" rel="noopener noreferrer">Tsinghua MADSys</a> ('27) · CS @ Tongji</span>
            <span data-zh lang="zh-CN"><a href="https://madsys.cs.tsinghua.edu.cn/" target="_blank" rel="noopener noreferrer">清华大学计算机系 MADSys</a> 2027 级直博生 · 同济大学本科</span>
          </p>
        </div>
        <p class="win__lede">
          <span data-en>I build the systems that <em>intelligent models</em> run on — working across LLM serving &amp; KV-cache scheduling, high-performance CUDA/Triton/TileLang kernels, deep-learning compilers, and agent runtimes.</span>
          <span data-zh lang="zh-CN">我致力于构建驱动<em>智能模型</em>高速运转的系统底座——研究横跨大模型推理服务与 KV 缓存调度、CUDA / Triton / TileLang 高性能算子与编译器，以及智能体运行时基础设施。</span>
        </p>
        <ul class="pixel-tags" aria-label="Affiliations">
          <li>Tsinghua MADSys '27</li>
          <li>Tongji CS (4/40)</li>
          <li>Approaching.AI</li>
          <li>SJTU Research</li>
        </ul>
        <div class="key-row" role="group" aria-label="Direct links">
          <a class="pixel-key" href="mailto:{{ site.author.email }}" title="{{ site.author.email }}" aria-label="Email {{ site.author.email }}">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1.5 3.5h13v9h-13v-9Zm1.2 1.2L8 8.6l5.3-3.9" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
            <span>Tongji Mail</span>
          </a>
          {% if site.author.email_secondary %}
          <a class="pixel-key" href="mailto:{{ site.author.email_secondary }}" title="{{ site.author.email_secondary }}" aria-label="Email {{ site.author.email_secondary }}">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 4h12v8H2V4Zm1 1 5 3.6L13 5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>
            <span>Gmail</span>
          </a>
          {% endif %}
          <a class="pixel-key" href="https://github.com/{{ site.author.github }}" target="_blank" rel="noopener noreferrer" aria-label="GitHub {{ site.author.github }}">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.4a6.6 6.6 0 0 0-2.1 12.9c.3.1.4-.1.4-.3v-1.2c-1.8.4-2.2-.8-2.2-.8-.3-.7-.7-.9-.7-.9-.6-.4 0-.4 0-.4.6.1 1 .6 1 .6.6 1 1.5.7 1.9.5.1-.4.2-.7.4-.9-1.5-.2-3-.7-3-3.2 0-.7.3-1.3.7-1.8-.1-.2-.3-.8.1-1.7 0 0 .6-.2 1.8.7a6.2 6.2 0 0 1 3.4 0c1.2-.9 1.8-.7 1.8-.7.4.9.2 1.5.1 1.7.4.5.7 1.1.7 1.8 0 2.5-1.5 3-3 3.2.2.2.4.6.4 1.2v1.8c0 .2.1.4.4.3A6.6 6.6 0 0 0 8 1.4Z" fill="currentColor"/></svg>
            <span>GitHub</span>
          </a>
          <a class="pixel-key" href="{{ '/blog/feed.xml' | relative_url }}" aria-label="Atom feed">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="3.6" cy="12.4" r="1.4" fill="currentColor"/><path d="M2.2 7.8a6 6 0 0 1 6 6M2.2 3.4a10.4 10.4 0 0 1 10.4 10.4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
            <span>RSS</span>
          </a>
          <a class="pixel-key pixel-key--primary" href="{{ '/profile/' | relative_url }}">
            <span data-en>Profile ▸</span>
            <span data-zh lang="zh-CN">完整档案 ▸</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Left 2: Selected Systems -->
    <section class="win win--split" id="win-projects" aria-labelledby="win-projects-title">
      <header class="win__bar">
        <span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <h2 id="win-projects-title" class="win__title">
          <span data-en>03 // SELECTED SYSTEMS</span>
          <span data-zh class="win__title-cn" lang="zh-CN">03 // 代表系统工作</span>
        </h2>
        <span class="win__code">BUILD</span>
      </header>
      <div class="win__body win__body--split">
        <div class="win__main">
          <ul class="win-rows">
            <li>
              <a class="win-row" href="{{ '/projects/#project-semserve' | relative_url }}">
                <span class="win-row__top">
                  <strong>SemServe</strong>
                  <em>LLM Serving · KV Cache</em>
                </span>
                <span class="win-row__desc" data-en>Online serving prototype co-designing SLO-aware semantic priorities with FP16 / INT8 / CPU tiered KV storage.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">协同设计 SLO 感知语义优先级调度与 FP16 / INT8 / CPU 分级 KV 缓存的在线推理原型。</span>
              </a>
            </li>
            <li>
              <a class="win-row" href="{{ '/projects/#project-skvm' | relative_url }}">
                <span class="win-row__top">
                  <strong>SkVM</strong>
                  <em>Agent Runtime · AOT/JIT</em>
                </span>
                <span class="win-row__desc" data-en>Skill compilation &amp; containerized runtime classifying parallelism across heterogeneous LLMs and agent harnesses.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">面向异构模型与 Agent Harness 的技能 AOT/JIT 编译优化与容器化并行执行系统。</span>
              </a>
            </li>
          </ul>
          <div class="win__foot">
            <span class="win__note">
              <span data-en>Publication updates to come</span>
              <span data-zh lang="zh-CN">论文发表进展持续更新中</span>
            </span>
            <a class="win__more" href="{{ '/projects/' | relative_url }}">
              <span data-en>More ▸</span>
              <span data-zh lang="zh-CN">全部项目 ▸</span>
            </a>
          </div>
        </div>
        <div class="clippings" aria-hidden="true">
          <figure class="clip" style="--rot: 3.2deg">
            <img src="{{ '/images/clippings/fig-skvm-jit.svg' | relative_url }}" alt="" width="240" height="160" loading="lazy" decoding="async">
          </figure>
          <figure class="clip" style="--rot: -3.6deg">
            <img src="{{ '/images/clippings/fig-overlap-pipe.svg' | relative_url }}" alt="" width="240" height="160" loading="lazy" decoding="async">
          </figure>
        </div>
      </div>
    </section>

    <!-- Left 3: Writing / Notebook -->
    <section class="win" id="win-writing" aria-labelledby="win-writing-title">
      <header class="win__bar">
        <span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <h2 id="win-writing-title" class="win__title">
          <span data-en>05 // WRITING</span>
          <span data-zh class="win__title-cn" lang="zh-CN">05 // 随笔与技术笔记</span>
        </h2>
        <span class="win__code">LOG</span>
      </header>
      <div class="win__body">
        {% if site.posts.size > 0 %}
        <ul class="win-rows">
          {% for post in site.posts limit: 4 %}
          {% if post.description %}{% assign post_summary = post.description %}{% else %}{% assign post_summary = post.excerpt | strip_html | normalize_whitespace %}{% endif %}
          <li>
            <a class="win-row" href="{{ post.url | relative_url }}">
              <span class="win-row__top">
                <strong>{{ post.title | escape }}</strong>
                <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%Y-%m-%d' }}</time>
              </span>
              <span class="win-row__desc">{{ post_summary | truncate: 120 | escape }}</span>
            </a>
          </li>
          {% endfor %}
        </ul>
        {% else %}
        <div class="win-empty">
          <p class="win-empty__code">[00 // JOURNAL READY]</p>
          <p>
            <span data-en>Notes on GPU kernels, inference systems, and life away from the terminal are on the way.</span>
            <span data-zh lang="zh-CN">关于 GPU 算子、推理架构与终端之外日常的技术随笔正在整理中。</span>
          </p>
        </div>
        {% endif %}
        <div class="win__foot">
          <a class="win__note-link" href="{{ '/blog/feed.xml' | relative_url }}">Atom / RSS ↗</a>
          <a class="win__more" href="{{ '/blog/' | relative_url }}">
            <span data-en>Journal ▸</span>
            <span data-zh lang="zh-CN">进入博客 ▸</span>
          </a>
        </div>
      </div>
    </section>
  </div>

  <div class="desk__lane desk__lane--right">
    <!-- Right 1: Research Directions -->
    <section class="win win--split" id="win-research" aria-labelledby="win-research-title">
      <header class="win__bar">
        <span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <h2 id="win-research-title" class="win__title">
          <span data-en>02 // RESEARCH</span>
          <span data-zh class="win__title-cn" lang="zh-CN">02 // 研究方向</span>
        </h2>
        <span class="win__code">MLSYS</span>
      </header>
      <div class="win__body win__body--split">
        <div class="win__main">
          <ul class="win-rows">
            <li>
              <a class="win-row" href="{{ '/research/#research-systems' | relative_url }}">
                <span class="win-row__top">
                  <strong data-en>LLM Training &amp; Inference</strong>
                  <strong data-zh lang="zh-CN">大模型训练与推理系统</strong>
                  <em>01</em>
                </span>
                <span class="win-row__desc" data-en>Distributed parallelism, serving schedulers, KV cache, overlap &amp; fault tolerance.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">分布式并行策略、通信计算重叠、服务调度、KV 缓存与容错机制。</span>
              </a>
            </li>
            <li>
              <a class="win-row" href="{{ '/research/#research-compilers' | relative_url }}">
                <span class="win-row__top">
                  <strong data-en>Kernels &amp; DL Compilers</strong>
                  <strong data-zh lang="zh-CN">算子优化与深度学习编译器</strong>
                  <em>02</em>
                </span>
                <span class="win-row__desc" data-en>High-performance CUDA, Triton, TileLang, operator fusion &amp; code generation.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">高性能 CUDA 编程、Triton 与 TileLang 算子融合及代码生成。</span>
              </a>
            </li>
            <li>
              <a class="win-row" href="{{ '/research/#research-efficiency' | relative_url }}">
                <span class="win-row__top">
                  <strong data-en>Efficient AI</strong>
                  <strong data-zh lang="zh-CN">高效智能与稀疏计算</strong>
                  <em>03</em>
                </span>
                <span class="win-row__desc" data-en>Sparse attention and memory-efficient long-context execution patterns.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">长上下文稀疏注意力机制与访存友好的高效推理范式。</span>
              </a>
            </li>
            <li>
              <a class="win-row" href="{{ '/research/#research-agents' | relative_url }}">
                <span class="win-row__top">
                  <strong data-en>Agent OS &amp; Infrastructure</strong>
                  <strong data-zh lang="zh-CN">智能体系统与基础设施</strong>
                  <em>04</em>
                </span>
                <span class="win-row__desc" data-en>Self-evolving skills, agent harnesses, tool orchestration &amp; runtimes.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">自演化技能编译、Agent Harness 编排与跨模型可移植运行时。</span>
              </a>
            </li>
          </ul>
          <div class="win__foot">
            <span class="win__note">Cluster → Kernel → Agent</span>
            <a class="win__more" href="{{ '/research/' | relative_url }}">
              <span data-en>More ▸</span>
              <span data-zh lang="zh-CN">全部方向 ▸</span>
            </a>
          </div>
        </div>
        <div class="clippings" aria-hidden="true">
          <figure class="clip" style="--rot: -3.8deg">
            <img src="{{ '/images/clippings/fig-roofline.svg' | relative_url }}" alt="" width="240" height="160" loading="lazy" decoding="async">
          </figure>
          <figure class="clip" style="--rot: 3.4deg">
            <img src="{{ '/images/clippings/fig-kv-tiers.svg' | relative_url }}" alt="" width="240" height="160" loading="lazy" decoding="async">
          </figure>
          <figure class="clip" style="--rot: -2.2deg">
            <img src="{{ '/images/clippings/fig-sparse-attn.svg' | relative_url }}" alt="" width="240" height="160" loading="lazy" decoding="async">
          </figure>
        </div>
      </div>
    </section>

    <!-- Right 2: Path & Timeline -->
    <section class="win" id="win-path" aria-labelledby="win-path-title">
      <header class="win__bar">
        <span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <h2 id="win-path-title" class="win__title">
          <span data-en>04 // PATH &amp; NEWS</span>
          <span data-zh class="win__title-cn" lang="zh-CN">04 // 经历与近期动态</span>
        </h2>
        <span class="win__code">TRACE</span>
      </header>
      <div class="win__body">
        <ol class="log-list">
          <li class="log-list__item log-list__item--highlight">
            <span class="log-list__when">2027 →</span>
            <div class="log-list__body">
              <strong data-en>Ph.D., Tsinghua University (MADSys)</strong>
              <strong data-zh lang="zh-CN">清华大学计算机系直博生（MADSys）</strong>
              <p data-en>Advised by Prof. <a href="https://madsys.cs.tsinghua.edu.cn/author/yongwei-wu/" target="_blank" rel="noopener noreferrer">Yongwei Wu</a> &amp; Prof. <a href="https://madsys.cs.tsinghua.edu.cn/author/mingxing-zhang/" target="_blank" rel="noopener noreferrer">Mingxing Zhang</a>.</p>
              <p data-zh lang="zh-CN">师从 <a href="https://madsys.cs.tsinghua.edu.cn/author/yongwei-wu/" target="_blank" rel="noopener noreferrer">武永卫</a> 教授与 <a href="https://madsys.cs.tsinghua.edu.cn/author/mingxing-zhang/" target="_blank" rel="noopener noreferrer">张明星</a> 教授。</p>
            </div>
          </li>
          <li class="log-list__item">
            <span class="log-list__when">Oct 2026</span>
            <div class="log-list__body">
              <strong data-en>Inference Engine Intern · <a href="https://approaching-ai.com/" target="_blank" rel="noopener noreferrer">Approaching.AI</a></strong>
              <strong data-zh lang="zh-CN">大模型推理引擎实习 · <a href="https://approaching-ai.com/" target="_blank" rel="noopener noreferrer">Approaching.AI</a></strong>
              <p data-en>Building high-throughput LLM serving &amp; kernel execution pipelines.</p>
              <p data-zh lang="zh-CN">参与高吞吐大模型推理服务引擎与底层算子执行链路研发。</p>
            </div>
          </li>
          <li class="log-list__item">
            <span class="log-list__when">2026</span>
            <div class="log-list__body">
              <strong data-en>Research Intern · Shanghai Jiao Tong University</strong>
              <strong data-zh lang="zh-CN">科研实习 · 上海交通大学</strong>
              <p data-en>LLM serving &amp; KV cache with <a href="https://bochen.info/" target="_blank" rel="noopener noreferrer">Bo Chen</a>; SkVM agent runtime at IPADS.</p>
              <p data-zh lang="zh-CN">与 <a href="https://bochen.info/" target="_blank" rel="noopener noreferrer">陈博</a> 老师合作多请求推理调度；参与 IPADS 实验室 SkVM 优化。</p>
            </div>
          </li>
          <li class="log-list__item">
            <span class="log-list__when">2023–27</span>
            <div class="log-list__body">
              <strong data-en>Tongji University · Dept. of Computer Science</strong>
              <strong data-zh lang="zh-CN">同济大学 · 计算机科学与技术系</strong>
              <p data-en>B.Eng. in Data Science &amp; Big Data Technology · Major rank <strong>4 / 40</strong>.</p>
              <p data-zh lang="zh-CN">数据科学与大数据技术本科 · 专业排名 <strong>4 / 40</strong>。</p>
            </div>
          </li>
        </ol>
        <div class="win__foot">
          <span class="win__note">Shanghai → Beijing</span>
          <a class="win__more" href="{{ '/education/' | relative_url }}">
            <span data-en>Full path ▸</span>
            <span data-zh lang="zh-CN">完整履历 ▸</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Right 3: Off the Clock -->
    <section class="win win--split win--media-left" id="win-interests" aria-labelledby="win-interests-title">
      <header class="win__bar">
        <span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <h2 id="win-interests-title" class="win__title">
          <span data-en>06 // OFF THE CLOCK</span>
          <span data-zh class="win__title-cn" lang="zh-CN">06 // 球场 · 旷野 · 唱片</span>
        </h2>
        <span class="win__code">LIFE</span>
      </header>
      <div class="win__body win__body--split">
        <div class="clippings clippings--photo" aria-hidden="true">
          <figure class="clip clip--photo" style="--rot: -4.2deg">
            <img src="{{ '/images/interests/football/haaland.jpg' | relative_url }}" alt="" width="517" height="690" loading="lazy" decoding="async">
          </figure>
          <figure class="clip clip--photo" style="--rot: 3.6deg">
            <img src="{{ '/images/interests/games/arthur-morgan.jpg' | relative_url }}" alt="" width="1080" height="1080" loading="lazy" decoding="async">
          </figure>
          <figure class="clip clip--photo" style="--rot: -2.1deg">
            <img src="{{ '/images/interests/albums/oasis.jpg' | relative_url }}" alt="" width="499" height="500" loading="lazy" decoding="async">
          </figure>
        </div>
        <div class="win__main">
          <ul class="win-rows">
            <li>
              <a class="win-row" href="{{ '/interests/#football-heading' | relative_url }}">
                <span class="win-row__top">
                  <strong data-en>Manchester City · Etihad</strong>
                  <strong data-zh lang="zh-CN">曼彻斯特城 · 伊蒂哈德</strong>
                  <em>MCFC</em>
                </span>
                <span class="win-row__desc" data-en>Blue Moon, cable-stayed masts, De Bruyne through-balls &amp; Rodri screamers.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">蓝月当空、十二根斜拉桅杆，以及德布劳内的直塞与罗德里的远射。</span>
              </a>
            </li>
            <li>
              <a class="win-row" href="{{ '/interests/#games-heading' | relative_url }}">
                <span class="win-row__top">
                  <strong data-en>AAA Open Worlds</strong>
                  <strong data-zh lang="zh-CN">3A 叙事与开放世界</strong>
                  <em>PLAY</em>
                </span>
                <span class="win-row__desc" data-en>Red Dead Redemption 2, Cyberpunk 2077, Resident Evil &amp; Hitman.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">荒野大镖客 2、赛博朋克 2077、生化危机与杀手系列。</span>
              </a>
            </li>
            <li>
              <a class="win-row" href="{{ '/interests/#music-heading' | relative_url }}">
                <span class="win-row__top">
                  <strong data-en>Britpop &amp; Rock Records</strong>
                  <strong data-zh lang="zh-CN">英伦摇滚与黑胶唱片</strong>
                  <em>33 RPM</em>
                </span>
                <span class="win-row__desc" data-en>Oasis, Blur, Suede, Stereophonics, Queen &amp; Guns N’ Roses on repeat.</span>
                <span class="win-row__desc" data-zh lang="zh-CN">Oasis、Blur、Suede、Stereophonics、Queen 与枪花循环播放。</span>
              </a>
            </li>
          </ul>
          <div class="win__foot">
            <span class="win__note">Come on, City!</span>
            <a class="win__more" href="{{ '/interests/' | relative_url }}">
              <span data-en>The shelf ▸</span>
              <span data-zh lang="zh-CN">兴趣陈列室 ▸</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>

<!-- Act IV: Phase-Locked GPU Fan Passage & Heatsink / Silicon Die Sanctuary -->
<section class="sanctuary" id="sanctuary" aria-label="Axial GPU interior flythrough">
  <div class="sanctuary__hud">
    <p class="sanctuary__caption">
      <span data-en>SM / TENSOR CORE DIE · HBM3e STACKS · PHASE-LOCKED AXIAL INTAKE</span>
      <span data-zh lang="zh-CN">SM / 张量计算裸片 · HBM3e 显存阵列 · 相位锁定涡轮风道</span>
    </p>
    <a class="back-top" id="back-top" href="#top">
      <span aria-hidden="true">↑</span>
      <span data-en>Top</span>
      <span data-zh lang="zh-CN">回到顶部</span>
    </a>
  </div>
</section>
