---
permalink: /
title: ""
excerpt: ""
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

<span class="anchor" id="about-me"></span>

我是李阔，同济大学计算机科学与技术系数据科学与大数据技术专业本科生，预计于 2027 年毕业。我的研究主要聚焦 **MLSys / AI Infrastructure**，关注从高性能算子、编译运行时到分布式训练与在线服务的全栈系统优化。

目前，我在上海交通大学先进网络研究所开展面向多请求 LLM Serving 的语义优先级调度与 KV Cache 存储管理研究，并持续参与异构 LLM 与 Agent Harness 系统的开发。

[下载最新版简历]({{ '/files/Li_Kuo_CV.pdf' | relative_url }}){: .btn .btn--primary }
[GitHub](https://github.com/Zlatanwic){: .btn }

<span class="anchor" id="research-interests"></span>

# 研究兴趣

- **大模型推理与服务系统：** 请求调度、KV Cache 管理与分层存储、Prefill–Decode 协同、故障容错，以及系统与模型的协同设计。
- **分布式训练与通信优化：** 数据并行、张量并行、流水线并行和专家并行，以及通信计算重叠、集合通信优化和大规模训练系统的可扩展性与可靠性。
- **GPU 算子与深度学习编译：** CUDA 高性能编程、算子融合、Megakernel、持久化执行、自动调优与高性能算子生成，以及 Triton、TileLang 等编程和编译框架。
- **Agent 与异构 AI 基础设施：** Agent Harness 自动化、工具调用编排、技能编译与运行时优化，以及面向 RISC-V 等异构硬件的端侧模型推理系统。
- 多模态、强化学习与具身智能系统。

<span class="anchor" id="education"></span>

# 教育背景

**同济大学，计算机科学与技术系** · 数据科学与大数据技术（本科）

*2023 – 2027（预计）*

- GPA：90.51/100，4.56/5.0；专业排名：2/40。
- IELTS 7.0；CET-6 571。

<span class="anchor" id="research-experience"></span>

# 科研经历

## 上海交通大学先进网络研究所

*2026.05 – 至今 · 指导教师：陈博*

面向多请求 LLM Serving 场景，研究语义优先级调度与 KV Cache 存储管理的协同设计。

## 上海交通大学 IPADS 实验室

*2026.05 – 2026.07 · 指导教师：冯二虎*

参与 SkVM 异构 LLM 与 Agent Harness 系统的后续扩展，优化系统效果与性能。

## 南京大学 LANDS 实验室

*2026.05 – 2026.07 · 指导教师：匡成颖*

基于 MNN 开展 RISC-V 端侧推理链路优化。相关论文正在撰写，本人为第三作者、学生作者中排名第一，计划投稿 HPCA 2027。

## 独立研究经历

*2026.02 – 2026.04*

以独立作者身份投稿 ICIC 2026，论文被接收为 Oral Presentation。目前在上海交通大学陈博老师指导下进一步扩展与优化该工作，计划投稿 CCF-A 类会议。

## 同济大学图像融合实验室

*2025.09 – 2026.01 · 指导教师：唐伟*

以第一作者身份完成 ACM Multimedia 2026 论文投稿并进入 Rebuttal 阶段；Rebuttal 前审稿评分为 4/4/3/2/2，最终未被接收。

<span class="anchor" id="selected-projects"></span>

# 代表性项目

## SemServe：语义优先级与 KV Cache 存储精度的协同设计系统

*2026 · Python / PyTorch / Transformers / Qwen2.5-3B / Llama-3.2-3B*

- 从 ICIC 2026 独立作者 Oral 工作继续扩展，目标为 CCF-A 类会议。
- 设计语义优先级自动调优方法，拟合在线函数，并以 SLO 为优化目标结合离线搜索与在线计算。
- 将语义优先级与 MLFQ 直接映射：最高优先级队列使用 FP16 存储，次优先级使用 INT8，第三优先级卸载至 CPU。

## SkVM：面向异构 LLM 与 Agent Harness 的技能编译与运行时系统

*持续迭代中 · TypeScript / Bun / Docker / LLM Agent*

- 为四个 Agent Adapter（pi、Claude Code、OpenCode、Hermes）实现面向 Terminal-Bench v2.1 的容器化执行模式。
- 在 AOT 编译器 pass 3 中引入 DLP / ILP / TLP 三级并行分类，并对 ILP 类工具调用实施并行分发。
- 在 JIT 优化阶段引入多角色智能体优化，并与多轮智能体优化进行对比。

## 其他系统项目

- **Rust 操作系统内核** · Rust / RISC-V / QEMU：实现 Boot、Trap、系统调用、进程管理、虚拟内存和文件系统等基础模块，并使用 QEMU 与 GDB 调试。
- **Mini-GFS 分布式文件系统** · Go / RPC / Distributed Storage：实现 Master、ChunkServer 与 Client，支持文件分块读写、元数据管理、Chunk 副本维护、心跳检测和节点失效处理。
- **基于 Chord 的分布式哈希环** · Go / Distributed Systems / RPC：实现节点动态加入与退出、Finger Table 路由、数据迁移与周期性 Stabilization。
- **Rust MCP Server** · Rust / MCP / Async Runtime：实现支持工具 Schema、请求解析、异步执行和错误处理的 MCP Server，相关项目已被 Awesome-MCP-ZH 收录。

<span class="anchor" id="submissions"></span>

# 投稿经历

- 以第一作者完成 ACM Multimedia 2026 图像处理方向投稿（CCF-A，进入 Rebuttal，最终未接收）。
- 以独立作者完成 ICIC 2026 KV Cache Management 方向投稿并被接收为 Oral Presentation。
- 准备以第三作者投稿 HPCA 2027（学生作者中排名第一，论文撰写中）。

<span class="anchor" id="skills"></span>

# 技能

- **编程语言：** Rust、C/C++、Python、Go。
- **传统系统：** Linux、分布式系统、并发、RISC-V。
- **AI 系统：** CUDA C++、PyTorch、vLLM、NCCL、GPUDirect RDMA。
- **Coding Agent：** 熟练使用 Claude Code、Codex 等工具，并配置与开发 Skill、MCP、Hook、Rules 等 Harness 组件。

<span class="anchor" id="honors"></span>

# 荣誉与竞赛

- *2025.12* · 国家一等奖（队内第一顺位），全球校园人工智能算法大赛算法挑战赛。
- *2025.10* · 国际银奖，国际基因工程机器大赛（iGEM）。

---

简历更新于 2026 年 7 月。
