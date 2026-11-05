---
layout: susun
permalink: /
title: ""
excerpt: "Kuo Li — systems and LLM inference engineering."
author_profile: false
redirect_from:
  - /about/
  - /about.html
---

<header class="susun-hero">
  <p class="susun-eyebrow"><span></span> SYSTEMS · LLM INFERENCE · MLSYS</p>
  <h1>Building systems for <span class="susun-mark">intelligent models</span>.</h1>
  <p class="susun-byline">
    I'm <strong>Kuo Li</strong> — an incoming Ph.D. student at Tsinghua University,
    working across inference systems, GPU kernels, deep-learning compilers, and
    the infrastructure behind agent systems.
    <a href="{{ '/profile/' | relative_url }}">More about me.</a>
  </p>
  <div class="susun-hero-actions">
    <a class="susun-button" href="{{ '/research/' | relative_url }}">Research directions <span aria-hidden="true">↗</span></a>
  </div>
</header>

<section class="susun-section" aria-labelledby="news-title">
  <div class="susun-section-head">
    <h2 id="news-title">News</h2>
    <span>Updated Oct 2026</span>
  </div>
  <div class="susun-now-list">
    <div>
      <time class="susun-mono" datetime="2026-10">Oct 2026</time>
      <p>Joined <a href="https://approaching-ai.com/" target="_blank" rel="noopener noreferrer">Approaching.AI</a> as an LLM inference engine development intern.</p>
    </div>
    <div>
      <time class="susun-mono" datetime="2026-09">Sep 2026</time>
      <p>Became an incoming Ph.D. student in the <a href="https://madsys.cs.tsinghua.edu.cn/" target="_blank" rel="noopener noreferrer">MADSys</a> group at Tsinghua University, advised by Prof. <a href="https://madsys.cs.tsinghua.edu.cn/author/mingxing-zhang/" target="_blank" rel="noopener noreferrer">Mingxing Zhang</a> and Prof. <a href="https://madsys.cs.tsinghua.edu.cn/author/yongwei-wu/" target="_blank" rel="noopener noreferrer">Yongwei Wu</a>.</p>
    </div>
  </div>
</section>

<section class="susun-section" aria-labelledby="directions-title">
  <div class="susun-section-head">
    <h2 id="directions-title">Research directions</h2>
    <span>Four connected tracks</span>
  </div>
  <ol class="susun-numbered">
    <li>
      <a href="{{ '/research/#research-systems' | relative_url }}">
        <span class="susun-number">01</span>
        <span><strong>LLM training &amp; inference systems</strong><small>Parallelism, serving schedulers, KV cache, fault tolerance, and communication–computation overlap.</small></span>
        <span class="susun-arrow" aria-hidden="true">↗</span>
      </a>
    </li>
    <li>
      <a href="{{ '/research/#research-compilers' | relative_url }}">
        <span class="susun-number">02</span>
        <span><strong>Kernels &amp; deep-learning compilers</strong><small>High-performance CUDA, Triton, TileLang, operator fusion, and code generation.</small></span>
        <span class="susun-arrow" aria-hidden="true">↗</span>
      </a>
    </li>
    <li>
      <a href="{{ '/research/#research-efficiency' | relative_url }}">
        <span class="susun-number">03</span>
        <span><strong>Efficient AI</strong><small>Sparse attention and computation patterns that make long-context models practical.</small></span>
        <span class="susun-arrow" aria-hidden="true">↗</span>
      </a>
    </li>
    <li>
      <a href="{{ '/research/#research-agents' | relative_url }}">
        <span class="susun-number">04</span>
        <span><strong>Agent OS &amp; infrastructure</strong><small>Self-evolving skills, agent harnesses, tool orchestration, and portable runtimes.</small></span>
        <span class="susun-arrow" aria-hidden="true">↗</span>
      </a>
    </li>
  </ol>
</section>

<section class="susun-section" aria-labelledby="writing-title">
  <div class="susun-section-head">
    <h2 id="writing-title">Writing</h2>
    <a href="{{ '/blog/' | relative_url }}">All posts ↗</a>
  </div>
  {% assign writing_posts = site.posts %}
  {% if writing_posts.size > 0 %}
  <div class="susun-archive-list">
    {% for post in writing_posts limit: 5 %}
    {% if post.description %}{% assign post_summary = post.description %}{% else %}{% assign post_summary = post.excerpt | strip_html | normalize_whitespace %}{% endif %}
    <a href="{{ post.url | relative_url }}">
      <time class="susun-date" datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: '%b %d' }}</time>
      <span class="susun-archive-copy"><strong>{{ post.title | escape }}</strong><small>{{ post_summary | truncate: 160 | escape }}</small></span>
      <span class="susun-arrow" aria-hidden="true">→</span>
    </a>
    {% endfor %}
  </div>
  {% else %}
  <p class="susun-writing-empty">Notes on systems and life are coming soon. <a href="{{ '/blog/' | relative_url }}">Visit the journal</a>.</p>
  {% endif %}
</section>

<section class="susun-section" aria-labelledby="dossiers-title">
  <div class="susun-section-head">
    <h2 id="dossiers-title">Archive</h2>
    <span>Selected coordinates</span>
  </div>
  <div class="susun-archive-list">
    {% for entry in site.data.archive %}
    <a href="{{ entry.url | relative_url }}">
      <span class="susun-date">{{ entry.number }}</span>
      <span class="susun-archive-copy">
        <strong>{{ entry.title | escape }}</strong>
        <small>{{ entry.detail | escape }}</small>
      </span>
      <span class="susun-arrow" aria-hidden="true">→</span>
    </a>
    {% endfor %}
  </div>
</section>

<section class="susun-section susun-signal" aria-labelledby="contact-title">
  <div>
    <p class="susun-eyebrow"><span></span> OPEN CHANNEL</p>
    <h2 id="contact-title">Let's talk systems.</h2>
    <p>Interested in inference infrastructure, kernel generation, or agent runtimes? Send a note.</p>
  </div>
  <div class="susun-contact-links">
    <a href="mailto:{{ site.author.email }}">{{ site.author.email }} <span aria-hidden="true">↗</span></a>
    <a href="mailto:{{ site.author.email_secondary }}">{{ site.author.email_secondary }} <span aria-hidden="true">↗</span></a>
  </div>
</section>
