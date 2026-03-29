let voice = null;
let ready = false;

export function hasSpeech() {
  return 'speechSynthesis' in window;
}

export function initSpeech() {
  return new Promise((resolve) => {
    if (!hasSpeech()) { resolve(false); return; }

    const tryFindVoice = () => {
      const voices = speechSynthesis.getVoices();
      voice = voices.find(v => v.lang === 'de-DE')
           || voices.find(v => v.lang.startsWith('de'))
           || null;
      ready = true;
      resolve(true);
    };

    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      tryFindVoice();
    } else {
      speechSynthesis.addEventListener('voiceschanged', tryFindVoice, { once: true });
      setTimeout(() => {
        if (!ready) tryFindVoice();
      }, 2000);
    }
  });
}

export function speak(word) {
  return new Promise((resolve) => {
    if (!hasSpeech()) { resolve(); return; }

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'de-DE';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    speechSynthesis.speak(utterance);
  });
}

export async function speakTwice(word) {
  await speak(word);
  await new Promise(r => setTimeout(r, 500));
  await speak(word);
}
