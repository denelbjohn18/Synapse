'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SRConstructor = new () => SpeechRecognition;

interface SpeechRecognitionResult {
  transcript: string;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: { [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type Options = {
  onTranscript: (text: string) => void;
};

export function useSpeechRecognition({ onTranscript }: Options) {
  const recRef = useRef<SpeechRecognition | null>(null);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: SRConstructor;
      webkitSpeechRecognition?: SRConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      onTranscript(text);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* noop */ }
      recRef.current = null;
    };
  }, [onTranscript]);

  const start = useCallback(() => {
    if (!recRef.current || recording) return;
    try {
      recRef.current.start();
      setRecording(true);
    } catch {
      // already started or denied
    }
  }, [recording]);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch { /* noop */ }
    setRecording(false);
  }, []);

  const toggle = useCallback(() => {
    if (recording) stop();
    else start();
  }, [recording, start, stop]);

  return { supported, recording, start, stop, toggle };
}
