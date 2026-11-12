import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface MessageComposerProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  isGenerating?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  disabled = false,
  isGenerating = false,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && !isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled, isGenerating]);

  // Auto-resize textarea height up to 160px
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting || disabled || isGenerating) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSend(trimmed);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = content.length;
  const isTooLong = charCount > 5000;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 shadow-sm focus-within:border-[var(--brand-primary)] transition-all">
      <textarea
        ref={textareaRef}
        rows={1}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={
          isGenerating
            ? 'OpsPilot is generating response...'
            : 'Ask OpsPilot AI anything... (Enter to send, Shift+Enter for new line)'
        }
        disabled={disabled || isGenerating}
        className="w-full resize-none bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none max-h-40 overflow-y-auto leading-relaxed"
      />

      <div className="flex items-center justify-between border-t border-[var(--border-default)]/60 pt-2 px-2 text-[10px] text-[var(--text-tertiary)]">
        <div>
          <span className={isTooLong ? 'text-red-500 font-semibold' : ''}>
            {charCount.toLocaleString()} / 5,000 characters
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            disabled={!content.trim() || isSubmitting || disabled || isGenerating || isTooLong}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-3 py-1 text-xs"
          >
            {isSubmitting || isGenerating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
