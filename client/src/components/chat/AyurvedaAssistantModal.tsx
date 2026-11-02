import React, { useState, useEffect, useRef } from "react";
import { chatService } from "../../services/chatService";
import { ChatMessage } from "../../types";
import { Sparkles, Send, Bot, User, X, ShieldAlert } from "lucide-react";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface AyurvedaAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  "When is my next session?",
  "What diet (Pathya) should I follow during Basti therapy?",
  "How should I prepare for Shirodhara?",
  "What lifestyle rules support my Agni after Panchakarma?",
];

export const AyurvedaAssistantModal: React.FC<AyurvedaAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatService.getHistory().then((res) => {
        setMessages(res.messages);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (messageToSend?: string) => {
    const text = messageToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    setInputMessage("");
    setIsLoading(true);

    // Optimistic user message
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-ayur-800 to-ayur-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-saffron-500 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm font-serif">AyurSutra AI Assistant</h3>
                <p className="text-[11px] text-ayur-200">
                  Ayurveda, Panchakarma & Schedule Guide
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ayur-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="p-3 bg-amber-50 border-b border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p leading-tight>
              <strong>Ayurvedic Guidance:</strong> General wellness & schedule support. Does not diagnose or prescribe.
            </p>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-stone-50/50">
            {messages.length === 0 && (
              <div className="p-6 text-center text-xs text-stone-500">
                <div className="w-12 h-12 rounded-full bg-ayur-100 text-ayur-700 flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-6 h-6" />
                </div>
                <p className="font-bold text-stone-800 font-serif text-sm">
                  Namaste! How may I guide your Panchakarma today?
                </p>
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
                  <div className="w-7 h-7 rounded-lg bg-ayur-700 text-white flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                    m.role === "USER"
                      ? "bg-ayur-700 text-white rounded-tr-none shadow-sm shadow-ayur-900/10"
                      : "bg-white text-stone-800 border border-stone-200 rounded-tl-none shadow-xs"
                  }`}
                >
                  {m.message}
                </div>

                {m.role === "USER" && (
                  <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 text-xs text-stone-500 items-center">
                <div className="w-7 h-7 rounded-lg bg-ayur-700 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white px-3 py-2 rounded-xl border border-stone-200 text-stone-600 italic">
                  AyurSutra AI is reviewing your therapy records...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Chips */}
          <div className="p-3 bg-white border-t border-stone-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
              Suggested Questions
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-ayur-50 hover:text-ayur-800 rounded-lg text-stone-700 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-stone-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about your sessions, diet, or therapies..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-ayur-700 text-white hover:bg-ayur-800 disabled:opacity-50 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
