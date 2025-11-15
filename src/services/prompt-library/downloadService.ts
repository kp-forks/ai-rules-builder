import { type Zippable, zipSync } from 'fflate';
import type { Prompt, PromptCollection, PromptSegment } from '../../store/promptsStore';
import { getLocalizedTitle, getLocalizedBody, type Language } from './language';

/**
 * Sanitize a title to create a valid filename
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove special characters (keep alphanumeric and hyphens)
 * - Trim hyphens from edges
 */
export const sanitizeFilename = (title: string): string => {
  if (!title || !title.trim()) {
    return 'untitled';
  }

  return (
    title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove special characters
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Trim hyphens from edges
      .substring(0, 50) || // Limit length
    'untitled'
  ); // Fallback if everything was removed
};

/**
 * Generate a unique filename by appending a suffix if needed
 */
export const generateUniqueFilename = (
  baseFilename: string,
  existingFilenames: Set<string>,
): string => {
  const filenameWithExt = `${baseFilename}.md`;

  if (!existingFilenames.has(filenameWithExt)) {
    return filenameWithExt;
  }

  // Try appending -2, -3, etc.
  let counter = 2;
  let uniqueFilename = `${baseFilename}-${counter}.md`;

  while (existingFilenames.has(uniqueFilename)) {
    counter++;
    uniqueFilename = `${baseFilename}-${counter}.md`;
  }

  return uniqueFilename;
};

/**
 * Build the ZIP file structure with hierarchical folders
 * Returns a Zippable object for fflate
 */
export const buildZipStructure = (
  prompts: Prompt[],
  collections: PromptCollection[],
  segments: PromptSegment[],
  language: Language,
): Zippable => {
  const zippable: Zippable = {};

  // Create a map for quick lookups
  const collectionMap = new Map(collections.map((c) => [c.id, c]));
  const segmentMap = new Map(segments.map((s) => [s.id, s]));

  // Track used filenames per folder to handle duplicates
  const usedFilenamesPerFolder = new Map<string, Set<string>>();

  prompts.forEach((prompt) => {
    // Get localized content
    const title = getLocalizedTitle(prompt, language);
    const body = getLocalizedBody(prompt, language);

    // Build folder path
    const collection = collectionMap.get(prompt.collection_id);
    const segment = segmentMap.get(prompt.segment_id);

    const collectionSlug = collection ? sanitizeFilename(collection.title) : 'uncategorized';
    const segmentSlug = segment ? sanitizeFilename(segment.title) : 'unsegmented';

    const folderPath = `${collectionSlug}/${segmentSlug}`;

    // Get or create the set of used filenames for this folder
    if (!usedFilenamesPerFolder.has(folderPath)) {
      usedFilenamesPerFolder.set(folderPath, new Set());
    }
    const usedFilenames = usedFilenamesPerFolder.get(folderPath)!;

    // Generate unique filename
    const baseFilename = sanitizeFilename(title) || `prompt-${prompt.id}`;
    const filename = generateUniqueFilename(baseFilename, usedFilenames);
    usedFilenames.add(filename);

    // Full path in ZIP
    const fullPath = `${folderPath}/${filename}`;

    // Create the markdown content
    const markdownContent = `# ${title}\n\n${body}\n`;

    // Add to zippable structure
    zippable[fullPath] = new Uint8Array([...new TextEncoder().encode(markdownContent)]);
  });

  return zippable;
};

/**
 * Download all prompts as a ZIP file
 */
export const downloadAllPromptsAsZip = async (
  prompts: Prompt[],
  collections: PromptCollection[],
  segments: PromptSegment[],
  language: Language,
  organizationName?: string,
): Promise<void> => {
  if (!prompts || prompts.length === 0) {
    throw new Error('No prompts to download');
  }

  try {
    // Build the ZIP structure
    const zippable = buildZipStructure(prompts, collections, segments, language);

    // Create the ZIP file
    const zipContent = zipSync(zippable);

    // Create a Blob
    const blob = new Blob([zipContent], { type: 'application/zip' });

    // Generate filename
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const orgSlug = organizationName ? sanitizeFilename(organizationName) : 'prompts';
    const filename = `${orgSlug}-prompts-${date}.zip`;

    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    throw error;
  }
};
