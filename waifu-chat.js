// waifu-chat.js
class Live2DChat {
    constructor(config) {
        this.apiUrl = config.apiUrl || '/api/chat';
        this.clientUuid = config.clientUuid;
        this.showMessage = window.waifuShowMessage || console.log;
        this.storageKey = 'waifu_chat_history';
        this.maxHistory = 10; 
        this.blogIndex = [];
        this.systemPrompt = "你是博客的看板娘，语气傲娇可爱。请使用简短、口语化的中文回答。若上下文中包含博客内容，请基于博客内容解答。";

        this.initBlogIndex();
        this.initUI();
    }

    initUI() {
        // 使用 textarea 替代 input，并引入头部工具栏
        const chatBoxHTML = `
            <div id="waifu-chat-box">
                <div class="waifu-chat-header">
                    <span style="font-size: 13px; font-weight: bold;">神经链接端</span>
                    <span class="waifu-chat-btn" id="waifu-chat-clear">清空记忆</span>
                </div>
                <div id="waifu-chat-history"></div>
                <div class="chat-input-container">
                    <textarea id="waifu-chat-input" rows="1" placeholder="发送消息 (Enter发送, Shift+Enter换行)..."></textarea>
                </div>
            </div>
        `;
        document.getElementById("waifu").insertAdjacentHTML("beforeend", chatBoxHTML);
        
        this.chatBox = document.getElementById("waifu-chat-box");
        this.chatHistoryDOM = document.getElementById("waifu-chat-history");
        this.chatInput = document.getElementById("waifu-chat-input");

        this.renderHistory();

        // 事件1：自动伸缩输入框高度
        this.chatInput.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = (this.scrollHeight) + "px";
        });

        // 事件2：回车发送判定
        this.chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // 阻止默认换行
                const text = this.chatInput.value.trim();
                if (text !== "") {
                    this.chatInput.value = '';
                    this.chatInput.style.height = "auto"; // 重置高度
                    this.sendRequest(text);
                }
            }
        });

        // 事件3：清空历史记忆
        document.getElementById("waifu-chat-clear").addEventListener("click", () => {
            localStorage.removeItem(this.storageKey);
            this.renderHistory();
        });
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
                const msgClass = isUser ? 'user' : 'ai';
                const content = msg.displayContent || msg.content;
                // 转义基础的 HTML 实体防止 XSS，同时保留换行符
                const safeContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                return `<div class="chat-msg ${msgClass}"><div class="chat-bubble">${safeContent}</div></div>`;
            }).join('');
            
        // 强制滚动到底部
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
        // 此处不再使用 block，改为 flex 以匹配 CSS 的排版需求
        this.chatBox.style.display = isHidden ? "flex" : "none";
        if (isHidden) {
            this.renderHistory(); 
            this.chatInput.focus();
        }
    }
}

window.Live2DChat = Live2DChat;