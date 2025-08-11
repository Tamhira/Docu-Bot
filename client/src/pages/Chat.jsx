import { useState, useRef, useEffect } from "react";
import axios from "axios";

function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const chatRef = useRef(null);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const res = await axios.post("http://localhost:5000/api/docs/ask", {
                question: input.trim(),
            });

            const botMessage = {
                role: "bot",
                content: res.data.answer || "No response",
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: "bot", content: "Sorry, I couldn't process that request." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        chatRef.current?.scrollTo({
            top: chatRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);

    return (
        // Adjust the height based on your navbar height (example: 64px for Tailwind h-16)
        <div className="bg-[#0B1620] flex flex-col h-[calc(100vh-65px)]">
            {/* Welcome */}
            <div className="text-center py-6 flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">Welcome to the Chatbot</h1>
                <p className="text-gray-400">
                    Start chatting with our AI assistant. Type your message below and click send.
                </p>
            </div>

            {/* Chat Area */}
           <div ref={chatRef} className="flex-1 overflow-y-auto flex justify-center">
  <div className="w-4/5 px-6 space-y-6">
    {messages.map((msg, i) => (
      <div
        key={i}
        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
      >
        {/* AI Assistant */}
        {msg.role === "bot" && (
          <>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-600 mr-2 flex-shrink-0 self-start mt-6">
              <img
                src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
                alt="Bot"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 mb-1">AI Assistant</span>
              <div className="px-4 py-2 rounded-lg text-white max-w-xs bg-gray-700 break-words whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </>
        )}

        {/* User */}
        {msg.role === "user" && (
          <>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-400 mb-1">Tamhi</span>
              <div className="px-4 py-2 rounded-lg text-white max-w-xs bg-blue-600 break-words whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-600 ml-2 flex-shrink-0 self-start mt-6">
              <img
                src="https://i.pravatar.cc/300?u=user"
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
          </>
        )}
      </div>
    ))}

    {loading && (
      <div className="text-gray-400 text-sm">AI Assistant is typing...</div>
    )}
  </div>
</div>


            {/* Input */}
            <div className="flex justify-center p-4 border-t border-gray-700 flex-shrink-0">
                <div className="flex w-4/5"> {/* 80% width */}
                    <input
                        type="text"
                        placeholder="Type your message..."
                        className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading}
                        className="ml-3 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                    >
                        {loading ? "..." : "Send"}
                    </button>
                </div>
            </div>

        </div>
    );
}

export default Chat;
