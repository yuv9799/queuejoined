import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmergency } from '../../context/EmergencyContext.jsx';
import { sendAssistantMessage } from '../../services/ai.js';
import {
  createSpeechRecognition,
  prepareSpeechRecognition,
  speechErrorMessage,
} from '../../services/speech.js';
import AIChatButton from './AIChatButton.jsx';
import AIMessage from './AIMessage.jsx';

const QUICK_ACTIONS = [
  { label: '🎟️ Book a Token', message: 'I want to book a token' },
  { label: '🔎 Track My Token', message: 'Where is my token?' },
  { label: '👨‍⚕️ Find a Doctor', message: 'Find available doctors' },
  { label: '🏥 Departments', message: 'Show departments' },
  { label: '🚨 Emergency Help', emergency: true },
  { label: '❓ How it works', message: 'How does KIMS Queue work?' },
];

function sessionKey() {
  try {
    const existing = sessionStorage.getItem('kims_ai_session_id');
    if (existing) return existing;
    const id = globalThis.crypto?.randomUUID?.()
      || `s${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('kims_ai_session_id', id);
    return id;
  } catch {
    return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

function displayMessage(message) {
  const text = String(message || '');
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 10 && /^[+\d\s().-]+$/.test(text)) {
    return `+91 ******${digits.slice(-4)}`;
  }
  return text;
}

function storedTokenId() {
  try {
    return localStorage.getItem('kims_active_token_id');
  } catch {
    return null;
  }
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const { openEmergency } = useEmergency();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: 'Hi, I’m the KIMS Queue Assistant. I can help you find a department, book a token, or track one you already have.',
  }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('intent');
  const [voiceLanguage, setVoiceLanguage] = useState('en-IN');
  const [listening, setListening] = useState(false);
  const [voicePreparing, setVoicePreparing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const voiceErrorRef = useRef(false);
  const sessionIdRef = useRef(null);
  const transcriptRef = useRef('');
  const cancelledVoiceRef = useRef(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sendRef = useRef(null);

  if (!sessionIdRef.current) sessionIdRef.current = sessionKey();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const sendMessage = useCallback(async (message, action = null) => {
    const text = String(message || '').trim();
    if ((!text && !action) || busy) return;
    if (text) {
      setMessages((current) => [...current, { role: 'user', text: displayMessage(text) }]);
      setDraft('');
    } else if (action?.label) {
      setMessages((current) => [...current, { role: 'user', text: action.label }]);
    }
    setBusy(true);
    setVoiceError('');
    try {
      const result = await sendAssistantMessage({
        message: text,
        action,
        sessionId: sessionIdRef.current,
        tokenId: storedTokenId(),
      });
      if (result.token?.id) {
        try {
          localStorage.setItem('kims_active_token_id', String(result.token.id));
          localStorage.setItem('kims_active_token_number', String(result.token.tokenCode || result.token.token_number || ''));
        } catch {
          setVoiceError('Token generated, but this browser could not save it on this device. Keep the token number shown here.');
        }
      } else if (result.token?.token?.id) {
        try {
          localStorage.setItem('kims_active_token_id', String(result.token.token.id));
          localStorage.setItem('kims_active_token_number', String(result.token.token.token_code || result.token.token.token_number || ''));
        } catch {
          setVoiceError('Token found, but this browser could not save it on this device.');
        }
      }
      setStep(result.state?.step || 'intent');
      setMessages((current) => [...current, { role: 'assistant', ...result }]);
    } catch {
      const confirmationUnverified = action?.type === 'CONFIRM_BOOKING';
      setMessages((current) => [...current, {
        role: 'assistant',
        text: confirmationUnverified
          ? 'I couldn’t verify whether your token request completed. Please check My Token or ask hospital staff before trying again.'
          : 'I’m having trouble connecting right now. You can still use the Token Kiosk or My Token page.',
        actions: [
          { type: 'OPEN_STATUS', label: 'Open My Token' },
          { type: 'OPEN_KIOSK', label: 'Open Token Kiosk' },
        ],
      }]);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  sendRef.current = sendMessage;

  function navigateToToken(tokenId) {
    if (tokenId) {
      try {
        localStorage.setItem('kims_active_token_id', String(tokenId));
      } catch {
        // The status page can still use the query-string token id.
      }
      navigate(`/status?id=${encodeURIComponent(tokenId)}`);
    } else {
      navigate('/status');
    }
    setOpen(false);
  }

  function handleAction(action) {
    switch (action.type) {
      case 'OPEN_EMERGENCY':
        setOpen(false);
        openEmergency();
        return;
      case 'OPEN_STATUS':
      case 'TRACK_TOKEN':
        navigateToToken(action.data?.tokenId || storedTokenId());
        return;
      case 'OPEN_LIVE':
        navigate('/live');
        setOpen(false);
        return;
      case 'OPEN_DEPARTMENTS':
        navigate('/departments');
        setOpen(false);
        return;
      case 'OPEN_KIOSK':
        navigate('/');
        setOpen(false);
        window.setTimeout(() => document.getElementById('token')?.scrollIntoView({ behavior: 'smooth' }), 80);
        return;
      case 'BOOK_TOKEN':
        sendMessage('I would like to book a token');
        return;
      default:
        sendMessage('', action);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(draft);
  }

  async function startVoice() {
    setVoiceError('');
    voiceErrorRef.current = false;
    transcriptRef.current = '';
    cancelledVoiceRef.current = false;
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setVoiceError('Voice input requires a secure page. Open KIMS Queue over HTTPS or localhost.');
      return;
    }
    setVoicePreparing(true);
    let speechSetup;
    try {
      speechSetup = await prepareSpeechRecognition(voiceLanguage);
    } catch (error) {
      setVoiceError(speechErrorMessage(error));
      setVoicePreparing(false);
      return;
    }
    setVoicePreparing(false);
    if (speechSetup.status === 'unsupported') {
      setVoiceError(speechErrorMessage('NotSupportedError'));
      return;
    }
    if (speechSetup.status === 'downloading') {
      setVoiceError('Chrome is preparing the speech language pack. Wait briefly, then tap the microphone again.');
      return;
    }
    if (speechSetup.status === 'installed') {
      setVoiceError('Offline speech recognition is ready. Tap the microphone again to start listening.');
      return;
    }
    const recognition = createSpeechRecognition(voiceLanguage, {
      onStart: () => {
        voiceErrorRef.current = false;
        setListening(true);
      },
      onResult: (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
        }
        if (finalText.trim()) transcriptRef.current = `${transcriptRef.current} ${finalText}`.trim();
        setDraft(transcriptRef.current);
      },
      onError: (event) => {
        if (event.error !== 'aborted') {
          voiceErrorRef.current = true;
          const message = speechErrorMessage(event);
          setVoiceError(speechSetup.processLocally
            ? `On-device speech recognition failed. ${message}`
            : message);
        }
      },
      onEnd: () => {
        setListening(false);
        const recognized = transcriptRef.current.trim();
        if (!cancelledVoiceRef.current && recognized) {
          sendRef.current?.(recognized);
        } else if (!cancelledVoiceRef.current && !voiceErrorRef.current) {
          setVoiceError(speechErrorMessage('no-speech'));
        }
      },
    }, { processLocally: speechSetup.processLocally });
    if (!recognition) {
      setVoiceError(speechErrorMessage('NotSupportedError'));
      return;
    }
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      voiceErrorRef.current = true;
      setVoiceError(speechErrorMessage(error));
    }
  }

  function cancelVoice() {
    cancelledVoiceRef.current = true;
    transcriptRef.current = '';
    setDraft('');
    recognitionRef.current?.abort();
    setListening(false);
  }

  return (
    <>
      <AIChatButton open={open} onClick={() => setOpen(true)} />
      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="kims-ai-title"
          className="fixed inset-0 z-40 flex flex-col bg-white sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(650px,calc(100vh-8rem))] sm:w-[min(410px,calc(100vw-3rem))] sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-2xl"
          style={{ borderColor: '#E1EAF2' }}
        >
          <header className="flex shrink-0 items-center justify-between border-b px-4 py-3" style={{ borderColor: '#E1EAF2' }}>
            <div>
              <h2 id="kims-ai-title" className="font-bold" style={{ color: '#102A43' }}>KIMS AI Assistant</h2>
              <p className="text-xs" style={{ color: '#6B8198' }}><span className="mr-1 text-emerald-500">●</span>Ready to help</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-slate-100"
              aria-label="Close KIMS AI Assistant"
            >
              ×
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto bg-[#F5F9FC] p-3.5" aria-live="polite" aria-relevant="additions">
              {messages.map((item, index) => (
                <AIMessage key={`${item.role}-${index}`} item={item} onAction={handleAction} />
              ))}
              {busy && (
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border bg-white px-4 py-3 text-sm" style={{ borderColor: '#E1EAF2', color: '#6B8198' }} role="status">
                  <span className="animate-pulse">● ● ●</span> Checking KIMS Queue…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {step === 'intent' && !busy && (
              <div className="flex shrink-0 gap-2 overflow-x-auto border-t px-3 py-2" style={{ borderColor: '#E1EAF2' }}>
                {QUICK_ACTIONS.map((quick) => (
                  <button
                    key={quick.label}
                    type="button"
                    className="shrink-0 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-50"
                    style={{ borderColor: '#E1EAF2', color: '#075A9F' }}
                    onClick={() => quick.emergency ? handleAction({ type: 'OPEN_EMERGENCY' }) : sendMessage(quick.message)}
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
            )}

            <div className="shrink-0 border-t bg-white px-3 py-2.5" style={{ borderColor: '#E1EAF2' }}>
              {listening && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs" style={{ color: '#075A9F' }}>
                  <span><span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />Listening…</span>
                  <span className="flex gap-3">
                    <button type="button" className="font-semibold underline" onClick={() => recognitionRef.current?.stop()}>Stop</button>
                    <button type="button" className="font-semibold underline" onClick={cancelVoice}>Cancel</button>
                  </span>
                </div>
              )}
              {voiceError && <p className="mb-2 text-xs text-rose-600" role="status">{voiceError}</p>}
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSubmit(event);
                    }
                  }}
                  className="input min-h-11 max-h-28 flex-1 resize-none !py-2.5"
                  placeholder="Type a message…"
                  aria-label="Message KIMS AI Assistant"
                  maxLength={1000}
                  disabled={busy || listening}
                />
                <div className="flex shrink-0 flex-col gap-1">
                  <select
                    className="rounded-lg border bg-white px-1 py-1 text-[10px]"
                    style={{ borderColor: '#E1EAF2' }}
                    aria-label="Voice recognition language"
                    value={voiceLanguage}
                    onChange={(event) => setVoiceLanguage(event.target.value)}
                  >
                    <option value="en-IN">English</option>
                    <option value="hi-IN">Hindi / Hinglish</option>
                  </select>
                  <button
                    type="button"
                    onClick={listening ? () => recognitionRef.current?.stop() : startVoice}
                    disabled={busy || voicePreparing}
                    className="flex h-9 items-center justify-center rounded-lg border px-2 text-base disabled:opacity-50"
                    style={{ borderColor: '#E1EAF2', color: listening ? '#E50914' : '#075A9F' }}
                    aria-label={listening ? 'Stop voice input' : voicePreparing ? 'Preparing voice input' : 'Start voice input'}
                  >
                    {voicePreparing ? '…' : '🎤'}
                  </button>
                </div>
                <button type="submit" className="btn-primary !min-h-11 !px-3" disabled={busy || !draft.trim() || listening}>
                  Send
                </button>
              </form>
              <p className="mt-2 text-center text-[10px]" style={{ color: '#6B8198' }}>
                For hospital navigation only — not medical advice. For emergencies, use Emergency Help.
              </p>
              <p className="mt-1 text-center text-[10px]" style={{ color: '#6B8198' }}>
                Voice uses on-device recognition when available; otherwise Chrome may use its speech service.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
