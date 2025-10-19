// lib/translation/clientTranslate.ts

/**
 * Client-side translation utility that calls the server API.
 * This avoids importing Node.js modules in the browser.
 * 
 * Features:
 * - Request throttling to prevent rate limit errors
 * - Queue system for managing concurrent requests
 * - Exponential backoff for retry logic
 */

// In-memory cache for client-side performance
const clientCache = new Map<string, string>();

// Request queue to prevent overwhelming the API
interface QueuedRequest {
  text: string;
  targetLang: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  retryCount: number;
}

const requestQueue: QueuedRequest[] = [];
const pendingRequests = new Map<string, QueuedRequest[]>(); // Track pending requests by cache key
let isProcessingQueue = false;
const MAX_CONCURRENT_REQUESTS = 1; // Only 1 concurrent request to avoid rate limits
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay between requests
let activeRequests = 0;

function getCacheKey(text: string, targetLang: string): string {
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  const normalizedLang = targetLang.toLowerCase();
  return `${normalizedLang}:${normalizedText}`;
}

/**
 * Process the translation queue with rate limiting
 */
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const request = requestQueue.shift();
    if (!request) continue;

    activeRequests++;

    // Add delay between requests to avoid rate limiting
    if (activeRequests > 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }

    translateWithRetry(request)
      .finally(() => {
        activeRequests--;
        processQueue(); // Continue processing queue
      });
  }

  isProcessingQueue = false;
}

/**
 * Execute translation with exponential backoff retry logic
 */
async function translateWithRetry(request: QueuedRequest): Promise<void> {
  const { text, targetLang, resolve, retryCount } = request;
  const maxRetries = 5; // Increased from 3 to handle more retries
  const baseDelay = 1000; // Start with 1 second delay

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLang,
      }),
    });

    if (response.status === 429) {
      if (retryCount < maxRetries) {
        // Rate limited - retry with exponential backoff
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Re-queue with incremented retry count and process immediately
        const retryRequest = {
          ...request,
          retryCount: retryCount + 1,
        };
        requestQueue.unshift(retryRequest);
        
        return; // Don't resolve/reject - let the retry handle it
      } else {
        // Max retries exceeded - return original text as fallback
        console.warn(`Rate limit retry exhausted for: ${text.substring(0, 50)}...`);
        resolve(text); // Fallback to original text
        return;
      }
    }

    if (!response.ok) {
      console.warn(`Translation API error ${response.status}, falling back to original text`);
      resolve(text); // Fallback to original text instead of throwing
      return;
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Translation failed');
    }

    const translation = data.translation || text;
    
    // Cache the result
    const cacheKey = getCacheKey(text, targetLang);
    clientCache.set(cacheKey, translation);
    
    // Resolve all pending requests for this text
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      pending.forEach(req => req.resolve(translation));
      pendingRequests.delete(cacheKey);
    } else {
      resolve(translation);
    }
  } catch (error) {
    console.error('Translation request failed:', error);
    
    // Reject all pending requests for this text or just this one
    const cacheKey = getCacheKey(text, targetLang);
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      pending.forEach(req => req.resolve(text)); // Fallback to original text
      pendingRequests.delete(cacheKey);
    } else {
      resolve(text); // Fallback to original text instead of rejecting
    }
  }
}

/**
 * Translate text using the server API with queue management
 */
export async function clientTranslate(text: string, targetLang: string): Promise<string> {
  // Return immediately if text is empty or target is English
  if (!text || !text.trim() || targetLang.toLowerCase() === 'en') {
    return text;
  }

  // Check client cache first
  const cacheKey = getCacheKey(text, targetLang);
  const cached = clientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Check if there's already a pending request for this text
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    // Attach to existing request instead of creating a new one
    return new Promise((resolve, reject) => {
      pending.push({
        text,
        targetLang,
        resolve,
        reject,
        retryCount: 0,
      });
    }).catch(error => {
      console.error('Client translation failed:', error);
      return text; // Fallback to original text
    }) as Promise<string>;
  }

  // Create a new pending request group
  const requestGroup: QueuedRequest[] = [];
  pendingRequests.set(cacheKey, requestGroup);

  // Add to queue and return a promise
  return new Promise((resolve, reject) => {
    const request = {
      text,
      targetLang,
      resolve,
      reject,
      retryCount: 0,
    };
    
    requestGroup.push(request);
    requestQueue.push(request);

    // Start processing the queue
    processQueue().catch(err => {
      console.error('Queue processing error:', err);
      // Don't reject here, let individual requests handle their own errors
    });
  }).catch(error => {
    console.error('Client translation failed:', error);
    return text; // Fallback to original text
  }) as Promise<string>;
}

/**
 * Translate multiple texts using the server API
 */
export async function clientTranslateBatch(texts: string[], targetLang: string): Promise<string[]> {
  // Return immediately if target is English
  if (targetLang.toLowerCase() === 'en') {
    return texts;
  }

  // Check cache for each text
  const cacheResults: (string | null)[] = texts.map(text => {
    if (!text || !text.trim()) return text;
    const cacheKey = getCacheKey(text, targetLang);
    return clientCache.get(cacheKey) || null;
  });

  // If all are cached, return cached results
  if (cacheResults.every(result => result !== null)) {
    return cacheResults as string[];
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        targetLang,
      }),
    });

    if (!response.ok) {
      console.warn(`Batch translation API error ${response.status}, falling back to original texts`);
      return texts; // Fallback to original texts
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Batch translation failed');
    }

    const translations = data.translations || texts;
    
    // Cache the results
    texts.forEach((text, index) => {
      if (text && text.trim()) {
        const cacheKey = getCacheKey(text, targetLang);
        clientCache.set(cacheKey, translations[index]);
      }
    });
    
    return translations;
  } catch (error) {
    console.error('Client batch translation failed:', error);
    return texts; // Fallback to original texts
  }
}