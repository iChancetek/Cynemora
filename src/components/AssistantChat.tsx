"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  actions?: QuickAction[];
}

interface QuickAction {
  label: string;
  icon: string;
  href?: string;
  prompt?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Text to Video", icon: "⚡", href: "/dashboard/flow" },
  { label: "Image to Video", icon: "🖼️", href: "/dashboard/image-to-video" },
  { label: "AI Avatars", icon: "🤖", href: "/dashboard/avatars" },
  { label: "Podcast Studio", icon: "🎙️", href: "/dashboard/podcast" },
];

const SUGGESTED_PROMPTS = [
  "What can CyneMora do?",
  "How does Text-to-Video work?",
  "Tell me about AI Avatars",
  "How do I dub a video?",
  "What is Visual DNA?",
  "How does the podcast studio work?",
  "Can I translate my videos?",
  "What AI agents are available?",
];

export default function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Welcome to CyneMora! 🎬 I'm your AI production assistant. Ask me about any feature — Text-to-Video, AI Avatars, Dubbing, Podcasts, or the full creative suite.",
      timestamp: new Date(),
      actions: QUICK_ACTIONS,
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [typingText, setTypingText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const playTTS = async (text: string) => {
    try {
      const res = await fetch("/api/assistant/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.substring(0, 500) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (err) {
      // TTS is non-critical, silently fail
    }
  };

  const typewriterEffect = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      let i = 0;
      const interval = setInterval(() => {
        setTypingText(text.substring(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setTypingText("");
          resolve();
        }
      }, 12);
    });
  }, []);

  const handleSend = async (messageText?: string) => {
    const userMsg = typeof messageText === 'string' ? messageText : input;
    if (!userMsg.trim() || isLoading) return;

    if (typeof messageText !== 'string') setInput("");
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      const reply = data.reply || "I'm sorry, I couldn't process that request.";

      // Determine contextual actions based on content
      const contextActions = getContextualActions(reply, userMsg);

      // Typewriter effect
      await typewriterEffect(reply);

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: reply,
        timestamp: new Date(),
        actions: contextActions,
      }]);

      playTTS(reply);

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Connection to intelligence core interrupted. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getContextualActions = (reply: string, query: string): QuickAction[] => {
    const combined = (reply + " " + query).toLowerCase();
    const actions: QuickAction[] = [];

    if (combined.includes("text to video") || combined.includes("text-to-video") || combined.includes("flow")) {
      actions.push({ label: "Open Text to Video", icon: "⚡", href: "/dashboard/flow" });
    }
    if (combined.includes("image to video") || combined.includes("image-to-video") || combined.includes("animate")) {
      actions.push({ label: "Open Image to Video", icon: "🖼️", href: "/dashboard/image-to-video" });
    }
    if (combined.includes("avatar") || combined.includes("digital twin") || combined.includes("presenter")) {
      actions.push({ label: "Open AI Avatars", icon: "🤖", href: "/dashboard/avatars" });
    }
    if (combined.includes("dub") || combined.includes("multilingual") || combined.includes("voice clon")) {
      actions.push({ label: "Open AI Dubbing", icon: "🌍", href: "/dashboard/dubbing" });
    }
    if (combined.includes("podcast") || combined.includes("audio show")) {
      actions.push({ label: "Open Podcast Studio", icon: "🎙️", href: "/dashboard/podcast" });
    }
    if (combined.includes("face swap") || combined.includes("face replace")) {
      actions.push({ label: "Open Face Swap", icon: "🎭", href: "/dashboard/face-swap" });
    }
    if (combined.includes("translat") || combined.includes("locali")) {
      actions.push({ label: "Open Video Translator", icon: "🌐", href: "/dashboard/translator" });
    }
    if (combined.includes("audio to video") || combined.includes("audio-to-video")) {
      actions.push({ label: "Open Audio to Video", icon: "🎵", href: "/dashboard/audio-to-video" });
    }
    if (combined.includes("ppt") || combined.includes("presentation") || combined.includes("powerpoint")) {
      actions.push({ label: "Open PPT to Video", icon: "📊", href: "/dashboard/ppt-to-video" });
    }
    if (combined.includes("visual dna") || combined.includes("character")) {
      actions.push({ label: "Open Visual DNA", icon: "🧬", href: "/dashboard/visual-dna" });
    }

    return actions.slice(0, 3);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append("audio", new File([audioBlob], "recording.webm"));

          setIsLoading(true);
          try {
            const res = await fetch("/api/assistant/transcribe", {
              method: "POST",
              body: formData,
            });
            const data = await res.json();
            if (data.text) {
              handleSend(data.text);
            }
          } catch (e) {
            console.error("Transcription error", e);
          } finally {
            setIsLoading(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic access denied", err);
      }
    }
  };

  const clearHistory = () => {
    setMessages([{
      role: 'assistant',
      text: "Chat cleared! 🎬 How can I help you with CyneMora?",
      timestamp: new Date(),
      actions: QUICK_ACTIONS,
    }]);
    setShowSuggestions(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // FAB button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        id="assistant-fab"
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          color: 'white', border: 'none',
          borderRadius: '50%', width: '64px', height: '64px',
          boxShadow: '0 10px 30px rgba(167, 139, 250, 0.4), 0 0 60px rgba(167, 139, 250, 0.15)',
          cursor: 'pointer', fontSize: '1.6rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          animation: 'float 4s ease-in-out infinite',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(167, 139, 250, 0.5), 0 0 80px rgba(167, 139, 250, 0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(167, 139, 250, 0.4), 0 0 60px rgba(167, 139, 250, 0.15)'; }}
      >
        💬
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
      width: '420px', height: '600px',
      background: 'var(--color-surface-1)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-2xl)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 80px rgba(167, 139, 250, 0.08)',
      backdropFilter: 'blur(20px) saturate(180%)',
      animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(56,189,248,0.05))',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0,
          }}>🎬</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>CyneMora Assistant</h3>
            <p style={{ margin: 0, fontSize: '10px', color: 'var(--color-success)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>● Online — GPT-5.4 mini</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <button onClick={clearHistory} title="Clear chat"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '14px', padding: '6px', borderRadius: 'var(--radius-sm)', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >🗑️</button>
          <button onClick={() => setIsOpen(false)} title="Close"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '18px', padding: '6px', borderRadius: 'var(--radius-sm)', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >×</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
            animation: 'fadeInUp 0.3s ease forwards',
          }}>
            {/* Timestamp */}
            <div style={{
              fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px',
              textAlign: m.role === 'user' ? 'right' : 'left',
              fontFamily: 'var(--font-mono)',
            }}>
              {m.role === 'assistant' ? '🎬 CyneMora' : 'You'} • {formatTime(m.timestamp)}
            </div>

            {/* Bubble */}
            <div style={{
              background: m.role === 'user'
                ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                : 'var(--color-surface-2)',
              color: 'var(--color-text-primary)',
              padding: '0.75rem 1rem',
              borderRadius: '1rem',
              borderBottomRightRadius: m.role === 'user' ? '4px' : '1rem',
              borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '1rem',
              fontSize: '0.85rem', lineHeight: '1.6',
              border: m.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
              boxShadow: m.role === 'user' ? '0 4px 12px rgba(167,139,250,0.2)' : 'none',
            }}>
              {m.text}
            </div>

            {/* Contextual Actions */}
            {m.actions && m.actions.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px',
              }}>
                {m.actions.map((action, aIdx) => (
                  <a
                    key={aIdx}
                    href={action.href}
                    onClick={(e) => {
                      if (action.prompt) {
                        e.preventDefault();
                        handleSend(action.prompt);
                      }
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px',
                      background: 'rgba(167,139,250,0.1)',
                      border: '1px solid rgba(167,139,250,0.2)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px', fontWeight: 600,
                      color: 'var(--color-primary-light)',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-primary)';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(167,139,250,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(167,139,250,0.2)';
                      e.currentTarget.style.color = 'var(--color-primary-light)';
                    }}
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typewriter effect */}
        {typingText && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
            <div style={{
              fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px',
              fontFamily: 'var(--font-mono)',
            }}>🎬 CyneMora • typing...</div>
            <div style={{
              background: 'var(--color-surface-2)', color: 'var(--color-text-primary)',
              padding: '0.75rem 1rem', borderRadius: '1rem', borderBottomLeftRadius: '4px',
              fontSize: '0.85rem', lineHeight: '1.6',
              border: '1px solid var(--color-border)',
            }}>
              {typingText}<span style={{ animation: 'pulse-glow 1s infinite', color: 'var(--color-primary)' }}>▎</span>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !typingText && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '0.75rem 1rem',
            background: 'var(--color-surface-2)',
            borderRadius: '1rem', borderBottomLeftRadius: '4px',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{
              display: 'flex', gap: '6px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--color-primary)',
                  animation: `pulse-glow 1.4s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested prompts */}
      {showSuggestions && messages.length <= 1 && (
        <div style={{
          padding: '0 1rem 0.5rem',
          display: 'flex', flexWrap: 'wrap', gap: '6px',
        }}>
          {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              style={{
                padding: '5px 10px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px', fontWeight: 500,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary-light)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--color-border)',
        background: 'rgba(17,17,24,0.5)',
        display: 'flex', gap: '0.5rem', alignItems: 'center',
      }}>
        {/* Mic */}
        <button
          onClick={toggleRecording}
          disabled={isLoading && !isRecording}
          id="assistant-mic-btn"
          style={{
            background: isRecording ? 'var(--color-error)' : 'var(--color-surface-2)',
            color: isRecording ? 'white' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '50%',
            width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, fontSize: '16px',
            transition: 'all 0.2s',
            animation: isRecording ? 'pulse-glow 1.5s infinite' : 'none',
          }}
          title={isRecording ? "Stop Recording" : "Voice Input"}
        >
          {isRecording ? "⏹" : "🎤"}
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={isRecording ? "Listening..." : "Ask about any CyneMora feature..."}
          disabled={isRecording}
          id="assistant-input"
          style={{
            flex: 1,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.6rem 0.75rem',
            color: 'var(--color-text-primary)',
            outline: 'none',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-body)',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />

        {/* Send */}
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && !isRecording) || isLoading}
          id="assistant-send-btn"
          style={{
            background: input.trim() ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' : 'var(--color-surface-2)',
            color: input.trim() ? 'white' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            padding: '0.6rem 1rem',
            cursor: input.trim() ? 'pointer' : 'default',
            fontWeight: 600, fontSize: '0.85rem',
            transition: 'all 0.2s',
            boxShadow: input.trim() ? '0 4px 12px rgba(167,139,250,0.2)' : 'none',
          }}
        >
          ↗
        </button>
      </div>
    </div>
  );
}
