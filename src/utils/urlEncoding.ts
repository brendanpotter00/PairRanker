import { SharePayload, List, ListItem } from '../types';

/**
 * Encodes a payload to URL-safe base64 string
 */
export function encodePayloadToUrl(payload: SharePayload): string {
  const jsonString = JSON.stringify(payload);
  const utf8Bytes = new TextEncoder().encode(jsonString);

  // Convert to base64
  let base64 = btoa(String.fromCharCode(...utf8Bytes));

  // Make URL-safe
  base64 = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // Remove trailing padding

  return base64;
}

/**
 * Decodes a URL-safe base64 string to a payload
 */
export function decodePayloadFromUrl(encodedData: string): SharePayload | null {
  try {
    // Convert from URL-safe base64
    let base64 = encodedData
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64 to bytes
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decode UTF-8 to string
    const jsonString = new TextDecoder().decode(bytes);

    // Parse JSON
    const payload = JSON.parse(jsonString) as SharePayload;

    // Validate payload structure
    if (
      !payload.type ||
      (payload.type !== 'unranked' && payload.type !== 'ranked') ||
      !Array.isArray(payload.items)
    ) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Error decoding payload:', error);
    return null;
  }
}

/**
 * Creates a shareable URL for a list
 */
export function createShareUrl(payload: SharePayload): string {
  const encoded = encodePayloadToUrl(payload);
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('data', encoded);
  return url.toString();
}

/**
 * Generates a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a List from a SharePayload
 */
export function createListFromPayload(payload: SharePayload): List {
  const items: ListItem[] = payload.items.map((text) => ({
    id: generateId(),
    text,
  }));

  const list: List = {
    id: generateId(),
    name: payload.name || 'Untitled List',
    items,
    status: payload.type === 'ranked' ? 'ranked' : 'unranked',
    createdAt: Date.now(),
  };

  if (payload.type === 'ranked') {
    list.rankedData = {
      itemIdsInOrder: items.map((item) => item.id),
    };
  }

  return list;
}

/**
 * Creates a SharePayload from a List
 */
export function createPayloadFromList(
  list: List,
  type: 'unranked' | 'ranked'
): SharePayload {
  let items: string[];

  if (type === 'ranked' && list.rankedData) {
    // Get items in ranked order
    items = list.rankedData.itemIdsInOrder.map((id) => {
      const item = list.items.find((i) => i.id === id);
      return item?.text || '';
    });
  } else {
    // Get items in current order
    items = list.items.map((item) => item.text);
  }

  return {
    type,
    name: list.name,
    items,
  };
}
