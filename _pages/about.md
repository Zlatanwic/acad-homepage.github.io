---
permalink: /
title: ""
excerpt: "李阔，同济大学本科生，研究方向为 MLSys 与 AI Infrastructure。"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

<span class="anchor" id="about-me"></span>

<section class="hero-panel" aria-labelledby="hero-title" data-reveal>
  <div class="hero-panel__copy">
    <p class="hero-eyebrow"><span></span> Undergraduate Researcher · Tongji University</p>
    <h1 id="hero-title">让大模型系统更高效、可扩展，也更贴近真实工作负载。</h1>
    <p class="hero-lead">
      我是李阔，同济大学计算机科学与技术系数据科学与大数据技术专业本科生。
      我的研究聚焦 <strong>MLSys / AI Infrastructure</strong>，覆盖高性能算子、编译运行时、
      分布式训练与在线推理服务。
    </p>
    <p class="hero-current">
      目前在上海交通大学先进网络研究所开展面向多请求 LLM Serving 的语义优先级调度与
      KV Cache 存储管理研究，并持续参与异构 LLM 与 Agent Harness 系统开发。
    </p>
    <div class="hero-actions">
      <a class="home-btn home-btn--primary" href="{{ '/files/Li_Kuo_CV.pdf' | relative_url }}" target="_blank" rel="noopener">
        <i class="fas fa-file-pdf" aria-hidden="true"></i> 下载简历
      </a>
      <a class="home-btn home-btn--ghost" href="https://github.com/Zlatanwic" target="_blank" rel="noopener">
        <i class="fab fa-github" aria-hidden="true"></i> GitHub
      </a>
      <a class="home-btn home-btn--ghost" href="mailto:2353113@tongji.edu.cn">
        <i class="fas fa-envelope" aria-hidden="true"></i> 联系我
      </a>
    </div>
  </div>
  <div class="hero-panel__stats" aria-label="教育概览">
    <div class="hero-stat">
      <strong>4.56</strong>
      <span>GPA / 5.0</span>
    </div>
    <div class="hero-stat">
      <strong>2 / 40</strong>
      <span>专业排名</span>
    </div>
    <div class="hero-stat">
      <strong>2027</strong>
      <span>预计毕业</span>
    </div>
  </div>
</section>

<span class="anchor" id="research-interests"></span>

<section class="home-section" aria-labelledby="research-title">
  <header class="section-header" data-reveal>
    <p class="section-kicker">Research Focus</p>
    <h2 id="research-title">研究兴趣</h2>
    <p>从底层算子到在线服务，关注系统各层之间真正影响吞吐、时延与可靠性的协同设计。</p>
  </header>

  <div class="interest-grid">
    <article class="interest-card" data-reveal>
      <div class="card-icon"><i class="fas fa-server" aria-hidden="true"></i></div>
      <p class="card-index">01</p>
      <h3>大模型推理与服务</h3>
      <p>请求调度、KV Cache 管理与分层存储、Prefill–Decode 协同、故障容错及系统—模型协同设计。</p>
      <div class="tag-list"><span>LLM Serving</span><span>KV Cache</span><span>SLO</span></div>
    </article>

    <article class="interest-card" data-reveal>
      <div class="card-icon"><i class="fas fa-network-wired" aria-hidden="true"></i></div>
      <p class="card-index">02</p>
      <h3>分布式训练与通信</h3>
      <p>数据、张量、流水线和专家并行，以及通信计算重叠、集合通信优化和大规模训练可靠性。</p>
      <div class="tag-list"><span>Parallelism</span><span>NCCL</span><span>RDMA</span></div>
    </article>

    <article class="interest-card" data-reveal>
      <div class="card-icon"><i class="fas fa-microchip" aria-hidden="true"></i></div>
      <p class="card-index">03</p>
      <h3>GPU 算子与编译</h3>
      <p>CUDA 高性能编程、算子融合、Megakernel、持久化执行、自动调优与高性能算子生成。</p>
      <div class="tag-list"><span>CUDA</span><span>Triton</span><span>TileLang</span></div>
    </article>

    <article class="interest-card" data-reveal>
      <div class="card-icon"><i class="fas fa-robot" aria-hidden="true"></i></div>
      <p class="card-index">04</p>
      <h3>Agent 与异构基础设施</h3>
      <p>Agent Harness 自动化、工具调用编排、技能编译与运行时优化，以及面向 RISC-V 的端侧推理。</p>
      <div class="tag-list"><span>Agent Harness</span><span>Runtime</span><span>RISC-V</span></div>
    </article>
  </div>
</section>

<span class="anchor" id="education"></span>

<section class="home-section home-section--compact" aria-labelledby="education-title">
  <header class="section-header" data-reveal>
    <p class="section-kicker">Education</p>
    <h2 id="education-title">教育背景</h2>
  </header>

  <article class="education-card" data-reveal>
    <div class="education-mark" aria-hidden="true">TJ</div>
    <div class="education-main">
      <div class="education-heading">
        <div>
          <h3>同济大学 · 计算机科学与技术系</h3>
          <p>数据科学与大数据技术（本科）</p>
        </div>
        <span class="date-badge">2023 — 2027（预计）</span>
      </div>
      <div class="education-metrics">
        <div><strong>90.51 / 100</strong><span>加权成绩</span></div>
        <div><strong>2 / 40</strong><span>专业排名</span></div>
        <div><strong>IELTS 7.0</strong><span>CET-6 571</span></div>
      </div>
    </div>
  </article>
</section>

<span class="anchor" id="research-experience"></span>

<section class="home-section" aria-labelledby="experience-title">
  <header class="section-header" data-reveal>
    <p class="section-kicker">Research Experience</p>
    <h2 id="experience-title">科研经历</h2>
    <p>围绕 LLM 系统、异构运行时与端侧推理，在不同研究环境中持续推进可落地的系统问题。</p>
  </header>

  <div class="research-timeline">
    <article class="timeline-item" data-reveal>
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-card">
        <div class="timeline-heading">
          <div><p class="timeline-date">2026.05 — 至今</p><h3>上海交通大学先进网络研究所</h3></div>
          <span class="timeline-status">进行中</span>
        </div>
        <p class="timeline-meta"><i class="fas fa-user-graduate" aria-hidden="true"></i> 指导教师：陈博</p>
        <p>面向多请求 LLM Serving 场景，研究语义优先级调度与 KV Cache 存储管理的协同设计。</p>
      </div>
    </article>

    <article class="timeline-item" data-reveal>
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-card">
        <div class="timeline-heading">
          <div><p class="timeline-date">2026.05 — 2026.07</p><h3>上海交通大学 IPADS 实验室</h3></div>
        </div>
        <p class="timeline-meta"><i class="fas fa-user-graduate" aria-hidden="true"></i> 指导教师：冯二虎</p>
        <p>参与 SkVM 异构 LLM 与 Agent Harness 系统的后续扩展，优化系统效果与性能。</p>
      </div>
    </article>

    <article class="timeline-item" data-reveal>
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-card">
        <div class="timeline-heading">
          <div><p class="timeline-date">2026.05 — 2026.07</p><h3>南京大学 LANDS 实验室</h3></div>
        </div>
        <p class="timeline-meta"><i class="fas fa-user-graduate" aria-hidden="true"></i> 指导教师：匡成颖</p>
        <p>基于 MNN 开展 RISC-V 端侧推理链路优化；相关论文正在撰写，计划投稿 HPCA 2027。</p>
      </div>
    </article>

    <article class="timeline-item" data-reveal>
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-card">
        <div class="timeline-heading">
          <div><p class="timeline-date">2026.02 — 2026.04</p><h3>独立研究经历</h3></div>
          <span class="timeline-status timeline-status--accent">Oral</span>
        </div>
        <p>以独立作者身份投稿 ICIC 2026 并被接收为 Oral Presentation；目前继续扩展与优化该工作。</p>
      </div>
    </article>

    <article class="timeline-item" data-reveal>
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-card">
        <div class="timeline-heading">
          <div><p class="timeline-date">2025.09 — 2026.01</p><h3>同济大学图像融合实验室</h3></div>
        </div>
        <p class="timeline-meta"><i class="fas fa-user-graduate" aria-hidden="true"></i> 指导教师：唐伟</p>
        <p>以第一作者完成 ACM Multimedia 2026 投稿并进入 Rebuttal；Rebuttal 前评分为 4/4/3/2/2。</p>
      </div>
    </article>
  </div>
</section>

<span class="anchor" id="selected-projects"></span>

<section class="home-section" aria-labelledby="projects-title">
  <header class="section-header" data-reveal>
    <p class="section-kicker">Selected Projects</p>
    <h2 id="projects-title">代表性项目</h2>
    <p>把研究问题落到可运行的系统原型，用真实工作负载验证调度、编译与运行时设计。</p>
  </header>

  <div class="featured-projects">
    <article class="project-card project-card--blue" data-reveal>
      <div class="project-topline"><span>01 · LLM Serving</span><span class="project-state">Research</span></div>
      <div class="project-icon"><i class="fas fa-layer-group" aria-hidden="true"></i></div>
      <h3>SemServe</h3>
      <p class="project-subtitle">语义优先级与 KV Cache 存储精度的协同设计系统</p>
      <ul>
        <li>设计以 SLO 为目标的语义优先级自动调优方法，结合离线搜索与在线计算。</li>
        <li>把优先级与 MLFQ 映射，并在 FP16、INT8 与 CPU Offload 间进行分层存储。</li>
      </ul>
      <div class="tag-list tag-list--dark"><span>PyTorch</span><span>Transformers</span><span>Qwen</span><span>Llama</span></div>
    </article>

    <article class="project-card project-card--cyan" data-reveal>
      <div class="project-topline"><span>02 · Agent Runtime</span><span class="project-state">Iterating</span></div>
      <div class="project-icon"><i class="fas fa-code-branch" aria-hidden="true"></i></div>
      <h3>SkVM</h3>
      <p class="project-subtitle">面向异构 LLM 与 Agent Harness 的技能编译与运行时系统</p>
      <ul>
        <li>为四类 Agent Adapter 实现面向 Terminal-Bench v2.1 的容器化执行模式。</li>
        <li>在 AOT/JIT 阶段引入 DLP、ILP、TLP 并行分类与多角色智能体优化。</li>
      </ul>
      <div class="tag-list tag-list--dark"><span>TypeScript</span><span>Bun</span><span>Docker</span><span>LLM Agent</span></div>
    </article>
  </div>

  <h3 class="subsection-title" data-reveal>其他系统项目</h3>
  <div class="mini-project-grid">
    <article class="mini-project" data-reveal>
      <i class="fas fa-terminal" aria-hidden="true"></i>
      <h4>Rust 操作系统内核</h4>
      <p>面向 RISC-V 实现 Boot、Trap、系统调用、进程、虚拟内存与文件系统。</p>
      <span>Rust · RISC-V · QEMU</span>
    </article>
    <article class="mini-project" data-reveal>
      <i class="fas fa-database" aria-hidden="true"></i>
      <h4>Mini-GFS 分布式文件系统</h4>
      <p>实现 Master、ChunkServer 与 Client，以及副本、心跳和失效处理。</p>
      <span>Go · RPC · Storage</span>
    </article>
    <article class="mini-project" data-reveal>
      <i class="fas fa-project-diagram" aria-hidden="true"></i>
      <h4>Chord 分布式哈希环</h4>
      <p>支持节点动态加入退出、Finger Table 路由、迁移与 Stabilization。</p>
      <span>Go · Distributed Systems</span>
    </article>
    <article class="mini-project" data-reveal>
      <i class="fas fa-plug" aria-hidden="true"></i>
      <h4>Rust MCP Server</h4>
      <p>支持工具 Schema、请求解析、异步执行与错误处理，已被 Awesome-MCP-ZH 收录。</p>
      <span>Rust · MCP · Async</span>
    </article>
  </div>
</section>

<span class="anchor" id="submissions"></span>

<section class="home-section" aria-labelledby="submissions-title">
  <header class="section-header" data-reveal>
    <p class="section-kicker">Research Output</p>
    <h2 id="submissions-title">投稿经历</h2>
  </header>

  <div class="submission-list">
    <article class="submission-card" data-reveal>
      <div class="submission-badge submission-badge--oral">ORAL</div>
      <div><p class="submission-venue">ICIC 2026</p><h3>KV Cache Management</h3><p>独立作者 · 已接收为 Oral Presentation</p></div>
      <span class="submission-year">2026</span>
    </article>
    <article class="submission-card" data-reveal>
      <div class="submission-badge submission-badge--neutral">REBUTTAL</div>
      <div><p class="submission-venue">ACM Multimedia 2026 · CCF-A</p><h3>图像处理方向</h3><p>第一作者 · 进入 Rebuttal，最终未接收</p></div>
      <span class="submission-year">2026</span>
    </article>
    <article class="submission-card" data-reveal>
      <div class="submission-badge submission-badge--prepare">IN PREP.</div>
      <div><p class="submission-venue">HPCA 2027</p><h3>RISC-V 端侧推理优化</h3><p>第三作者 · 学生作者中排名第一，论文撰写中</p></div>
      <span class="submission-year">2027</span>
    </article>
  </div>
</section>

<span class="anchor" id="skills"></span>

<section class="home-section" aria-labelledby="skills-title">
  <header class="section-header" data-reveal>
    <p class="section-kicker">Toolkit</p>
    <h2 id="skills-title">技能</h2>
  </header>

  <div class="skills-grid">
    <article class="skill-group" data-reveal><p>Languages</p><div><span>Rust</span><span>C/C++</span><span>Python</span><span>Go</span></div></article>
    <article class="skill-group" data-reveal><p>Systems</p><div><span>Linux</span><span>Distributed Systems</span><span>Concurrency</span><span>RISC-V</span></div></article>
    <article class="skill-group" data-reveal><p>AI Infrastructure</p><div><span>CUDA C++</span><span>PyTorch</span><span>vLLM</span><span>NCCL</span><span>GPUDirect RDMA</span></div></article>
    <article class="skill-group" data-reveal><p>Agent Engineering</p><div><span>Claude Code</span><span>Codex</span><span>Skill</span><span>MCP</span><span>Hook</span><span>Rules</span></div></article>
  </div>
</section>

<span class="anchor" id="honors"></span>

<section class="home-section" aria-labelledby="honors-title">
  <header class="section-header" data-reveal>
    <p class="section-kicker">Honors</p>
    <h2 id="honors-title">荣誉与竞赛</h2>
  </header>

  <div class="honor-grid">
    <article class="honor-card" data-reveal>
      <div class="honor-icon"><i class="fas fa-trophy" aria-hidden="true"></i></div>
      <div><span>2025.12</span><h3>国家一等奖</h3><p>全球校园人工智能算法大赛算法挑战赛 · 队内第一顺位</p></div>
    </article>
    <article class="honor-card" data-reveal>
      <div class="honor-icon honor-icon--silver"><i class="fas fa-medal" aria-hidden="true"></i></div>
      <div><span>2025.10</span><h3>国际银奖</h3><p>国际基因工程机器大赛（iGEM）</p></div>
    </article>
  </div>
</section>

<footer class="home-footer" data-reveal>
  <span>Last updated · 2026.07</span>
  <a href="#about-me">返回顶部 <i class="fas fa-arrow-up" aria-hidden="true"></i></a>
</footer>
