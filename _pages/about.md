---
permalink: /
title: ""
excerpt: "Kuo Li is an undergraduate student at Tongji University working on MLSys and AI infrastructure."
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

<section class="academic-intro" id="about-me" aria-labelledby="intro-title">
  <p class="intro-eyebrow"><span aria-hidden="true"></span> MLSys / AI Infrastructure</p>
  <h1 id="intro-title">Machine learning,<br>from models to systems.</h1>
  <p>
    I am <span class="accent-text">Kuo Li</span>, an undergraduate student majoring in Data Science and Big Data Technology
    in the Department of Computer Science and Technology at Tongji University. My research interests lie in
    <strong>MLSys / AI Infrastructure</strong>, with a focus on LLM inference and serving, heterogeneous computing,
    distributed training, and compiler and runtime systems.
  </p>
  <p>
    I am currently conducting research on multi-request LLM serving at the Institute of Advanced Network,
    Shanghai Jiao Tong University, exploring semantic-priority scheduling and KV cache management. Previously,
    I worked on heterogeneous LLM runtimes, RISC-V edge inference optimization, and multimodal image fusion.
    I aim to turn systems research ideas into working, measurable, and reproducible prototypes.
  </p>
  <p class="intro-invitation">
    Please feel free to contact me about systems, machine learning infrastructure, or potential collaborations.
  </p>
  <div class="intro-links">
    <a class="intro-link--primary" href="{{ site.author.cv | relative_url }}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt" aria-hidden="true"></i> View CV <span aria-hidden="true">↗</span></a>
    <a href="mailto:{{ site.author.email }}"><i class="fas fa-envelope" aria-hidden="true"></i> Get in touch</a>
  </div>
</section>

<h2 class="section-heading" id="research-interests"><span class="section-number" aria-hidden="true">01</span> Research Interests</h2>

<div class="highlight-blocks">
  <article class="highlight-block floating-card" data-reveal>
    <span class="card-index" aria-hidden="true">01 / SERVING</span>
    <h3><i class="fas fa-server" aria-hidden="true"></i> LLM Inference and Serving</h3>
    <ul>
      <li><span class="primary-gradient-text">Focus:</span> Request scheduling, KV cache management and tiered storage, and Prefill–Decode coordination.</li>
      <li><span class="primary-gradient-text">Systems:</span> Fault tolerance and system–model co-design.</li>
    </ul>
  </article>

  <article class="highlight-block floating-card" data-reveal>
    <span class="card-index" aria-hidden="true">02 / SCALE</span>
    <h3><i class="fas fa-network-wired" aria-hidden="true"></i> Distributed Training and Communication</h3>
    <ul>
      <li><span class="primary-gradient-text">Parallelism:</span> Data, tensor, pipeline, and expert parallelism.</li>
      <li><span class="primary-gradient-text">Systems:</span> Communication–computation overlap, collective communication optimization, and reliable large-scale training.</li>
    </ul>
  </article>

  <article class="highlight-block floating-card" data-reveal>
    <span class="card-index" aria-hidden="true">03 / COMPUTE</span>
    <h3><i class="fas fa-microchip" aria-hidden="true"></i> GPU Kernels and Compilation</h3>
    <ul>
      <li><span class="primary-gradient-text">Focus:</span> High-performance CUDA programming, kernel fusion, megakernels, and persistent execution.</li>
      <li><span class="primary-gradient-text">Compilers:</span> Autotuning and high-performance kernel generation.</li>
    </ul>
  </article>

  <article class="highlight-block floating-card" data-reveal>
    <span class="card-index" aria-hidden="true">04 / RUNTIME</span>
    <h3><i class="fas fa-robot" aria-hidden="true"></i> Agents and Heterogeneous Infrastructure</h3>
    <ul>
      <li><span class="primary-gradient-text">Agent infrastructure:</span> Agent harness automation, tool-call orchestration, skill compilation, and runtime optimization.</li>
      <li><span class="primary-gradient-text">Heterogeneous systems:</span> Edge inference on RISC-V.</li>
    </ul>
  </article>
</div>

<h2 class="section-heading" id="news"><span class="section-number" aria-hidden="true">02</span> News</h2>

<ul class="academic-list news-list" data-reveal>
  <li><time datetime="2026-05">May 2026 — Present</time><span>Conducting research on multi-request LLM serving at the Institute of Advanced Network, Shanghai Jiao Tong University.</span></li>
  <li><time datetime="2026-05">May 2026</time><span>Contributed to heterogeneous LLM and agent harness systems at IPADS, Shanghai Jiao Tong University.</span></li>
  <li><time datetime="2026-05">May 2026</time><span>Conducted research on optimizing the RISC-V edge inference stack at the LANDS Lab, Nanjing University.</span></li>
</ul>

<h2 class="section-heading" id="education"><span class="section-number" aria-hidden="true">03</span> Education</h2>

<ul class="academic-list education-list" data-reveal>
  <li>
    <time datetime="2023">2023 — 2027 (Expected)</time>
    <strong>Tongji University · Department of Computer Science and Technology</strong>
    <span>Undergraduate, Data Science and Big Data Technology</span>
    <span class="rank-label">Major Rank: <strong>4 / 40</strong></span>
  </li>
</ul>

<h2 class="section-heading" id="research-experience"><span class="section-number" aria-hidden="true">04</span> Research Experience</h2>

<div class="experience-list">
  <article class="experience-item" data-reveal>
    <time>May 2026 — Present</time>
    <div>
      <h3>Institute of Advanced Network, Shanghai Jiao Tong University</h3>
      <p>Advisor: <a href="https://bochen.info/" target="_blank" rel="noopener noreferrer">Bo Chen</a>. Investigating the co-design of semantic-priority scheduling and KV cache management for multi-request LLM serving.</p>
    </div>
  </article>
  <article class="experience-item" data-reveal>
    <time>May 2026 — Jul. 2026</time>
    <div>
      <h3>IPADS, Shanghai Jiao Tong University</h3>
      <p>Advisor: Erhu Feng. Contributed to the continued development and performance optimization of SkVM, a heterogeneous LLM and agent harness system.</p>
    </div>
  </article>
  <article class="experience-item" data-reveal>
    <time>May 2026 — Jul. 2026</time>
    <div>
      <h3>LANDS Lab, Nanjing University</h3>
      <p>Advisor: Chengying Kuang. Optimized the edge inference stack and kernels for RISC-V platforms.</p>
    </div>
  </article>
  <article class="experience-item" data-reveal>
    <time>Sep. 2025 — Jan. 2026</time>
    <div>
      <h3>Multimodal Image Fusion Lab, Tongji University</h3>
      <p>Advisor: Wei Tang. Conducted experiments, reproduced models, and evaluated systems for multimodal image fusion.</p>
    </div>
  </article>
</div>

<h2 class="section-heading" id="publications"><span class="section-number" aria-hidden="true">05</span> Publications</h2>

<div class="paper-placeholder" data-reveal>
  <i class="fas fa-file-alt" aria-hidden="true"></i>
  <div>
    <h3>Publication updates to come.</h3>
    <p>In the meantime, explore my <a href="#projects">selected projects <span aria-hidden="true">↓</span></a>.</p>
  </div>
</div>

<h2 class="section-heading" id="projects"><span class="section-number" aria-hidden="true">06</span> Selected Projects</h2>

<div class="project-grid">
  <article class="project-card floating-card" data-reveal>
    <div class="project-card__head">
      <i class="fas fa-layer-group" aria-hidden="true"></i>
      <span>LLM SERVING</span>
    </div>
    <h3>SemServe</h3>
    <p>An online inference system prototype that co-designs semantic priority and KV cache storage precision.</p>
    <ul>
      <li>Automatic SLO-aware tuning of semantic priorities.</li>
      <li>Tiered storage across FP16, INT8, and CPU offload.</li>
    </ul>
    <div class="tag-row"><span>PyTorch</span><span>Transformers</span><span>Qwen</span></div>
  </article>

  <article class="project-card floating-card" data-reveal>
    <div class="project-card__head">
      <i class="fas fa-code-branch" aria-hidden="true"></i>
      <span>AGENT RUNTIME</span>
    </div>
    <h3>SkVM</h3>
    <p>A skill compilation and runtime system for heterogeneous LLMs and agent harnesses.</p>
    <ul>
      <li>Containerized execution for Terminal-Bench.</li>
      <li>Parallelism classification and multi-role optimization across AOT and JIT stages.</li>
    </ul>
    <div class="tag-row"><span>TypeScript</span><span>Bun</span><span>Docker</span></div>
  </article>
</div>

<h2 class="section-heading" id="honors"><span class="section-number" aria-hidden="true">07</span> Honors and Awards</h2>

<ul class="academic-list honors-list" data-reveal>
  <li><time>2025</time><span>Second Prize, Shanghai Division, China Undergraduate Mathematical Contest in Modeling</span></li>
  <li><time>2024</time><span>Outstanding Student Scholarship, Tongji University</span></li>
  <li><time>2023</time><span>Freshman Scholarship, Tongji University</span></li>
</ul>

<footer class="academic-footer">
  <div><p class="footer-title">Let's talk systems.</p><a href="mailto:{{ site.author.email }}">{{ site.author.email }} <span aria-hidden="true">↗</span></a></div>
  <div class="footer-meta"><p>Last updated: September 2026</p><a href="#about-me">Back to top <span aria-hidden="true">↑</span></a></div>
</footer>
