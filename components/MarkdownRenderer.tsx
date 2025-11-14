import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from './icons/Icons';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="relative my-2">
      <div className="bg-gray-900 dark:bg-black text-gray-400 text-xs px-4 py-1 rounded-t-md flex justify-between items-center">
        <span>{language || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center space-x-1 text-gray-400 hover:text-white">
          {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
          <span className="text-xs">{isCopied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none"><code>{code}</code></pre>
    </div>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const renderContent = () => {
    const parts = content.split(/(```[\w-]*\n[\s\S]*?\n```)/g);

    return parts.map((part, index) => {
      const codeBlockMatch = part.match(/```([\w-]*)\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        const [, language, code] = codeBlockMatch;
        return <CodeBlock key={index} language={language} code={code.trim()} />;
      }
      
      const lines = part.split('\n');
      let isList = false;

      return (
        <div key={index} className="markdown-content">
          {lines.map((line, lineIndex) => {
             // Handle lists
            if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
              const listContent = <li key={lineIndex} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(line.trim().substring(2)) }} />;
              if (!isList) {
                isList = true;
                return <ul key={`ul-${lineIndex}`}>{listContent}</ul>;
              }
              return listContent;
            } else {
              isList = false;
            }

            // Handle paragraphs and other text
            if (line.trim() === '') return null;
            return <p key={lineIndex} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(line) }} />;
          })}
        </div>
      );
    });
  };
  
  const parseInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code
  };

  return <>{renderContent()}</>;
};

export default MarkdownRenderer;
