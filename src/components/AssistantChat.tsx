"use client";

import React, { useState, useRef, useEffect } from "react";

export default function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string}[]>([
    { role: 'assistant', text: 'Hello! I am the CyneMora AI Assistant. Ask me anything about our features, Visual DNA, or the CyneMora 3.5 rendering pipeline!' }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playTTS = async (text: string) => {
    try {
      const res = await fetch("/api/assistant/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (err) {
      console.error("TTS Error:", err);
    }
  };

  const handleSend = async (messageText?: string) => {
    const userMsg = typeof messageText === 'string' ? messageText : input;
    if (!userMsg.trim() || isLoading) return;
    
    if (typeof messageText !== 'string') setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      const reply = data.reply || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      
      // Auto-play TTS for the response
      playTTS(reply);
      
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error connecting to the intelligence core.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      setIsRecording(false);
    } else {
      // Start recording
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

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
          background: 'var(--color-primary)', color: 'var(--color-text-primary)', border: 'none',
          borderRadius: '50%', width: '64px', height: '64px',
          boxShadow: '0 10px 25px rgba(167, 139, 250, 0.4)',
          cursor: 'pointer', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s'
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
      width: '380px', height: '500px', background: 'var(--color-surface-1)',
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-2xl)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(16px)'
    }}>
      <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-primary)' }}>CyneMora Assistant</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-success)' }}>● Online (GPT-5.4 mini)</p>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{ 
              background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-3)',
              color: 'var(--color-text-primary)', padding: '0.75rem 1rem', borderRadius: '1rem',
              borderBottomRightRadius: m.role === 'user' ? 0 : '1rem',
              borderBottomLeftRadius: m.role === 'assistant' ? 0 : '1rem',
              fontSize: '0.9rem', lineHeight: '1.5'
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--color-text-tertiary)', fontSize: '0.8rem', padding: '0.5rem' }}>
            Assistant is typing...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-glass)', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={toggleRecording}
          disabled={isLoading && !isRecording}
          style={{
            background: isRecording ? 'var(--color-error)' : 'var(--color-surface-2)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all var(--duration-fast)',
            animation: isRecording ? 'pulse-glow 1.5s infinite' : 'none'
          }}
          title={isRecording ? "Stop Recording" : "Start Voice Input"}
        >
          {isRecording ? "⏹" : "🎤"}
        </button>
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about CyneMora..."
          disabled={isRecording}
          style={{ flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', color: 'var(--color-text-primary)', outline: 'none' }}
        />
        <button 
          onClick={() => handleSend()}
          disabled={(!input.trim() && !isRecording) || isLoading}
          style={{ background: 'var(--color-primary)', color: 'var(--color-text-primary)', border: 'none', borderRadius: 'var(--radius-lg)', padding: '0 1rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
