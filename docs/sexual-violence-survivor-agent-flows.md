# 性暴力幸存者故事 Agent —— 核心业务流程（活动图 + 时序图）

基于 [性暴力幸存者故事 Agent MVP 产品设计](./sexual-violence-survivor-agent-mvp.md) 梳理的核心流程与交互。

---

## 1. 核心业务概览

两条主流程：

- **内容生产流程**：采访稿 → 嘉宾档案 → Prompt → 部署 Agent（运营侧，离线/后台）。
- **用户使用流程**：进入站点 → 触发警告与同意 → 选嘉宾 → 对话了解故事（用户侧，在线）。

---

## 2. 活动图

### 2.1 内容生产流程（采访稿 → 单嘉宾 Agent）

运营/内容侧：从原始采访到可用的「单嘉宾 Agent」的流水线。

```mermaid
flowchart TD
    subgraph 输入
        A[采访文稿（原始）]
    end

    subgraph 结构化
        B[结构化抽取（人工/半自动）]
        C[产出嘉宾档案]
        C1[基础设定]
        C2[经历节点]
        C3[态度与观点]
        C4[可引用原话]
        C5[边界清单]
    end

    subgraph 审核
        D{人工审核通过?}
        E[修订档案]
    end

    subgraph Prompt 与部署
        F[Prompt 模板填充]
        G[系统 prompt + 边界规则 + 兜底话术]
        H[可选: few-shot 示例]
        I[部署为单嘉宾 Agent]
    end

    A --> B
    B --> C
    C --> C1 & C2 & C3 & C4 & C5
    C1 & C2 & C3 & C4 & C5 --> D
    D -->|否| E
    E --> B
    D -->|是| F
    F --> G --> H --> I
```

**说明**：嘉宾档案含五类内容；审核不通过则回到结构化修订；通过后进入 Prompt 填充并部署。

---

### 2.2 用户使用流程（从进入站点到对话）

用户侧：从打开产品到与某位嘉宾 Agent 对话的完整路径。

```mermaid
flowchart TD
    Start([用户打开站点]) --> A[展示触发警告 + 支持资源入口]
    A --> B{用户同意进入?}
    B -->|否| End1([离开])
    B -->|是| C[展示嘉宾列表]
    C --> D[用户浏览 9 位嘉宾]
    D --> E[选择一位嘉宾]
    E --> F{可选: 再次触发警告}
    F --> G[进入该嘉宾对话页]
    G --> H[加载该嘉宾 Agent]
    H --> I[用户与 Agent 对话]
    I --> J{用户行为}
    J -->|继续对话| I
    J -->|点击支持资源| K[跳转/展示心理支持与求助资源]
    J -->|返回列表| C
    J -->|离开| End2([结束])
    K --> End2
```

**说明**：同意后进入列表；选嘉宾后进入对话；对话中可随时访问支持资源、返回列表或离开。

---

### 2.3 单轮对话内 Agent 行为（边界与兜底）

单轮「用户发问 → Agent 回复」的内部逻辑分支。

```mermaid
flowchart TD
    In[收到用户消息] --> A{是否触及边界清单?}
    A -->|禁止具体创伤/施害者视角/虚构等| B[返回兜底: 不回答或引导回已分享内容]
    A -->|否| C{用户是否表露自身创伤或危机?}
    C -->|是| D[固定话术 + 引导至热线/专业资源]
    C -->|否| E[在嘉宾档案内检索/推理]
    E --> F{问题在档案范围内?}
    F -->|是| G[以嘉宾口吻生成回复]
    F -->|否| H[回复「不在我分享的范围内」或引导回已分享内容]
    B --> Out[返回回复]
    D --> Out
    G --> Out
    H --> Out
```

**说明**：先做边界与危机判断，再决定是档案内回答还是统一兜底/引导。

---

## 3. 时序图

### 3.1 用户从进入站点到开始对话

用户、前端、后端（若有）之间的主要交互顺序。

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as 前端
    participant API as 后端/API

    U->>FE: 打开站点
    FE->>U: 展示触发警告 + 支持资源
    U->>FE: 点击「同意进入」
    FE->>U: 展示嘉宾列表（9 位）
    U->>FE: 选择一位嘉宾
    FE->>API: 请求该嘉宾对话会话/配置（可选）
    API-->>FE: 会话标识或配置
    FE->>U: 进入对话页，展示输入框与支持资源入口
    U->>FE: 发送第一条消息
    FE->>API: 发送消息（嘉宾ID, 消息内容）
    Note over API: 见 3.2 单轮对话
    API-->>FE: Agent 回复
    FE->>U: 展示回复
```

**说明**：MVP 下会话可为无状态或仅会话内上下文；若需「会话 ID」则由后端在首次对话时分配。

---

### 3.2 单轮对话（用户消息 → Agent 回复）

后端内部：前端请求抵达后，Agent 运行时与 LLM 的协作及边界检查。

```mermaid
sequenceDiagram
    participant FE as 前端
    participant API as 对话 API
    participant Boundary as 边界/规则模块
    participant Agent as Agent 运行时
    participant LLM as LLM
    participant Profile as 嘉宾档案

    FE->>API: 发送消息（嘉宾ID, 用户消息）
    API->>Boundary: 检查边界（禁止项、危机话术触发条件）
    alt 触及禁止项
        Boundary-->>API: 命中禁止项
        API->>API: 生成兜底回复（不演绎/引导回已分享）
        API-->>FE: 兜底回复
    else 用户表露创伤/危机
        Boundary-->>API: 命中危机话术
        API->>API: 返回固定话术 + 支持资源链接/文案
        API-->>FE: 危机话术回复
    else 正常问句
        Boundary-->>API: 通过
        API->>Profile: 检索/读取该嘉宾档案
        Profile-->>API: 档案内容
        API->>Agent: 构造 system prompt + 本轮对话上下文
        Agent->>LLM: 调用 LLM（system + user/assistant 历史 + 当前 user）
        LLM-->>Agent: 模型输出
        Agent->>Boundary: 可选：回复后检查（防止越界）
        Boundary-->>Agent: 通过或替换为兜底
        Agent-->>API: 最终回复
        API-->>FE: Agent 回复
    end
```

**说明**：先做边界与危机判断；仅「正常问句」走档案 + LLM；可选对 LLM 输出做一次越界检查再返回。

---

### 3.3 内容生产侧：从档案到部署（协作时序）

表达内容、Prompt、部署角色之间的协作顺序（可与 2.1 活动图对照）。

```mermaid
sequenceDiagram
    participant Human as 内容/运营
    participant Pipeline as 结构化/Prompt 流水线
    participant Store as 配置/存储
    participant Runtime as Agent 运行时

    Human->>Pipeline: 提交采访文稿
    Pipeline->>Pipeline: 结构化抽取 → 嘉宾档案
    Pipeline->>Human: 输出嘉宾档案草稿
    Human->>Pipeline: 审核/修订并确认
    Pipeline->>Pipeline: Prompt 模板填充（角色+边界+兜底）
    Pipeline->>Store: 写入嘉宾配置（档案 + prompt）
    Pipeline->>Runtime: 加载/注册该嘉宾 Agent
    Runtime-->>Pipeline: 就绪
    Note over Human, Runtime: 该嘉宾可被用户选择并对话
```

**说明**：人工审核是关键节点；配置落库后由运行时加载，无需每次请求时再读档案原文。

---

## 4. 图与 MVP 文档的对应关系

| 图 | 对应文档章节 | 用途 |
|----|--------------|------|
| 2.1 内容生产活动图 | §4.1 采访→Agent 流水线、§6.1 角色划分 | 运营侧从稿子到上线一嘉宾的步骤与分支 |
| 2.2 用户使用活动图 | §3 信息架构、§4.3 用户侧流程 | 用户从进入、同意、选人到对话的路径 |
| 2.3 单轮对话活动图 | §4.2 对话边界规则 | 单轮回复的边界/危机/档案内逻辑 |
| 3.1 用户到时序图 | §3 IA、§4.3 | 用户与前端、API 的请求顺序 |
| 3.2 单轮对话时序图 | §4.2、§6.1 Agent 运行时 | 后端内部边界→档案→LLM→回复的协作 |
| 3.3 内容生产时序图 | §4.1、§7 里程碑 | 内容侧人机协作与部署衔接 |

---

*文档版本：v1 | 基于 MVP 产品设计文档梳理*
