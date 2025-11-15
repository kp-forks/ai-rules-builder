import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { usePromptsStore } from '../../store/promptsStore';
import { downloadAllPromptsAsZip } from '../../services/prompt-library/downloadService';
import { Tooltip } from '../ui/Tooltip';

export const DownloadAllButton: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { prompts, collections, segments, preferredLanguage, activeOrganization } =
    usePromptsStore();

  const handleDownload = async () => {
    if (prompts.length === 0 || isDownloading) {
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      await downloadAllPromptsAsZip(
        prompts,
        collections,
        segments,
        preferredLanguage,
        activeOrganization?.name,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download prompts';
      setError(errorMessage);
      console.error('Download error:', err);

      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  const isDisabled = prompts.length === 0 || isDownloading;

  // Determine tooltip content
  let tooltipContent: string;
  if (error) {
    tooltipContent = error;
  } else if (isDownloading) {
    tooltipContent = 'Preparing download...';
  } else if (prompts.length === 0) {
    tooltipContent = 'No prompts to download';
  } else {
    tooltipContent = `Download all ${prompts.length} prompt${prompts.length === 1 ? '' : 's'} as ZIP`;
  }

  return (
    <Tooltip content={tooltipContent} position="bottom">
      <button
        onClick={handleDownload}
        disabled={isDisabled}
        className={`
          px-3 py-1 rounded-md flex items-center gap-2 text-sm transition-colors duration-200
          ${
            error
              ? 'bg-red-700 text-white hover:bg-red-600'
              : isDisabled
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-700 text-white hover:bg-indigo-600 cursor-pointer'
          }
        `}
        aria-label="Download all prompts"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>Download All</span>
      </button>
    </Tooltip>
  );
};

export default DownloadAllButton;
