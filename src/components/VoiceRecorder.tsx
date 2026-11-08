import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, X, Download, Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const VoiceRecorder: React.FC = () => {
  const isAudioRecorderOpen = useAppStore((state) => state.isAudioRecorderOpen);
  const toggleAudioRecorder = useAppStore((state) => state.toggleAudioRecorder);
  const activePageIndex = useAppStore((state) => state.activePageIndex);
  const pageAudioMap = useAppStore((state) => state.pageAudioMap);
  const savePageAudio = useAppStore((state) => state.savePageAudio);
  const deletePageAudio = useAppStore((state) => state.deletePageAudio);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const currentAudioUrl = pageAudioMap[activePageIndex];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            savePageAudio(activePageIndex, reader.result);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('No se pudo acceder al micrófono. Por favor permite los permisos de audio.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!currentAudioUrl) return;

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(currentAudioUrl);
      audioElementRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.src = currentAudioUrl;
      audioElementRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleDownload = () => {
    if (!currentAudioUrl) return;
    const a = document.createElement('a');
    a.href = currentAudioUrl;
    a.download = `audio_pagina_${activePageIndex + 1}.webm`;
    a.click();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isAudioRecorderOpen) return null;

  return (
    <div className="absolute top-16 right-2 sm:right-6 z-40 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-3.5 text-slate-100 text-xs w-72 max-w-[calc(100vw-1rem)] animate-fadeIn">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-semibold text-xs">
          <Volume2 className="w-4 h-4 text-purple-400" />
          <span>Nota de Voz (Pág. {activePageIndex + 1})</span>
        </div>
        <button
          onClick={toggleAudioRecorder}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="py-3 flex flex-col items-center gap-3">
        {isRecording ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-red-400 font-mono text-sm animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Grabando: {formatTime(recordSeconds)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold shadow transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Detener</span>
            </button>
          </div>
        ) : currentAudioUrl ? (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between bg-slate-800 rounded-lg p-2 border border-slate-700">
              <button
                onClick={togglePlayback}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-all"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDownload}
                  title="Descargar audio"
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deletePageAudio(activePageIndex)}
                  title="Eliminar grabación"
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 text-center">Audio guardado y sincronizado con esta página.</span>
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold shadow transition-all"
          >
            <Mic className="w-4 h-4" />
            <span>Iniciar Grabación</span>
          </button>
        )}
      </div>
    </div>
  );
};

