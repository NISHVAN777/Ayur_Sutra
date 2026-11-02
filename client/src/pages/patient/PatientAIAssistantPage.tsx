import React, { useState, useEffect, useRef } from "react";
import { chatService } from "../../services/chatService";
import { ChatMessage } from "../../types";
import { Sparkles, Send, Bot, User, ShieldAlert } from "lucide-react";

const QUICK_PROMPTS = [
  "When is my next scheduled session?",
  "What is my current Panchakarma progress?",
  "What Pathya diet should I follow today?",
  "How can I manage post-therapy fatigue naturally?",
];

export const PatientAIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatService.getHistory().then((res) => {
      setMessages(res.messages);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    setInputMessage("");
    setIsLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      userId: "",
      role: "USER",
      message: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await chatService.sendMessage(text);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        res.userMessage,
        res.assistantMessage,
      ]);
    } catch (err: any) {
      const errorReply: ChatMessage = {
        id: `err_${Date.now()}`,
        userId: "",
        role: "ASSISTANT",
        message: "Namaste. I am currently unable to process your request. Please try again shortly.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-saffron-500" />
          AyurSutra Ayurveda AI Assistant
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Specialized Panchakarma care companion, classical diet guide, and verified personal schedule navigator.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Medical Safety Notice:</strong> AyurSutra AI provides authentic wellness insights, diet rules (Pathya), and your real clinic schedule. It does not diagnose diseases or change medical prescriptions.
        </div>
      </div>

      {/* Chat Window */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[550px] overflow-hidden">
        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-stone-50/40">
          {messages.length === 0 && (
            <div className="p-8 text-center text-xs text-stone-500">
              <div className="w-12 h-12 rounded-full bg-ayur-100 text-ayur-700 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-stone-900 font-serif text-sm">
                Namaste! How may I assist your Panchakarma journey today?
              </h4>
              <p className="mt-1">
                Ask about your upcoming session, therapy guidelines, or classical dietary recommendations.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === "USER" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "ASSISTANT" && (
                <div className="w-8 h-8 rounded-xl bg-ayur-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                  m.role === "USER"
                    ? "bg-ayur-700 text-white rounded-tr-none shadow-sm shadow-ayur-900/10"
                    : "bg-white text-stone-800 border border-stone-200 rounded-tl-none shadow-xs"
                }`}
              >
                {m.message}
              </div>

              {m.role === "USER" && (
                <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 text-xs text-stone-500 items-center">
              <div className="w-8 h-8 rounded-xl bg-ayur-700 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl border border-stone-200 text-stone-600 italic">
                AyurSutra AI is querying your authenticated therapy journey records...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Chips */}
        <div className="p-3 bg-white border-t border-stone-100 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-ayur-50 hover:text-ayur-800 rounded-xl text-stone-700 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-stone-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              placeholder="Ask about your sessions, diet (Pathya), or therapies..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-5 py-2.5 bg-ayur-700 text-white font-bold text-xs rounded-xl hover:bg-ayur-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
