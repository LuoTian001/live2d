// waifu-chat.js
class Live2DChat {
    constructor(config) {
        this.apiUrl = config.apiUrl || '/api/chat';
        this.clientUuid = config.clientUuid;
        this.showMessage = window.waifuShowMessage || console.log;
        this.storageKey = 'waifu_chat_history';
        this.maxHistory = 20; 
        this.blogIndex = [];
        // waifu-chat.js 修改片段
        this.systemPrompt = `你是本博客的看板娘小洛，性格俏皮、可爱且礼貌。请使用口语化、生动的中文与用户交流。
        【全局知识库】
        - 站长/主人：洛天 (luotian)
        - 博客框架与主题：Hexo + Butterfly
        - 博客域名：www.luotian.cyou / luotian001.github.io
        - AI对话框架：前端 waifu-tips.js 驱动 Live2D，后端 FastAPI 代理接入 DeepSeek 模型实现对话与 RAG 检索。

        【核心执行规则】
        1. 优先基于上下文：当系统提供“当前页面上下文”或“博客检索内容”时，必须优先基于这些信息准确作答，禁止杜撰。
        2. 支持开放式对话：允许且需要回答用户提出的任何通用问题（如编程、日常知识等），保持礼貌与耐心。
        3. 严格的排版与格式（最高优先级）：
        - 绝对禁止使用任何列表标号（如数字 1. 2. 3.、圆圈符号、破折号、星号等）进行分点作答。
        - 若有多个并列条目，必须使用完整的自然段落逐段展开。
        - 严禁滥用括号（）进行补充说明。需要解释的补充内容请直接融合在主谓宾结构中，或使用冒号（：）引出。
        - 必须使用标准 Markdown 语法输出（支持加粗、代码块），禁止输出删除线（~~）、下划线（<u>）、孤立换行符或原生 HTML 标签。
        - 引号使用英文引号，禁止使用中文引号。
        4. 长度控制：单次回答长度严格在 150 字以内，采用短句表述。`;

        this.initBlogIndex();
        this.initUI();
    }

    initUI() {
        // 定义 SVG 图标路径 (FontAwesome)
        const svgTrash = '<svg viewBox="0 0 448 512"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>';
        const svgExpand = '<svg viewBox="0 0 448 512"><path d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64v-64zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"/></svg>';
        const svgCompress = '<svg viewBox="0 0 448 512"><path d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V64zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H32zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V64zM320 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32v-64h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"/></svg>';
        const svgClose = '<svg viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>';

        const chatBoxHTML = `
            <div id="waifu-chat-box">
                <div class="waifu-chat-header">
                    <span style="font-size: 13px; font-weight: bold;">Relink 终端</span>
                    <div class="waifu-chat-tools">
                        <span id="waifu-chat-clear">${svgTrash}</span>
                        <span id="waifu-chat-max-btn">${svgExpand}</span>
                        <span id="waifu-chat-close">${svgClose}</span>
                    </div>
                </div>
                <div id="waifu-chat-history"></div>
                <div class="waifu-input-container">
                    <textarea id="waifu-chat-input" rows="1" placeholder="发送消息 (Enter发送, Shift+Enter换行)..."></textarea>
                </div>
            </div>
        `;
        document.getElementById("waifu").insertAdjacentHTML("beforeend", chatBoxHTML);
        
        this.chatBox = document.getElementById("waifu-chat-box");
        this.chatHistoryDOM = document.getElementById("waifu-chat-history");
        this.chatInput = document.getElementById("waifu-chat-input");

        this.renderHistory();

        // 窗口放大与缩小逻辑
        let isMaximized = false;
        const maxBtn = document.getElementById("waifu-chat-max-btn");
        maxBtn.addEventListener("click", () => {
            isMaximized = !isMaximized;
            this.chatBox.classList.toggle("waifu-chat-maximized", isMaximized);
            maxBtn.innerHTML = isMaximized ? svgCompress : svgExpand;
            maxBtn.title = isMaximized ? "缩小" : "放大";
            this.chatHistoryDOM.scrollTop = this.chatHistoryDOM.scrollHeight;
        });

        // 关闭窗口逻辑
        document.getElementById("waifu-chat-close").addEventListener("click", () => {
            this.toggle();
        });

        // 清空记忆逻辑
        document.getElementById("waifu-chat-clear").addEventListener("click", () => {
            localStorage.removeItem(this.storageKey);
            this.renderHistory();
        });

        // 输入框伸缩逻辑
        this.chatInput.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = (this.scrollHeight) + "px";
        });

        // 回车发送逻辑
        this.chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); 
                const text = this.chatInput.value.trim();
                if (text !== "") {
                    this.chatInput.value = '';
                    this.chatInput.style.height = "auto"; 
                    this.sendRequest(text);
                    this.initBoundsManagement();
                }
            }
        });
    }

    checkBounds() {
        if (!this.chatBox || this.chatBox.style.display === "none") return;
        const rect = this.chatBox.getBoundingClientRect();
        
        const trueLeft = rect.left - this.currentTranslateX;
        const trueRight = rect.right - this.currentTranslateX;
        const trueTop = rect.top - this.currentTranslateY;
        const trueBottom = rect.bottom - this.currentTranslateY;

        let targetX = 0;
        let targetY = 0;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (trueLeft < 10) targetX = 10 - trueLeft;
        else if (trueRight > vw - 10) targetX = vw - 10 - trueRight;

        if (trueTop < 10) targetY = 10 - trueTop;
        else if (trueBottom > vh - 10) targetY = vh - 10 - trueBottom;

        if (Math.abs(targetX - this.currentTranslateX) > 1 || Math.abs(targetY - this.currentTranslateY) > 1) {
            this.currentTranslateX = targetX;
            this.currentTranslateY = targetY;
            this.chatBox.style.transform = `translate(${targetX}px, ${targetY}px)`;
        }
    }

    initBoundsManagement() {
        this.currentTranslateX = 0;
        this.currentTranslateY = 0;

        window.addEventListener('resize', () => this.checkBounds());

        if (window.ResizeObserver) {
            const resObserver = new ResizeObserver(() => this.checkBounds());
            resObserver.observe(this.chatBox);
        }

        const waifuDOM = document.getElementById("waifu");
        if (waifuDOM) {
            const mutObserver = new MutationObserver(() => this.checkBounds());
            mutObserver.observe(waifuDOM, { attributes: true, attributeFilter: ['style'] });
        }
    }

    async initBlogIndex() {
        try {
            const res = await fetch('/search.json');
            this.blogIndex = await res.json();
        } catch (e) {
            console.warn("无法加载 search.json，RAG 功能降级。");
        }
    }

    searchLocalBlog(keyword) {
        if (!this.blogIndex.length) return "";
        const matched = this.blogIndex.filter(post => 
            (post.title && post.title.includes(keyword)) || 
            (post.content && post.content.includes(keyword))
        );
        if (matched.length === 0) return "";
        return matched.slice(0, 2).map(p => 
            `[标题: ${p.title}]\n内容: ${p.content.replace(/<[^>]+>/g, '').substring(0, 300)}...`
        ).join("\n\n");
    }

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        } catch (e) {
            return [];
        }
    }

    saveHistory(history, syncStorage = true) {
        if (history.length > this.maxHistory * 2) {
            history = history.slice(-(this.maxHistory * 2));
        }
        if (syncStorage) {
            // 剥离临时属性，确保存入本地的只有标准的纯净数据
            const storableHistory = history.filter(m => !m.isTemp).map(m => {
                let copy = { ...m };
                delete copy.isTyping; 
                return copy;
            });
            localStorage.setItem(this.storageKey, JSON.stringify(storableHistory));
        }
        this.renderHistory(history); 
    }

    // 重写历史记录渲染，过滤 System 提示词，并应用气泡样式
    renderHistory(currentHistory = null) {
        const history = currentHistory || this.getHistory();
        
        this.chatHistoryDOM.innerHTML = history
            .filter(msg => msg.role !== 'system') 
            .map(msg => {
                const isUser = msg.role === 'user';
                const msgClass = isUser ? 'waifu-msg-user' : 'waifu-msg-ai';
                const content = msg.displayContent || msg.content;
                
                let innerHTML = "";
                if (msg.isTemp) {
                    innerHTML = content;
                } else if (isUser) {
                    // 用户输入保持纯文本换行
                    innerHTML = content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
                } else {
                if (typeof marked !== 'undefined') {
                        let rawHTML = marked.parse(content);

                        rawHTML = rawHTML.replace(/>\n+</g, '><').replace(/\n+$/g, '');
                        
                        // 过滤包含全角空格、零宽字符的幽灵空白段落
                        rawHTML = rawHTML.replace(/<p>[\s\u200B-\u200D\uFEFF\xA0]*<\/p>/gi, '')
                                        .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
                        
                        const doc = new DOMParser().parseFromString(rawHTML, 'text/html');
                        innerHTML = doc.body.innerHTML;
                    } else {
                        innerHTML = content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
                    }
                }
                
                return `<div class="waifu-chat-msg ${msgClass}"><div class="waifu-chat-bubble">${innerHTML}</div></div>`;
            }).join('');
            
        this.chatHistoryDOM.scrollTop = this.chatHistoryDOM.scrollHeight;
    }

    async sendRequest(userText) {
        let history = this.getHistory();
        
        // 1. 【关键修复】只把用户纯净的提问存入历史，不存入冗长的博客文章
        history.push({ role: "user", content: userText, displayContent: userText });
        
        // 2. 压入 AI 等待加载动画
        history.push({ 
            role: "assistant", 
            content: '<div class="waifu-typing-dots"><span></span><span></span><span></span></div>',
            isTemp: true 
        });
        this.saveHistory(history, true); 

        // 3. 构建发送给 API 的消息数组
        const apiHistory = history.filter(m => !m.isTemp).map(m => ({ role: m.role, content: m.content }));

        const pageContext = this.getCurrentPageContext();
        const searchContext = this.searchLocalBlog(userText);
        let combinedContext = "";
        if (pageContext) combinedContext += `=== 用户当前阅读的页面 ===\n${pageContext}\n\n`;
        if (searchContext) combinedContext += `=== 博客全局检索结果 ===\n${searchContext}\n\n`;
        
        if (combinedContext) {
            let lastMsg = apiHistory[apiHistory.length - 1];
            lastMsg.content = `基于"当前阅读页面"或"全局检索"作答。补充上下文：\n${combinedContext}用户实际提问: ${userText}`;
        }

        const messages = [
            { role: "system", content: this.systemPrompt },
            ...apiHistory 
        ];

        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.clientUuid}` },
                body: JSON.stringify({ messages })
            });

            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            const data = await res.json();
            
            history = history.filter(m => !m.isTemp);
            
            // 【文本清洗管线】
            let fullAiReply = data.choices[0].message.content;
            // 1. 剥离可能存在的 DeepSeek 推理模型 <think> 标签
            fullAiReply = fullAiReply.replace(/<think>[\s\S]*?<\/think>/gi, '');
            // 2. 剥离零宽空白符等幽灵字符
            fullAiReply = fullAiReply.replace(/[\u200B-\u200D\uFEFF\r]/g, '');
            // 3. 将包含空格的伪空行转为纯换行，并将 3 个以上的连续换行强行压缩为 2 个
            fullAiReply = fullAiReply.replace(/\n[\s\u200B-\u200D\uFEFF\xA0]*\n/g, '\n\n').trim();

            history.push({ role: "assistant", content: "", isTyping: true }); 
            let charIndex = 0;
            const typingSpeed = 25; 
            
            const typeWriter = setInterval(() => {
                history[history.length - 1].content = fullAiReply.substring(0, charIndex + 1);
                this.saveHistory(history, false); 
                charIndex++;
                
                if (charIndex >= fullAiReply.length) {
                    clearInterval(typeWriter);
                    history[history.length - 1].isTyping = false; 
                    this.saveHistory(history, true); 
                    
                    let safeBubbleText = fullAiReply.replace(/```[\s\S]*?```/g, "[代码块已省略]"); 
                    safeBubbleText = safeBubbleText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    if (safeBubbleText.length > 50) safeBubbleText = safeBubbleText.substring(0, 50) + "...";
                    this.showMessage(safeBubbleText, 6000, 10);
                }
            }, typingSpeed);

        } catch (error) {
            console.error("AI Request Failed:", error);
            history = history.filter(m => !m.isTemp);
            history.pop(); 
            this.saveHistory(history, true);
            this.showMessage("大脑连接中断...", 4000, 10);
        }
    }

    toggle() {
        const isHidden = this.chatBox.style.display === "none" || this.chatBox.style.display === "";
        this.chatBox.style.display = isHidden ? "flex" : "none";
        if (isHidden) {
            this.renderHistory(); 
            this.chatInput.focus();
            // 确保渲染完成后立刻检测边界
            setTimeout(() => this.checkBounds(), 0); 
        }
    }

    getCurrentPageContext() {
        const articleDOM = document.getElementById('article-container');
        if (!articleDOM) return "";

        const titleDOM = document.querySelector('h1.post-title') || document.querySelector('title');
        const title = titleDOM ? titleDOM.innerText.trim() : "当前页面";

        const cloneDOM = articleDOM.cloneNode(true);
        const noiseElements = cloneDOM.querySelectorAll('script, style, noscript, iframe, svg, .post-outdate-notice, .clipboard-btn');
        noiseElements.forEach(el => el.remove());

        let pureText = cloneDOM.textContent.replace(/\s+/g, ' ').trim();
        
        const maxLength = 2000;
        if (pureText.length > maxLength) {
            pureText = pureText.substring(0, maxLength) + '\n\n[系统提示：页面内容过长已截断。请告知用户文章太长未尽的信息需自行阅读原文。]';
        }

        return `[当前页面标题: ${title}]\n[页面纯净正文]: ${pureText}`;
    }

}

window.Live2DChat = Live2DChat;