# Live2D Widget with AI Chat

&#8195;&#8195;本项目基于 [live2d-widget-v3](https://github.com/letere-gzj/live2d-widget-v3) 二次开发，接入Live2D AI 对话功能，支持上下文对话、Markdown 渲染以及全站 RAG（检索增强生成）检索。

&#8195;&#8195;此项目仅支持在桌面端启用 Lived2D 模型与 AI 聊天功能，移动端将自动禁用以保证性能与用户体验。如果你仅需部署一个具备**完整 RAG 功能的 AI 聊天插件且适配移动端**，同时无 Live2D 接入，可以参考我的另一个项目 👉 [hexo-AIChat-Plugin](https://github.com/LuoTian001/hexo-AIChat-Plugin)。如果想在桌面端使用本项目且在移动端提供 AI 聊天功能，请参考 [readme 3.3 节](#33-移动端适配) 的配置方法。

- 模型演示地址：[洛天的小窝](https://www.luotian.cyou)、[GitHub 博客](https://luotian001.github.io)
- live2d 基础配置教程：[Live2D moc3 模型部署教程 — 基于 Hexo Butterfly 主题](https://www.luotian.cyou/post/moc3-for-butterfly.html)
- live2d AI 功能配置教程：[Live2D AI 聊天功能配置教程 — 基于 FastAPI + DeepSeek](https://www.luotian.cyou/post/live2d-ai-chat.html)
- 示例Live 2D模型地址：[Allium](https://www.bilibili.com/video/BV1S8411H7zf/)；作者：[Yuri幽里_official](https://space.bilibili.com/1815643596)

> [!TIP]
>  + 此项目仅支持 **moc3 模型**，不支持旧版 moc 模型，AI 功能目前仅支持 **Deepseek 后端服务**，不支持其他 LLM 服务。
>  + AI 功能目前需要**后端服务器**支持，请确保已经按照 [后端配置教程](https://www.luotian.cyou/post/live2d-ai-chat.html) 部署了 **FastAPI + DeepSeek 后端服务**

<table style="width: 100%; text-align: center;">
  <tr><center>
    <td><img src="/example-img/ai-chat-1.png" width="100%" /><br><b>示例演示 1</b></td>
    <td><img src="/example-img/ai-chat-2.png" width="100%" /><br><b>示例演示 2</b></td>
  </center></tr>
  <tr><center>
    <td><img src="/example-img/ai-chat-3.png" width="100%" /><br><b>示例演示 3</b></td>
    <td><img src="/example-img/ai-chat-4.png" width="100%" /><br><b>示例演示 4</b></td>
  </center></tr>
</table>

## ⭐ 核心功能

* **1. moc3 模型支持：** 对接 Cubism SDK for Web (v5)，支持渲染现代 Live2D 模型。适配 butterfly 的 PJAX 功能。
* **2. AI 对话交互：**
  * **RAG 页面上下文感知：** 自动抓取当前阅读文章正文内容，AI 能够直接回答“这篇文章讲了什么”。
  * **RAG 全局知识库检索：** 结合 Hexo `search.xml`，实现博客全站内容的关联问答。
  * **Markdown 语法解析：** AI 回答支持加粗、代码块、列表等标准 Markdown 语法。
* **3. UI 适配：** 适配 Butterfly 的暗黑/白天模式切换，具备边界防遮挡检测。
* **4. PJAX 适配：** 支持 Hexo + Butterfly 主题的 PJAX 无刷新加载。
* **5. 自定义配置：** 提供提示词（System Prompt）、欢迎语、快捷回复等配置选项，可通过 JSON 热更新。
* **6. 轻量级前端集成：** 通过 bottom 接入，无需修改主题源码。且 AI 功能与 Live2D 核心模块完全解耦，可根据需求选择性启用。

## 📂 文件说明

&#8195;&#8195;项目采用模块化设计，分离基础渲染层与 AI 逻辑层。主要目录结构与各文件功能说明如下：
```text
live2d-widget-AIChat/
├── Core/                      # 基础渲染与交互层
│   ├── live2dcubismcore.js    # Live2D Cubism 官方核心 Web 库
│   ├── live2d-sdk.js          # Live2D 渲染与控制 SDK
│   ├── waifu-tips.js          # 看板娘主控制逻辑脚本
│   └── waifu.css              # 看板娘本体基础 UI 样式表
├── chatCore/                  # AI 聊天逻辑层
│   ├── waifu-chat.js          # AI 聊天核心脚本
│   └── waifu-chat.css         # AI 聊天窗口样式表
├── config/                    # 进阶配置文件目录
│   ├── model_list.json        # 模型列表与加载提示语配置
│   ├── waifu-chat.json        # AI 对话模块配置
│   └── waifu-tips.json        # 看板娘基础交互语料库
├── model/                     # moc3 模型资源存放目录
├── live2d.js                  # 项目前端总入口脚本
└── live2d.json                # 基础全局配置文件
```

## 🚀 前端部署

> [!TIP] 
> 该部分教程假设你已经有一个基于 Hexo 的博客，并且正在使用 Butterfly 主题。如果为其他主题请根据实际情况调整资源路径和注入方式。

```bash
cd 你的博客目录/source/
git clone git@github.com:LuoTian001/live2d-widget-AIChat.git live2d
```
&#8195;&#8195;在`_config.yml`博客配置文件下添加以下代码，排除 hexo 对 `live2d` 目录的渲染：
```yaml
skip_render: 
  - 'live2d/**'
```
&#8195;&#8195;在 `_config.butterfly.yml` 文件中，找到 `inject.bottom` 节点，加入以下代码：
```js
inject:
  bottom:
    - <script src="/live2d/live2d.js" defer></script>
```
&#8195;&#8195;同时确保你已经安装 `hexo-generator-search` 插件，并在 `_config.butterfly.yml` 中正确配置了 `search.path`。这是 AI RAG 检索功能的依赖：
```bash
cd 你的博客目录/
npm install hexo-generator-search --save
```
```yaml
search:
  use: local_search
  path: search.xml
  field: post
  content: false
  format: striptags
  limit: 1000

local_search:
  enable: true
```
&#8195;&#8195;重新部署`hexo clean && hexo g && hexo d`，访问博客后你应该能够看到看板娘已经成功加载，并且侧边工具栏中出现了新的“Chat”图标。点击它就可以打开 AI 聊天窗口了。

### 3.1 参数配置

#### 1. 基础配置 `live2d.json`

&#8195;&#8195;负责全局路径控制与基础挂件行为定义。

| 参数 | 说明 |
| --- | --- |
| `base.cdnPath` | 外部资源的 CDN 加速路径指向地址，默认为本仓库main分支 |
| `base.localPath` | 本地资源路径的相对或绝对地址，如果你按照前述教程进行了部署，则地址为`/live2d/`|
| `base.homePath` | 博客首页的路由地址，默认为 `/` |
| `tools` | 侧边工具栏启用的功能按钮标识数组<br>`chat`：核心交互工具，点击唤醒 AI 聊天窗口界面。<br>`hitokoto`：点击后看板娘将请求并展示一条随机的一言文本或毒鸡汤。<br>`express`：点击随机切换当前模型内置的特殊表情集。<br>`info`：点击跳转至博客默认的关于页面或站长信息页。<br>`quit`：点击后彻底隐藏并关闭看板娘挂件。|
| `drag.enable` | 是否开启看板娘拖拽功能，默认`false` |
| `drag.direction` | 允许拖拽的方向数组，`["x", "y"]`表示允许 x 方向和 y 方向拖拽 |
| `switchType` | 模型与材质的切换触发规则，默认为`order`顺序切换 |
| `chat.apiUrl` | 后端 AI 对话接口的默认请求路由地址，需替换为`https://你的博客域名/api/chat` |

#### 2. 进阶配置 `/config`

&#8195;&#8195;包含更详细的语料、模型列表与 AI 逻辑设置。

**`config/waifu-chat.json` (AI 对话配置)**

| 参数 | 说明 |
| --- | --- |
| `api.url` | 后端 AI 对话接口的请求路由，默认`/api/chat` |
| `ui.title` | 聊天窗口顶部栏显示的标题文本 |
| `ui.placeholder` | 底部消息输入框的占位引导提示文本 |
| `ui.errorMsg` | 后端接口响应异常或网络阻断时的原生错误提示语 |
| `ui.typingSpeed` | 模拟打字机动画的单字符输出延迟时间毫秒值，数值越大打字越慢，默认为`25` |
| `includeCodeBlocks` | 是否向 AI 提交文章中的代码块，关闭可节省 token，默认为`false` |
| `chat.storageKey` | 浏览器 LocalStorage 持久化存储对话历史记录的键名 |
| `chat.maxHistory` | 存储在本地的最大历史对话消息对象数量限制，默认为`20` |
| `chat.pageContextMaxLength` | **RAG 核心配置：** 抓取页面正文的最大字符截断长度，数值越高 RAG 检索越全面，但务必注意 deepseek 的单次请求 token 上限以及 token 消耗情况，默认为`3000` |
| `chat.pageContextSelector` | **RAG 核心配置：** 当前页面阅读器抓取的 DOM 目标选择器，默认为`#article-container`，如果你的博客未采用 Butterfly 主题或更改了文章容器的 ID/Class，请务必同步修改此字段 |
| `chat.searchXmlPath` | Hexo 全站索引文件路径用于全局知识库匹配，默认为`/search.xml` |
| `chat.welcomeMsg` | 访客首次打开聊天框时 AI 主动发送的第一条破冰消息 |
| `chat.welcomeOptions` | 预设快捷按钮数组包含显示文本与实际发送指令<br>`display`：按钮在界面上显示的文本内容<br>`send`：按钮实际发送给 AI 的指令内容，可设置多条 send 内容，会随机抽取一条发送 |
| `chat.systemPrompt` | 系统人设与输出约束提示词数组，如果需要分行显示，每条指令请用`,`隔开 |
| `chat.contextTemplate` | RAG 隐式上下文拼装模板对象规范化拼接格式，基本无需修改<br>`truncateMsg`：用于提示用户文章太长已产生截断 |

**`config/waifu-tips.json` (基础交互语料配置)**

| 参数 | 说明 |
| --- | --- |
| `mouseover` | 鼠标悬停在特定 DOM 元素上时触发的提示语配置<br>`selector`：指定触发提示语的 DOM 元素选择器，可以自定义 DOM 元素以触发不同交互<br>`text`：显示的提示语信息 |
| `click` | 鼠标点击特定 DOM 元素时触发的提示语配置 |
| `seasons` | 根据特定日期或节日触发的季节性提示语配置 |
| `time` | 根据当前时间段触发的日常问候提示语配置 |
| `message` | 包含控制台打开与文本复制等特殊事件的默认提示语 |

**`config/model_list.json` (模型加载配置)**

| 参数 | 说明 |
| --- | --- |
| `models` | 可用 Live2D 模型的目录名称数组 |
| `messages` | 对应模型加载完毕后显示的专属提示语数组 |

### 3.2 注意事项

- **AI 模块的低耦合说明**

&#8195;&#8195;AI 对话引擎被完整抽离在 `chatCore` 目录下，如果你不想开启 AI 功能，只需在`live2d.json`中将 `tools.chat` 删除即可，看板娘依然可以作为普通的 Live2D 挂件正常运行。

- **基础功能配置简化说明**

&#8195;&#8195;本项目在原有框架上对 Live2D 功能进行了一定程度的默认简化。如果你需要进一步自定义模型，例如自定义 `.exp3.json` 触发专属表情、为 `.motion3.json` 动作绑定口型与音频、或调整模型在 Canvas 画布中的 `scale` 缩放与 `translate` 坐标偏移量等，请务必参阅原项目的详细文档 👉 [live2d-widget-v3 使用说明](https://github.com/letere-gzj/live2d-widget-v3)。

- **RAG 容器匹配说明**

&#8195;&#8195;`waifu-chat.js` 中的本地阅读器默认通过 `#article-container` 选择器来提取当前页面的正文文本。如果你的 Hexo 博客未采用 Butterfly 主题，或者你在主题魔改中更改了文章主容器的 ID/Class，请务必在 `/config/waifu-chat.json` 中同步修改 `pageContextSelector` 字段。同时需检查你的站点根目录是否存在 `search.xml` 文件（由 `hexo-generator-search` 生成），并将其路径正确配置到 `searchXmlPath` 字段。

### 3.3 移动端适配

&#8195;&#8195;由于 Live2D 模型的交互特性和屏幕尺寸限制，本项目在移动端是禁用的。如果想在桌面端使用本项目且在移动端提供 AI 聊天功能，可结合我的另一个项目：[hexo-AIChat-Plugin](https://github.com/LuoTian001/hexo-AIChat-Plugin)。以下是双端配置教程：

**1. 部署 Live2D Widget with AI Chat**

&#8195;&#8195;按照前述教程部署本项目，确保桌面端能够正常显示看板娘和 AI 聊天功能。

**2. 部署 hexo-AIChat-Plugin**

&#8195;&#8195;在同一博客中部署 [hexo-AIChat-Plugin](https://github.com/LuoTian001/hexo-AIChat-Plugin) 项目，并确保桌面端和移动端都能正常访问 AI 聊天功能。为了严格验证有效性，建议在 bottom 中分别注入两个项目的入口脚本并进行测试。

**3. 配置双端注入脚本**

&#8195;&#8195;在 `博客根目录/source/js/` 下创建 `ai-manager.js`，并添加以下内容：
```js
(function() {
    function detectMobile() {
        const userAgentMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const screenWidthMatch = window.innerWidth <= 768;
        return userAgentMatch || screenWidthMatch;
    }
    // 动态创建 script
    const script = document.createElement('script');
    script.defer = true;

    if (detectMobile()) {
        // 移动端：加载 aichat-plugin.js
        script.src = '/aichat/aichat-plugin.js';
        console.log('[AI Manager] 检测到移动端，正在加载悬浮球 AI 助手...');
    } else {
        // 桌面端：加载 live2d.js
        script.src = '/live2d/live2d.js';
        console.log('[AI Manager] 检测到桌面端，正在加载 Live2D 看板娘...');
    }
    document.body.appendChild(script);
})();
```
&#8195;&#8195;在`_config.yml`中排除 hexo 对 `js` 目录的渲染：
```yaml
skip_render: 
  - 'js/**'
```
&#8195;&#8195;在 `inject.bottom` 节点加入以下代码，注意这里无需再引入 `live2d.js` 和 `aichat-plugin.js`：
```js
inject:
  bottom:
    - <script src="/js/ai-manager.js"></script>
```
&#8195;&#8195;重新部署博客后，桌面端将显示 Live2D 看板娘和 AI 聊天功能，而移动端将显示悬浮球 AI 助手，实现双端适配。

## ❤ 鸣谢与开源协议

&#8195;&#8195;本项目前端 AI 逻辑与 UI 由 [LuoTian](https://github.com/LuoTian001/) 开发。Live2D 的渲染底层框架基于以下开源项目，向这些作者表示感谢：

* [stevenjoezhang/live2d-widget](https://github.com/stevenjoezhang/live2d-widget) (Live2D 模型渲染与交互功能)
* [letere-gzj/live2d-widget-v3](https://github.com/letere-gzj/live2d-widget-v3) (在前者基础上增加对 moc3 模型的支持)
* [marked.js](https://marked.js.org/) (Markdown 解析引擎)

&#8195;&#8195;如果你喜欢这个项目，欢迎点个 Star ⭐ 支持一下！如果你有任何问题、建议或者想要贡献代码，欢迎提交 Issue 或 Pull Request。

&#8195;&#8195;本项目遵循 MIT 开源协议。
