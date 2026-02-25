// waifu-chat.js
class Live2DChat {
    constructor(config) {
        this.apiUrl = config.apiUrl || '/api/chat';
        this.clientUuid = config.clientUuid;
        this.showMessage = window.waifuShowMessage || console.log;
        this.storageKey = 'waifu_chat_history';
        this.maxHistory = 10; 
        this.blogIndex = [];
        // waifu-chat.js 修改片段
        this.systemPrompt = `你是博客的看板娘，语气傲娇可爱。请使用简短、口语化的中文回答。
        【博客全局知识库】
        - 博客框架：Hexo
        - 博客主题：Butterfly
        - 域名：www.luotian.cyou / luotian001.github.io
        - 核心功能：前端使用 waifu-tips.js 驱动 Live2D，通过 FastAPI 代理接入 DeepSeek 大模型实现对话与页面检索。
        【严格约束规则】
        1. 当用户询问关于博客的基本信息时，必须严格参照【博客全局知识库】作答，严禁编造其它框架（如 Hugo、WordPress 等）。
        2. 若上下文中包含博客文章内容，请基于博客内容解答。
        3. 遇到知识库与上下文中均未提及的问题，必须直接回答“不知道”，严禁私自脑补、杜撰或猜测。`;

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

    saveHistory(history) {
        if (history.length > this.maxHistory * 2) {
            history = history.slice(-(this.maxHistory * 2));
        }
        localStorage.setItem(this.storageKey, JSON.stringify(history));
        this.renderHistory();
    }

    // 重写历史记录渲染，过滤 System 提示词，并应用气泡样式
    renderHistory() {
        const history = this.getHistory();
        
        this.chatHistoryDOM.innerHTML = history
            .filter(msg => msg.role !== 'system') 
            .map(msg => {
                const isUser = msg.role === 'user';
                const msgClass = isUser ? 'waifu-msg-user' : 'waifu-msg-ai';
                const content = msg.displayContent || msg.content;
                
                let innerHTML = "";
                if (isUser) {
                    // 用户输入纯文本：安全转义并保留换行
                    innerHTML = content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
                } else {
                    // AI 回复：使用 marked.js 解析 Markdown
                    if (typeof marked !== 'undefined') {
                        // 兼容 marked v4+ 版本语法
                        innerHTML = marked.parse(content).trim();
                    } else {
                        innerHTML = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    }
                }
                return `<div class="waifu-chat-msg ${msgClass}"><div class="waifu-chat-bubble">${innerHTML}</div></div>`;
            }).join('');
        this.chatHistoryDOM.scrollTop = this.chatHistoryDOM.scrollHeight;
    }

    async sendRequest(userText) {
        let history = this.getHistory();
        const context = this.searchLocalBlog(userText);
        
        let apiContent = userText;
        if (context) {
            apiContent = `参考博客上下文:\n${context}\n\n用户提问: ${userText}`;
        }
        
        history.push({ role: "user", content: apiContent, displayContent: userText });
        this.saveHistory(history);
        this.showMessage("正在思考中...", 3000, 10);

        const messages = [
            { role: "system", content: this.systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content })) 
        ];

        try {
            const res = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.clientUuid}`
                },
                body: JSON.stringify({ messages })
            });

            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            
            const data = await res.json();
            const aiReply = data.choices[0].message.content;

            history.push({ role: "assistant", content: aiReply });
            this.saveHistory(history);
            
            this.showMessage(aiReply, 6000, 10);
            
        } catch (error) {
            this.showMessage("网络通讯故障或被限流...", 4000, 10);
            history.pop(); // 移除失败的提问
            this.saveHistory(history);
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
}

window.Live2DChat = Live2DChat;