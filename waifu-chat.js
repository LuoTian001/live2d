// waifu-chat.js
class Live2DChat {
    constructor(config) {
        // 允许外部传入 JSON 路径，默认为同目录下的 waifu-chat.json
        this.configUrl = config.configUrl || '/waifu-chat.json'; 
        
        // 允许直接从 JS 传入覆盖 API 配置 (兼容旧逻辑)
        this.apiUrlOverride = config.apiUrl;
        this.clientUuidOverride = config.clientUuid;
        
        this.showMessage = window.waifuShowMessage || console.log;
        this.blogIndex = [];

        // 异步初始化
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.initBlogIndex();
        this.initUI();
    }

    async loadConfig() {
        try {
            const timestamp = new Date().getTime();
            const res = await fetch(`${this.configUrl}?t=${timestamp}`);
            if (!res.ok) throw new Error('Config file not found');
            const extConfig = await res.json();
            this.applyConfig(extConfig);
        } catch (e) {
            console.warn("无法加载 waifu-chat.json，将使用内置默认配置...", e);
            this.applyConfig({}); 
        }
    }

    applyConfig(cfg) {
        this.apiUrl = this.apiUrlOverride || cfg?.api?.url || '/api/chat';
        this.clientUuid = this.clientUuidOverride || cfg?.api?.uuid || '';

        this.ui = Object.assign({
            title: "Relink 终端",
            placeholder: "发送消息 (Enter发送, Shift+Enter换行)...",
            errorMsg: "大脑连接中断...",
            typingSpeed: 25
        }, cfg?.ui || {});

        this.chatCfg = Object.assign({
            storageKey: "waifu_chat_history",
            maxHistory: 20,
            searchJsonPath: "/search.json",
            contextTemplate: {
                pageContextTitle: "=== 用户当前阅读的页面 ===",
                searchContextTitle: "=== 博客全局检索结果 ===",
                instruction: "基于\"当前阅读页面\"或\"全局检索\"作答。补充上下文：",
                userQuestion: "用户实际提问:",
                truncateMsg: "[系统提示：页面内容过长已截断。请告知用户文章太长未尽的信息需自行阅读原文。]"
            }
        }, cfg?.chat || {});

        // 核心修复：支持将 JSON 中的 Prompt 数组重新组装为带有换行符的完整字符串
        const rawPrompt = cfg?.chat?.systemPrompt;
        const defaultPrompt = "你是本博客的看板娘小洛，性格俏皮、可爱且礼貌。请使用口语化、生动的中文与用户交流。"; // 兜底
        
        if (Array.isArray(rawPrompt)) {
            this.systemPrompt = rawPrompt.join('\n');
        } else if (typeof rawPrompt === 'string') {
            this.systemPrompt = rawPrompt;
        } else {
            this.systemPrompt = defaultPrompt;
        }

        this.storageKey = this.chatCfg.storageKey;
        this.maxHistory = this.chatCfg.maxHistory;
    }

    initUI() {
        // 定义 SVG 图标路径 (FontAwesome)
        const svgTrash = '<svg viewBox="0 0 448 512"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>';
        const svgExpand = '<svg viewBox="0 0 448 512"><path d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64v-64zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"/></svg>';
        const svgCompress = '<svg viewBox="0 0 448 512"><path d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V64zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H32zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V64zM320 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32v-64h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"/></svg>';
        const svgClose = '<svg viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>';

        // 注入来自配置文件的文本
        const chatBoxHTML = `
            <div id="waifu-chat-box">
                <div class="waifu-chat-header">
                    <span style="font-size: 13px; font-weight: bold;">${this.ui.title}</span>
                    <div class="waifu-chat-tools">
                        <span id="waifu-chat-clear">${svgTrash}</span>
                        <span id="waifu-chat-max-btn">${svgExpand}</span>
                        <span id="waifu-chat-close">${svgClose}</span>
                    </div>
                </div>
                <div id="waifu-chat-history"></div>
                <div class="waifu-input-container">
                    <textarea id="waifu-chat-input" rows="1" placeholder="${this.ui.placeholder}"></textarea>
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
            // 从配置中读取 search.json 的路径
            const res = await fetch(this.chatCfg.searchJsonPath);
            this.blogIndex = await res.json();
        } catch (e) {
            console.warn(`无法加载 ${this.chatCfg.searchJsonPath}，RAG 功能降级。`);
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
            const storableHistory = history.filter(m => !m.isTemp).map(m => {
                let copy = { ...m };
                delete copy.isTyping; 
                return copy;
            });
            localStorage.setItem(this.storageKey, JSON.stringify(storableHistory));
        }
        this.renderHistory(history); 
    }

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
                    innerHTML = content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
                } else {
                    if (typeof marked !== 'undefined') {
                        let rawHTML = marked.parse(content);
                        rawHTML = rawHTML.replace(/>\n+</g, '><').replace(/\n+$/g, '');
                        rawHTML = rawHTML.replace(/<p>[\s\u200B-\u200D\uFEFF\xA0]*<\/p>/gi, '')
                                        .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
                        const doc = new DOMParser().parseFromString(rawHTML, 'text/html');
                        doc.querySelectorAll('a').forEach(a => {
                            a.setAttribute('target', '_blank');
                            a.setAttribute('rel', 'noopener noreferrer');
                            let href = a.getAttribute('href') || '';
                            let text = a.textContent || '';
                            const invalidSuffixRegex = /([，。！？；：、“””’）\u4e00-\u9fa5]+)$/;
                            const textMatch = text.match(invalidSuffixRegex);
                            let decodedHref = href;
                            
                            try { decodedHref = decodeURIComponent(href); } catch (e) {}
                            const hrefMatch = decodedHref.match(invalidSuffixRegex);
                            
                            if (textMatch || hrefMatch) {
                                const suffix = textMatch ? textMatch[1] : hrefMatch[1];
                                a.textContent = text.replace(invalidSuffixRegex, '');
                                try {
                                    if (decodedHref.match(invalidSuffixRegex)) {
                                        a.setAttribute('href', encodeURI(decodedHref.replace(invalidSuffixRegex, '')));
                                    }
                                } catch (e) {
                                    a.setAttribute('href', href.replace(invalidSuffixRegex, ''));
                                }
                                a.insertAdjacentText('afterend', suffix);
                            }
                        });
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
        
        history.push({ role: "user", content: userText, displayContent: userText });
        
        history.push({ 
            role: "assistant", 
            content: '<div class="waifu-typing-dots"><span></span><span></span><span></span></div>',
            isTemp: true 
        });
        this.saveHistory(history, true); 

        const apiHistory = history.filter(m => !m.isTemp).map(m => ({ role: m.role, content: m.content }));

        const pageContext = this.getCurrentPageContext();
        const searchContext = this.searchLocalBlog(userText);
        let combinedContext = "";
        
        // 动态读取模板文字
        const ct = this.chatCfg.contextTemplate;
        if (pageContext) combinedContext += `${ct.pageContextTitle}\n${pageContext}\n\n`;
        if (searchContext) combinedContext += `${ct.searchContextTitle}\n${searchContext}\n\n`;
        
        if (combinedContext) {
            let lastMsg = apiHistory[apiHistory.length - 1];
            lastMsg.content = `${ct.instruction}\n${combinedContext}${ct.userQuestion} ${userText}`;
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
            
            let fullAiReply = data.choices[0].message.content;
            fullAiReply = fullAiReply.replace(/<think>[\s\S]*?<\/think>/gi, '');
            fullAiReply = fullAiReply.replace(/[\u200B-\u200D\uFEFF\r]/g, '');
            fullAiReply = fullAiReply.replace(/\n[\s\u200B-\u200D\uFEFF\xA0]*\n/g, '\n\n').trim();

            history.push({ role: "assistant", content: "", isTyping: true }); 
            let charIndex = 0;
            // 从配置读取打字速度
            const typingSpeed = this.ui.typingSpeed; 
            
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
            // 从配置读取错误提示
            this.showMessage(this.ui.errorMsg, 4000, 10);
        }
    }

    toggle() {
        // 防止 JSON 未加载完用户就点击按钮
        if (!this.chatBox) {
            this.showMessage("正在建立神经链接，请稍后再试...", 3000, 10);
            return;
        }
        
        const isHidden = this.chatBox.style.display === "none" || this.chatBox.style.display === "";
        this.chatBox.style.display = isHidden ? "flex" : "none";
        if (isHidden) {
            this.renderHistory(); 
            this.chatInput.focus();
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
            // 从配置读取截断提示文字
            pureText = pureText.substring(0, maxLength) + '\n\n' + this.chatCfg.contextTemplate.truncateMsg;
        }

        return `[当前页面标题: ${title}]\n[页面纯净正文]: ${pureText}`;
    }

}

window.Live2DChat = Live2DChat;