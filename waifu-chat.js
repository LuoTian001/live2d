// waifu-chat.js
class Live2DChat {
    constructor(config) {
        this.apiUrl = config.apiUrl || '/api/chat';
        this.clientUuid = config.clientUuid;
        // 获取 waifu-tips.js 暴露的气泡提示函数
        this.showMessage = window.waifuShowMessage || console.log;
        this.storageKey = 'waifu_chat_history';
        this.maxHistory = 10; // 保留最近 10 条有效对话 (20条消息)
        this.blogIndex = [];
        this.systemPrompt = "你是博客的看板娘，语气傲娇可爱。请使用简短、口语化的中文回答。若上下文中包含博客内容，请基于博客内容解答。";

        this.initBlogIndex();
        this.initUI();
    }

    initUI() {
        // 构建 UI DOM
        const chatBoxHTML = `
            <div id="waifu-chat-box" style="display: none; position: absolute; bottom: 320px; left: 0; width: 280px; background: rgba(255,255,255,0.95); border-radius: 8px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 999; backdrop-filter: blur(4px);">
                <div id="waifu-chat-history" style="height: 180px; overflow-y: auto; font-size: 13px; margin-bottom: 8px; color: #333; scrollbar-width: thin;"></div>
                <input type="text" id="waifu-chat-input" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; outline: none; font-size: 13px;" placeholder="与看板娘对话 (Enter 发送)...">
            </div>
        `;
        document.getElementById("waifu").insertAdjacentHTML("beforeend", chatBoxHTML);
        
        this.chatBox = document.getElementById("waifu-chat-box");
        this.chatHistoryDOM = document.getElementById("waifu-chat-history");
        this.chatInput = document.getElementById("waifu-chat-input");

        this.renderHistory();

        // 绑定回车事件
        this.chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && this.chatInput.value.trim() !== "") {
                const text = this.chatInput.value.trim();
                this.chatInput.value = '';
                this.sendRequest(text);
            }
        });
    }

    async initBlogIndex() {
        // 请求 Hexo 搜索插件生成的 search.json
        try {
            const res = await fetch('/search.json');
            this.blogIndex = await res.json();
        } catch (e) {
            console.warn("无法加载 search.json，RAG 功能降级为纯对话。");
        }
    }

    searchLocalBlog(keyword) {
        if (!this.blogIndex.length) return "";
        // 简单关键词匹配
        const matched = this.blogIndex.filter(post => 
            (post.title && post.title.includes(keyword)) || 
            (post.content && post.content.includes(keyword))
        );
        if (matched.length === 0) return "";
        
        // 截取前两篇匹配文章的内容片段，限制长度防止超 Token
        return matched.slice(0, 2).map(p => 
            `[博客标题: ${p.title}]\n内容: ${p.content.replace(/<[^>]+>/g, '').substring(0, 300)}...`
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
        // 截断历史，防止超过 maxHistory
        if (history.length > this.maxHistory * 2) {
            history = history.slice(-(this.maxHistory * 2));
        }
        localStorage.setItem(this.storageKey, JSON.stringify(history));
        this.renderHistory();
    }

    renderHistory() {
        const history = this.getHistory();
        this.chatHistoryDOM.innerHTML = history.map(msg => {
            const isUser = msg.role === 'user';
            const align = isUser ? 'text-align: right;' : 'text-align: left;';
            const color = isUser ? 'color: #007bff;' : 'color: #e83e8c;';
            const sender = isUser ? '你' : '看板娘';
            return `<div style="${align} margin-bottom: 6px;"><span style="${color} font-weight: bold;">${sender}:</span> ${msg.displayContent || msg.content}</div>`;
        }).join('');
        this.chatHistoryDOM.scrollTop = this.chatHistoryDOM.scrollHeight;
    }

    async sendRequest(userText) {
        let history = this.getHistory();
        
        // 1. 查找博客上下文
        const context = this.searchLocalBlog(userText);
        
        // 2. 构造前端展示与实际发给 API 的 Payload
        // 由于不想把冗长的 context 显示在聊天框里，使用 displayContent 记录纯净文本
        let apiContent = userText;
        if (context) {
            apiContent = `参考博客上下文:\n${context}\n\n用户提问: ${userText}`;
        }
        
        history.push({ role: "user", content: apiContent, displayContent: userText });
        this.saveHistory(history);
        this.showMessage("正在思考中...", 3000, 10);

        // 3. 构建发给大模型的完整 Message 数组
        const messages = [
            { role: "system", content: this.systemPrompt },
            // 清理 displayContent，仅发送标准 OpenAI 格式
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
            
            // 调用 waifu-tips 的气泡显示结果
            this.showMessage(aiReply, 6000, 10);
            
        } catch (error) {
            console.error(error);
            this.showMessage("网络通讯故障或服务器限流，无法连接到大脑...", 4000, 10);
            // 失败时移除用户刚才发送的消息
            history.pop();
            this.saveHistory(history);
        }
    }

    toggle() {
        const isHidden = this.chatBox.style.display === "none";
        this.chatBox.style.display = isHidden ? "block" : "none";
        if (isHidden) this.chatInput.focus();
    }
}

// 挂载到全局
window.Live2DChat = Live2DChat;