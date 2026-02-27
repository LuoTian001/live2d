# Live2D Widget with AI Chat

本项目基于 [live2d-widget-v3](https://github.com/letere-gzj/live2d-widget-v3) 二次开发，接入Live2D AI 对话功能，支持上下文对话、Markdown 渲染以及全站 RAG（检索增强生成）检索。
- 演示地址：[洛天的小窝](https://www.luotian.cyou)、[GitHub 博客](https://luotian001.github.io)
- live2d 基础配置教程：[Live2D moc3 模型部署教程 — 基于 Hexo Butterfly 主题](https://www.luotian.cyou/post/moc3-for-butterfly.html)
- live2d AI 功能配置教程：[Live2D AI 聊天功能配置教程 — 基于 FastAPI + DeepSeek](https://www.luotian.cyou/post/live2d-ai-chat.html)
- 示例模型地址：[Allium](https://www.bilibili.com/video/BV1S8411H7zf/)；作者：[Yuri幽里_official](https://space.bilibili.com/1815643596)

<table style="width: 100%; text-align: center;">
  <tr>
    <td><img src="/example-img/ai-chat-1.png" width="100%" /><br><b>示例演示 1</b></td>
    <td><img src="/example-img/ai-chat-2.png" width="100%" /><br><b>示例演示 2</b></td>
  </tr>
  <tr>
    <td><img src="/example-img/ai-chat-3.png" width="100%" /><br><b>示例演示 3</b></td>
    <td><img src="/example-img/ai-chat-4.png" width="100%" /><br><b>示例演示 4</b></td>
  </tr>
</table>

> [!TIP]
>  + 此项目仅支持 moc3 模型，不支持旧版 moc 模型
>  + AI 功能目前需要后端服务器支持，请确保已经按照 [教程](https://www.luotian.cyou/post/live2d-ai-chat.html) 部署了 FastAPI + DeepSeek 后端服务，并正确配置了 API 地址和鉴权 UUID

## 1. 核心功能特性

* **moc3 模型支持**：对接 Cubism SDK for Web (v5)，支持渲染现代 Live2D 模型。适配 butterfly 的 PJAX 功能。
* **AI 对话交互**：
  * **RAG 页面上下文感知**：自动抓取当前阅读文章正文内容，AI 能够直接回答“这篇文章讲了什么”。
  * **RAG 全局知识库检索**：结合 Hexo `search.json`，实现博客全站内容的关联问答。
  * **Markdown 语法解析**：AI 回答支持加粗、代码块、列表等标准 Markdown 语法。
* **UI 设计适配**：适配 Butterfly 的暗黑/白天模式切换，具备边界防遮挡检测。
* **自定义配置**：提供提示词（System Prompt）、欢迎语、快捷回复等选项。可通过 JSON 热更新，无需修改核心逻辑代码。
* **轻量级前端集成**：通过 bottom 接入，无需修改主题源码。且 AI 功能与 Live2D 核心模块完全解耦，可根据需求选择性启用。

## 2. 目录结构与文件说明

项目采用模块化解耦的设计，分离基础渲染层与 AI 逻辑层。主要目录结构与各文件功能说明如下：
```text
live2d/
├── Core/
│   └── live2dcubismcore.js      # Live2D Cubism 官方核心 Web 库 (底层骨骼运算，请勿修改)
├── model/                       # moc3 模型资源存放目录
│   └── ...                      # 模型文件路径
├── model_list.json              # 模型列表
├── live2d-sdk.js                # Live2D 渲染与控制 SDK (基于 WebGL)
├── waifu.css                    # 看板娘本体基础 UI 样式表
├── waifu-tips.json              # 基础交互语料库 (基于时间段、页面点击、元素悬浮的固定提示语)
├── waifu-tips.js                # 看板娘主控制逻辑 (负责组件初始化、挂载侧边工具栏事件)
├── waifu-chat.css               # 🆕 AI 聊天窗口样式表 (含毛玻璃与暗黑模式适配)
├── waifu-chat.json              # 🆕 AI 对话外置配置 (预设 System Prompt、欢迎语、快捷指令等)
└── waifu-chat.js                # 🆕 AI 聊天核心引擎 (负责 RAG 文本抓取、API 请求封装、Markdown 解析与打字机渲染)
```

## 3. 前端部署

> [!TIP] 
> 该部分教程假设你已经有一个基于 Hexo 的博客，并且正在使用 Butterfly 主题。如果为其他主题请根据实际情况调整资源路径和注入方式。

将本仓库git到hexo博客的`source/` 目录下，并重命名为 `live2d`：
```bash
cd 你的博客目录/source/
git clone git@github.com:LuoTian001/live2d-widget-AIChat.git live2d
```
在`_config.yml`博客配置文件下添加以下代码，排除hexo博客对 `live2d` 目录的渲染：
```yaml
skip_render: 
  - 'live2d/**'
```
在 `_config.butterfly.yml` 文件中，找到 `inject.bottom` 节点，加入以下代码：

<details>
<summary>点击展开查看 Inject 配置代码</summary>
```html
inject:
  bottom:
    - |
      <script>
      if (typeof window.live2d_initialized === 'undefined') {
          window.live2d_initialized = true;
          const cdnPath = "https://cdn.jsdelivr.net/gh/LuoTian001/live2d-widget-AIChat@main/"; // CDN 加速路径，指向本项目的 jsDelivr 镜像仓库
          const localPath = "live2d/"; // 本地资源路径，指向 Hexo 博客的 public 目录下的 live2d 文件夹
          const config = {
              path: {
                  homePath: "/", // 博客首页路径，默认 "/"
                  modelPath: localPath, // Live2D 模型资源路径，指向本地的 live2d/model/ 目录
                  cssPath: localPath + "waifu.css", // 看板娘基础样式表路径
                  tipsJsonPath: localPath + "waifu-tips.json", // 看板娘提示语料库路径
                  tipsJsPath: localPath + "waifu-tips.js", // 看板娘主控制逻辑脚本路径
                  chatJsPath: localPath + "waifu-chat.js", // AI 聊天核心引擎脚本路径
                  chatCssPath: localPath + "waifu-chat.css", // AI 聊天样式表路径
                  chatJsonPath: localPath + "waifu-chat.json", // AI 聊天配置文件路径
                  live2dCorePath: cdnPath + "Core/live2dcubismcore.js", // Live2D 核心库路径
                  live2dSdkPath: cdnPath + "live2d-sdk.js" // Live2D SDK 路径
              },
              tools: ["chat", "hitokoto", "express", "info", "quit"], // 侧边工具栏按钮配置
              drag: { enable: false, direction: ["x", "y"] }, // 拖拽配置
              switchType: "order" // 模型/材质切换方式
          };
          if (screen.width >= 768) {
              window.addEventListener('load', () => {
                  const initTask = () => {
                      Promise.all([
                          loadExternalResource(config.path.cssPath, "css"),
                          loadExternalResource(config.path.live2dCorePath, "js"),
                          loadExternalResource(config.path.live2dSdkPath, "js"),
                          loadExternalResource(config.path.tipsJsPath, "js"),
                          loadExternalResource(config.path.chatJsPath, "js"),
                          loadExternalResource(config.path.chatCssPath, "css"),
                          loadExternalResource("https://cdn.jsdelivr.net/npm/marked/marked.min.js", "js") // 加载 Marked.js 库
                      ]).then(() => {
                          if (typeof initWidget !== "undefined") {
                              initWidget({
                                  waifuPath: config.path.tipsJsonPath,
                                  cdnPath: config.path.modelPath,
                                  tools: config.tools,
                                  dragEnable: config.drag.enable,
                                  dragDirection: config.drag.direction,
                                  switchType: config.switchType
                              });
                              if (typeof Live2DChat !== "undefined") {
                                  window.live2dChatInstance = new Live2DChat({
                                      apiUrl: 'https://你的域名/api/chat', // 后端 AI 对话接口地址，需与后端部署的 FastAPI 服务地址一致
                                      clientUuid: '你的鉴权UUID', // 简易鉴权 UUID，需与后端 FastAPI 服务中设置的 UUID 一致
                                      configUrl: config.path.chatJsonPath 
                                  });
                              }
                          }
                      }).catch(err => {
                          console.error("Live2D 资源加载失败:", err);
                      });
                  };
                  if (window.requestIdleCallback) {
                      requestIdleCallback(initTask);
                  } else {
                      setTimeout(initTask, 500);
                  }
              });
          }
          function loadExternalResource(url, type) {
              return new Promise((resolve, reject) => {
                  let tag;
                  if (type === "css") {
                      tag = document.createElement("link"); 
                      tag.rel = "stylesheet"; 
                      tag.href = url;
                  } else if (type === "js") {
                      tag = document.createElement("script"); 
                      tag.src = url;
                      tag.async = false; 
                  }
                  if (tag) {
                      tag.onload = () => resolve(url); 
                      tag.onerror = () => reject(url); 
                      document.head.appendChild(tag);
                  }
              });
          }
      }
      </script>
```
</details>

### 3.1 参数配置

AI 的行为逻辑、身份设定、UI 文本以及上下文处理策略由 `waifu-chat.json` 配置，可进行自定义：

#### 3.1.1 `api` (接口通信配置)

负责定义前端与代理后端的通信信道。注意：此处配置优先级**低于**通过 `inject.bottom` 传入的参数。
* **`url`** (`String`): AI 对话接口的请求路由（如 `/api/chat`）。前端将会向此地址发送 POST 请求。
* **`uuid`** (`String`): 客户端身份标识或极简 Token，将通过 HTTP Header 的 `Authorization: Bearer <uuid>` 字段携带，供后端校验使用。

#### 3.1.2 `ui` (界面交互配置)

控制聊天窗口的视觉呈现与动画参数。
* **`title`** (`String`): 聊天窗口顶部的标题文本（如 `"Relink 终端"`）。
* **`placeholder`** (`String`): 底部输入框的占位提示文本，引导用户进行键盘交互（如 `"发送消息 (Enter发送, Shift+Enter换行)..."`）。
* **`errorMsg`** (`String`): 当后端接口返回非 200 状态码或跨域/网络阻断时，Live2D 原生气泡弹出的异常提示语（如 `"大脑连接中断..."`）。
* **`typingSpeed`** (`Number`): 模拟打字机动画的单字符输出延迟时间。数值越大，打字显示越慢。建议设定在 `20` - `40` 之间。

#### 3.1.3 `chat` (核心对话与 RAG 配置)

控制 AI 的长期记忆、RAG（检索增强生成）策略以及系统级人设提示词。
* **`storageKey`** (`String`): 用于在浏览器 LocalStorage 中持久化存储对话历史的键名（默认 `"waifu_chat_history"`）。更改此值可强制清空旧访客的缓存记忆。
* **`maxHistory`** (`Number`): 保留在 LocalStorage 中的最大历史消息对象（包含 User 和 AI）数量。用于防止上下文过长导致的大模型 Token 溢出与本地存储爆满。
* **`pageContextSelector`** (`String`): 当前页面阅读器抓取的 DOM 目标选择器。在 Butterfly 主题中通常为 `"#article-container"`。前端会提取该容器内的纯文本作为上下文。
* **`pageContextMaxLength`** (`Number`): 页面正文抓取的最大字符截断长度。超长文章将被强制截断，以保护大模型的 Context Window 长度限制并降低 API 成本（默认 `3000`）。
* **`searchJsonPath`** (`String`): Hexo 本地全站索引文件路径，通常由 `hexo-generator-search` 插件生成，默认 `"/search.json"`。用于用户提问时的全局知识库检索匹配。
* **`welcomeMsg`** (`String`): 访客首次打开聊天框时，AI 主动发送的第一条破冰消息。
* **`welcomeOptions`** (`Array`): 预设的快捷对话选项组。
  * `display` (`String`): 显示在页面按钮上的引导文字。
  * `send` (`String`): 实际发送给 AI 的隐式提问。**支持多变体**：使用 `||` 分割多句话（例如 `"总结文章 || 这篇文章讲了啥"`），前端每次点击会随机抽取一句。
* **`systemPrompt`** (`String` | `Array`): **[最高指令]** System 角色提示词。建议使用 JSON 数组格式分段编写（引擎会自动用换行符 `\n` 拼接）。在此处定义看板娘的名字、性格、背景设定，以及强制性的输出格式限制。
* **`contextTemplate`** (`Object`): RAG 上下文拼装模板，用于规范化前端发往后端的隐式 Prompt 结构。
  * `pageContextTitle`: 注入当前页面正文时的段落标题。
  * `searchContextTitle`: 注入全局检索匹配结果时的段落标题。
  * `instruction`: 指导大模型如何使用上述上下文的引导语。
  * `userQuestion`: 用户原始问题的锚点标识。
  * `truncateMsg`: 当页面正文触发 `pageContextMaxLength` 截断时，自动拼接在末尾的系统提示语。

### 3.2 注意事项

1. **基础功能配置简化说明**：
本项目在原版底层框架上对 Live2D 功能进行了一定程度的默认简化。如果你需要进一步自定义模型，例如自定义 `.exp3.json` 触发专属表情、为 `.motion3.json` 动作绑定口型与音频、或调整模型在 Canvas 画布中的 `scale` 缩放与 `translate` 坐标偏移量等，请务必参阅原项目的详细文档 👉 [live2d-widget-v3 使用说明](https://github.com/letere-gzj/live2d-widget-v3)。
1. **AI 模块的低耦合性**：
新增的 AI 对话引擎 (`waifu-chat.*` 文件) 具有完全独立的生命周期。如果你在某些页面不想开启 AI 功能，只需在前端脚本注入时不加载这三个文件，看板娘依然可以作为普通的 Live2D 挂件正常运行，不会引发报错。
1. **RAG (检索增强生成) 容器匹配**：
`waifu-chat.js` 中的本地阅读器默认通过 `#article-container` 选择器来提取当前页面的正文文本。如果你的 Hexo 博客未采用 Butterfly 主题，或者你在主题魔改中更改了文章主容器的 ID/Class，请务必在 `waifu-chat.json` 中同步修改 `pageContextSelector` 字段。否则 AI 将无法正确读取当前页面的上下文信息。

## 3.3 后端部署

*(这里是后端服务搭建与代理转发的详细文档)*

【此章节即将更新...】

## 4. 鸣谢与协议

本项目前端 AI 逻辑与 UI 由 @LuoTian001 原创开发。Live2D 渲染底层框架基于优秀的开源项目二次修改：

* [stevenjoezhang/live2d-widget](https://github.com/stevenjoezhang/live2d-widget)
* [letere-gzj/live2d-widget-v3](https://github.com/letere-gzj/live2d-widget-v3)
* [marked.js](https://marked.js.org/) (Markdown 解析引擎)

本项目遵循 MIT 开源协议。