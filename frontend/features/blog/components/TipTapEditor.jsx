'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Youtube from '@tiptap/extension-youtube';
import { useCallback, useRef } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showError } from '@/lib/utils/toast';

// ── Toolbar button ─────────────────────────────────────────────────────────
function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={[
        'px-2 py-1 rounded text-sm font-medium transition-colors select-none',
        active
          ? 'bg-[#45A735] text-white'
          : 'text-[#3a3a3a] hover:bg-[#F2F9F1] hover:text-[#26472B]',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-[#e0e0e0] mx-1 self-center" />;
}

// ── Main editor ────────────────────────────────────────────────────────────
export default function TipTapEditor({ value = '', onChange, placeholder = 'Write your content here…', minHeight = 400 }) {
  const fileRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Youtube.configure({ width: '100%', height: 360 }),
      CharacterCount,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-4',
        style: `min-height:${minHeight}px`,
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url  = window.prompt('URL', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkToWordIfUnselected().unsetLink().run(); return; }
    editor.chain().focus().extendMarkToWordIfUnselected().setLink({ href: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('YouTube URL');
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }, [editor]);

  const handleImageUpload = useCallback(async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await staffApi.post('/blog/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      editor?.chain().focus().setImage({ src: res.data.url }).run();
    } catch (e) {
      showError('Image upload failed: ' + (e?.response?.data?.message || e.message));
    }
  }, [editor]);

  if (!editor) return null;

  const chars = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();

  return (
    <div className="border border-[#D0E8CB] rounded-xl overflow-hidden bg-white">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-[#F8FCF7] border-b border-[#D0E8CB] sticky top-0 z-10">
        {/* History */}
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">↩</Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">↪</Btn>
        <Divider />

        {/* Headings */}
        {[1, 2, 3, 4].map(n => (
          <Btn key={n} onClick={() => editor.chain().focus().toggleHeading({ level: n }).run()}
               active={editor.isActive('heading', { level: n })} title={`Heading ${n}`}>
            H{n}
          </Btn>
        ))}
        <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">¶</Btn>
        <Divider />

        {/* Inline styles */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()}       active={editor.isActive('bold')}          title="Bold"><b>B</b></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()}     active={editor.isActive('italic')}        title="Italic"><i>I</i></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}  active={editor.isActive('underline')}     title="Underline"><u>U</u></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()}     active={editor.isActive('strike')}        title="Strikethrough"><s>S</s></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()}       active={editor.isActive('code')}          title="Inline code">&lt;/&gt;</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()}  active={editor.isActive('highlight')}     title="Highlight">H</Btn>
        <Divider />

        {/* Alignment */}
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()}    active={editor.isActive({ textAlign: 'left' })}    title="Align left">⬅</Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()}  active={editor.isActive({ textAlign: 'center' })}  title="Center">⬛</Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()}   active={editor.isActive({ textAlign: 'right' })}   title="Align right">➡</Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">≡</Btn>
        <Divider />

        {/* Lists */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}   active={editor.isActive('bulletList')}   title="Bullet list">• —</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}  active={editor.isActive('orderedList')}  title="Numbered list">1 —</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}   active={editor.isActive('blockquote')}   title="Blockquote">"</Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()}    active={editor.isActive('codeBlock')}    title="Code block">{ }</Btn>
        <Divider />

        {/* Media & link */}
        <Btn onClick={setLink}         active={editor.isActive('link')}  title="Insert / edit link">🔗</Btn>
        <Btn onClick={addYoutube}      title="Embed YouTube">▶</Btn>
        <Btn onClick={() => fileRef.current?.click()} title="Insert image">🖼</Btn>
        <input
          ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { handleImageUpload(e.target.files[0]); e.target.value = ''; }}
        />
        <Divider />

        {/* Horizontal rule */}
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">—</Btn>
        <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">✕</Btn>
      </div>

      {/* ── Content area ────────────────────────────────────────────── */}
      <EditorContent editor={editor} />

      {/* ── Footer: char + word count ────────────────────────────────── */}
      <div className="flex justify-end px-4 py-1.5 bg-[#F8FCF7] border-t border-[#D0E8CB] text-xs text-[#888]">
        {words} words · {chars} chars
      </div>
    </div>
  );
}
