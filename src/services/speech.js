const SPEECH_ERROR_MESSAGES = {
  'not-allowed': 'Microphone access is blocked for this site. Allow microphone access in Chrome site settings, then try again.',
  'service-not-allowed': 'Chrome blocked its speech recognition service. Check browser microphone permissions and try again.',
  network: 'Chrome could not reach its speech recognition service. Check your internet connection, then try again.',
  'audio-capture': 'No microphone is available. Connect or enable a microphone, then try again.',
  'language-not-supported': 'Speech recognition does not support this language here. Switch between English and Hindi / Hinglish.',
  'no-speech': 'I didn’t hear anything. Check your microphone and try speaking again.',
  aborted: 'Voice input was stopped.',
};

function recognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function speechErrorMessage(error) {
  const code = typeof error === 'string' ? error : error?.error || error?.name;
  if (SPEECH_ERROR_MESSAGES[code]) return SPEECH_ERROR_MESSAGES[code];
  if (code === 'NotAllowedError' || code === 'SecurityError') {
    return SPEECH_ERROR_MESSAGES['not-allowed'];
  }
  if (code === 'InvalidStateError') {
    return 'Voice input is already running. Stop it before starting another recording.';
  }
  if (code === 'NotSupportedError') {
    return 'Voice input isn’t supported by this browser. Please type your request instead.';
  }
  return 'Voice input couldn’t start. Check that this page is open over HTTPS or localhost and that Chrome can access a microphone.';
}

export async function prepareSpeechRecognition(language) {
  const SpeechRecognition = recognitionConstructor();
  if (!SpeechRecognition) return { status: 'unsupported' };
  if (typeof SpeechRecognition.available !== 'function'
    || typeof SpeechRecognition.install !== 'function') {
    return { status: 'ready', processLocally: false };
  }

  const options = { langs: [language], processLocally: true };
  const availability = await SpeechRecognition.available(options);
  if (availability === 'available') {
    return { status: 'ready', processLocally: true };
  }
  if (availability === 'downloading') return { status: 'downloading' };
  if (availability === 'downloadable') {
    const installed = await SpeechRecognition.install(options);
    return installed
      ? { status: 'installed' }
      : { status: 'ready', processLocally: false };
  }
  return { status: 'ready', processLocally: false };
}

export function createSpeechRecognition(language, handlers, { processLocally = false } = {}) {
  const SpeechRecognition = recognitionConstructor();
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = language || 'en-IN';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  if ('processLocally' in recognition) recognition.processLocally = processLocally;
  recognition.onstart = handlers.onStart;
  recognition.onresult = handlers.onResult;
  recognition.onerror = handlers.onError;
  recognition.onend = handlers.onEnd;
  return recognition;
}
