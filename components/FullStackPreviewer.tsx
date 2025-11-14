import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { DownloadIcon, EyeIcon, EyeSlashIcon } from './icons/Icons';

interface FullStackPreviewerProps {
  code: string;
}

const FullStackPreviewer: React.FC<FullStackPreviewerProps> = ({ code }) => {
  const [showCode, setShowCode] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg mt-2">
      <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Live Preview</h4>
        <iframe
          srcDoc={code}
          title="Website Preview"
          className="w-full h-64 sm:h-96 rounded-md border border-gray-300 dark:border-gray-500 bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-b-lg flex items-center justify-end space-x-2">
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 rounded-md border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
        >
          <DownloadIcon className="w-4 h-4" />
          <span>Download HTML</span>
        </button>
        <button
          onClick={() => setShowCode(!showCode)}
          className="flex items-center space-x-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 rounded-md border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
        >
          {showCode ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          <span>{showCode ? 'Hide Code' : 'Show Code'}</span>
        </button>
      </div>
      {showCode && (
        <div className="p-2 sm:p-4 border-t border-gray-200 dark:border-gray-600">
          <MarkdownRenderer content={'```html\n' + code + '\n```'} />
        </div>
      )}
    </div>
  );
};

export default FullStackPreviewer;
