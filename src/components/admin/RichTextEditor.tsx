'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, List, ListOrdered, Heading, Code, Eye, 
  Sparkles, RotateCcw, AlignLeft 
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
}

export function cleanHtmlDescription(rawHtml: string): string {
  if (!rawHtml) return '';
  let clean = rawHtml;
  // Decode entities if encoded
  if (clean.includes('&lt;') && clean.includes('&gt;')) {
    clean = clean
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }
  // Remove data-path-to-node, id="p-rc_..." and other clutter
  clean = clean
    .replace(/\s+data-path-to-node="[^"]*"/gi, '')
    .replace(/\s+id="p-rc_[^"]*"/gi, '')
    .replace(/\s+class="[^"]*"/gi, '')
    .replace(/<span\s*>(\s*)<\/span>/gi, '')
    .replace(/<p\s*>(\s*)<\/p>/gi, '')
    .trim();

  return clean;
}

export function RichTextEditor({
  value,
  onChange,
  label = 'Detaylı Açıklama (Zengin İçerik)',
  placeholder = 'Ürün açıklaması, kumaş özellikleri, kalıp bilgisi...',
  rows = 6,
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync value into visual editor when switching tabs or external reset
  useEffect(() => {
    if (editorRef.current && activeTab === 'visual') {
      const currentHtml = editorRef.current.innerHTML;
      if (currentHtml !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, activeTab]);

  const handleVisualInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, arg?: string) => {
    if (activeTab !== 'visual') return;
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
      handleVisualInput();
    }
  };

  const handleCleanTags = () => {
    const cleaned = cleanHtmlDescription(value);
    onChange(cleaned);
    if (editorRef.current && activeTab === 'visual') {
      editorRef.current.innerHTML = cleaned;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[10px] font-normal text-slate-400 normal-case">(Zengin Metin / HTML)</span>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCleanTags}
            title="WooCommerce gereksiz etiketlerini ve data-node kodlarını temizle"
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-200 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-brand-500" />
            <span>Kodu Temizle</span>
          </button>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 text-[11px] ${
                activeTab === 'visual'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Görsel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-2.5 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 text-[11px] ${
                activeTab === 'code'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3 h-3" />
              <span>HTML Kodu</span>
            </button>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:border-brand-500 focus-within:bg-white transition-all shadow-inner">
        {/* Toolbar */}
        <div className="bg-slate-100/80 border-b border-slate-200 px-2.5 py-1.5 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => exec('bold')}
            disabled={activeTab !== 'visual'}
            className="p-1.5 hover:bg-white rounded text-slate-700 hover:text-slate-900 disabled:opacity-40 transition-colors"
            title="Kalın (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('italic')}
            disabled={activeTab !== 'visual'}
            className="p-1.5 hover:bg-white rounded text-slate-700 hover:text-slate-900 disabled:opacity-40 transition-colors"
            title="İtalik"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            disabled={activeTab !== 'visual'}
            className="p-1.5 hover:bg-white rounded text-slate-700 hover:text-slate-900 disabled:opacity-40 transition-colors"
            title="Madde İşaretli Liste"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            disabled={activeTab !== 'visual'}
            className="p-1.5 hover:bg-white rounded text-slate-700 hover:text-slate-900 disabled:opacity-40 transition-colors"
            title="Numaralı Liste"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h3>')}
            disabled={activeTab !== 'visual'}
            className="p-1.5 hover:bg-white rounded text-slate-700 hover:text-slate-900 disabled:opacity-40 transition-colors"
            title="Başlık (H3)"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<p>')}
            disabled={activeTab !== 'visual'}
            className="p-1.5 hover:bg-white rounded text-slate-700 hover:text-slate-900 disabled:opacity-40 transition-colors"
            title="Paragraf"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('removeFormat')}
            disabled={activeTab !== 'visual'}
            className="p-1.5 hover:bg-white rounded text-slate-700 hover:text-slate-900 disabled:opacity-40 transition-colors"
            title="Biçimlendirmeyi Temizle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Editor Content Area */}
        {activeTab === 'visual' ? (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleVisualInput}
            onBlur={handleVisualInput}
            data-placeholder={placeholder}
            className="min-h-[140px] p-3 text-xs text-slate-900 focus:outline-none leading-relaxed overflow-y-auto max-h-[360px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mb-1 [&>b]:font-bold"
          />
        ) : (
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-900 text-emerald-400 font-mono p-3 text-xs focus:outline-none leading-relaxed resize-y border-0 min-h-[140px]"
          />
        )}
      </div>
    </div>
  );
}
