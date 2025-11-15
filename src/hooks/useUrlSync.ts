import { useEffect, useRef } from 'react';
import { usePromptsStore } from '../store/promptsStore';

/**
 * Custom hook that synchronizes filter state (org, collection, segment, prompt) with URL parameters.
 *
 * This hook ensures that changes to dropdowns and prompt selection are reflected in the URL, enabling:
 * - Shareable filter views and direct links to prompts
 * - Deep linking to specific filter states and individual prompts
 * - Browser history and bookmark support
 *
 * Uses replaceState() to update URL without adding to browser history for filter changes.
 * Uses pushState() when a prompt is opened to maintain proper browser back/forward navigation.
 * Skips during initial hydration to prevent competing URL updates.
 */
export const useUrlSync = () => {
  const {
    activeOrganization,
    collections,
    segments,
    prompts,
    selectedCollectionId,
    selectedSegmentId,
    selectedPromptId,
    isHydrating,
  } = usePromptsStore();

  // Track previous prompt ID to detect when prompt modal opens/closes
  const prevPromptIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip during hydration and SSR
    if (isHydrating || typeof window === 'undefined') return;

    // Find current entities
    const collection = collections.find((c) => c.id === selectedCollectionId);
    const segment = segments.find((s) => s.id === selectedSegmentId);
    const prompt = prompts.find((p) => p.id === selectedPromptId);

    // Build URL
    const url = new URL(window.location.href);
    url.search = ''; // Clear existing params

    if (activeOrganization) {
      url.searchParams.set('org', activeOrganization.slug);
    }

    if (collection) {
      url.searchParams.set('collection', collection.slug);
    }

    if (segment) {
      url.searchParams.set('segment', segment.slug);
    }

    // Include prompt parameter if a prompt is selected
    if (prompt) {
      // Phase 2: Use slug when available, fallback to ID
      url.searchParams.set('prompt', prompt.slug || prompt.id);
    }

    // Determine whether to push or replace state
    const promptJustOpened = !prevPromptIdRef.current && selectedPromptId;
    const shouldPushState = promptJustOpened;

    // Update URL
    if (shouldPushState) {
      // Opening a prompt: add to browser history so back button works
      window.history.pushState({ promptId: selectedPromptId }, '', url.toString());
    } else {
      // Filter changes or closing prompt: replace without adding to history
      window.history.replaceState({}, '', url.toString());
    }

    // Update ref for next render
    prevPromptIdRef.current = selectedPromptId;
  }, [
    activeOrganization,
    selectedCollectionId,
    selectedSegmentId,
    selectedPromptId,
    collections,
    segments,
    prompts,
    isHydrating,
  ]);
};
