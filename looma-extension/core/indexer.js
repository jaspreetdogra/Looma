// Core Indexing Engine for AI Chat Conversations
class ConversationIndexer {
  constructor(platform) {
    this.platform = platform;
    this.queries = [];
    this.observer = null;
    this.lastScanTime = 0;
    this.scanDebounceDelay = 500;
    this.scanTimeout = null;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      try {
        this.scanExistingQueries();
        this.setupMutationObserver();
        this.loadStoredIndex();
        resolve(this.queries);
      } catch (error) {
        console.error('Failed to initialize indexer:', error);
        reject(error);
      }
    });
  }

  scanExistingQueries() {
    const selectors = this.platform.selectors;
    const userMessages = this.findUserMessages(selectors);
    
    this.queries = [];
    
    userMessages.forEach((messageElement, index) => {
      try {
        const query = this.extractQueryFromElement(messageElement, index);
        if (query) {
          this.queries.push(query);
        }
      } catch (error) {
        console.warn('Failed to extract query from element:', error);
      }
    });

    console.log(`Indexed ${this.queries.length} queries for ${this.platform.name}`);
  }

  findUserMessages(selectors) {
    const messages = [];
    
    // Try primary selector first
    let elements = document.querySelectorAll(selectors.userMessage);
    
    // If no messages found, try fallback selectors
    if (elements.length === 0) {
      elements = document.querySelectorAll(selectors.fallbackUserMessage);
    }
    
    // Convert NodeList to Array and filter visible elements
    Array.from(elements).forEach(element => {
      if (this.isElementVisible(element)) {
        messages.push(element);
      }
    });
    
    return messages.sort((a, b) => {
      // Sort by document order (top to bottom)
      const position = a.compareDocumentPosition(b);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  extractQueryFromElement(messageElement, index) {
    try {
      const contentElement = this.findContentElement(messageElement);
      if (!contentElement) {
        console.warn('No content element found for message');
        return null;
      }

      const text = this.extractTextContent(contentElement);
      if (!text || text.trim().length < 3) {
        return null;
      }

      const query = {
        id: this.generateQueryId(text, index),
        text: text.trim(),
        truncatedText: this.truncateText(text, 60), // More compact truncation
        element: messageElement,
        timestamp: this.extractTimestamp(messageElement) || Date.now(),
        index: index,
        position: this.getElementPosition(messageElement),
        elementSelector: this.generateElementSelector(messageElement)
      };

      return query;
    } catch (error) {
      console.error('Error extracting query from element:', error);
      return null;
    }
  }

  findContentElement(messageElement) {
    const selectors = this.platform.selectors;
    
    // Try to find content within the message element
    let contentElement = messageElement.querySelector(selectors.messageContent);
    
    if (!contentElement) {
      contentElement = messageElement.querySelector(selectors.fallbackMessageContent);
    }
    
    // If still no content element, use the message element itself
    if (!contentElement) {
      contentElement = messageElement;
    }
    
    return contentElement;
  }

  extractTextContent(element) {
    // Handle different content types (text, code blocks, etc.)
    let text = '';
    
    // For elements with complex content, try to get clean text
    if (element.textContent) {
      text = element.textContent;
    } else if (element.innerText) {
      text = element.innerText;
    }
    
    // Clean up the text
    text = text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
    
    return text;
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Try to truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  generateQueryId(text, index) {
    // Create a stable ID based on content and position
    const hash = this.simpleHash(text);
    return `query_${index}_${hash}`;
  }

  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  extractTimestamp(messageElement) {
    // Try to find timestamp in various formats
    const timestampSelectors = [
      'time',
      '[datetime]',
      '.timestamp',
      '.time',
      '[title*="PM"], [title*="AM"]'
    ];
    
    for (const selector of timestampSelectors) {
      const timestampElement = messageElement.querySelector(selector);
      if (timestampElement) {
        const datetime = timestampElement.getAttribute('datetime') || 
                        timestampElement.textContent;
        const timestamp = new Date(datetime).getTime();
        if (!isNaN(timestamp)) {
          return timestamp;
        }
      }
    }
    
    return null;
  }

  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      height: rect.height,
      width: rect.width
    };
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    
    return rect.height > 0 && 
           rect.width > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           style.opacity !== '0';
  }

  setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-message-id', 'data-testid', 'class'],
      characterData: true
    };

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    // Observe the whole document for maximum coverage
    this.observer.observe(document.body, config);
    console.log('MutationObserver started for real-time conversation indexing');
    
    // Also set up a periodic scan as backup
    this.periodicScanInterval = setInterval(() => {
      this.periodicScan();
    }, 2000); // Scan every 2 seconds
  }

  handleMutations(mutations) {
    let shouldUpdate = false;
    
    for (const mutation of mutations) {
      // Check if new messages were added
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this looks like a new message or contains messages
            if (this.looksLikeMessage(node) || this.containsMessages(node)) {
              shouldUpdate = true;
              console.log('New message detected in DOM');
              break;
            }
          }
        }
      }
      
      // Check for attribute changes that might indicate new content
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (this.looksLikeMessage(target) || this.containsMessages(target)) {
          shouldUpdate = true;
          console.log('Message attribute changed');
          break;
        }
      }
      
      // Check for text changes
      if (mutation.type === 'characterData') {
        const parentEl = mutation.target.parentElement;
        if (parentEl && this.looksLikeMessage(parentEl)) {
          shouldUpdate = true;
          console.log('Message text changed');
          break;
        }
      }
    }
    
    if (shouldUpdate) {
      this.debouncedScan();
    }
  }

  containsMessages(element) {
    if (!element.querySelector) return false;
    
    const selectors = this.platform.selectors;
    return !!(element.querySelector(selectors.userMessage) || 
              element.querySelector(selectors.fallbackUserMessage));
  }

  periodicScan() {
    const previousCount = this.queries.length;
    this.scanExistingQueries();
    
    if (this.queries.length > previousCount) {
      console.log(`Periodic scan found ${this.queries.length - previousCount} new queries`);
      this.notifyUpdate();
    }
  }

  looksLikeMessage(element) {
    const selectors = this.platform.selectors;
    
    // Check if element matches user message patterns
    if (element.matches && 
        (element.matches(selectors.userMessage) || 
         element.matches(selectors.fallbackUserMessage))) {
      return true;
    }
    
    // Check if element contains user messages
    if (element.querySelector && 
        (element.querySelector(selectors.userMessage) || 
         element.querySelector(selectors.fallbackUserMessage))) {
      return true;
    }
    
    return false;
  }

  debouncedScan() {
    clearTimeout(this.scanTimeout);
    this.scanTimeout = setTimeout(() => {
      const previousCount = this.queries.length;
      this.scanExistingQueries();
      
      // Only trigger update if we found new queries
      if (this.queries.length > previousCount) {
        console.log(`Found ${this.queries.length - previousCount} new queries`);
        this.notifyUpdate();
      }
    }, this.scanDebounceDelay);
  }

  notifyUpdate() {
    // Dispatch custom event for UI updates
    const event = new CustomEvent('aiIndexerUpdate', {
      detail: {
        queries: this.queries,
        platform: this.platform.name,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
  }

  handleMutations(mutations) {
    let shouldRescan = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Check if new messages were added
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (this.isUserMessage(node) || 
                node.querySelector(this.platform.selectors.userMessage)) {
              shouldRescan = true;
              break;
            }
          }
        }
      }
    }
    
    if (shouldRescan) {
      this.debouncedRescan();
    }
  }

  isUserMessage(element) {
    const selectors = this.platform.selectors;
    return element.matches(selectors.userMessage) ||
           element.matches(selectors.fallbackUserMessage);
  }

  debouncedRescan() {
    clearTimeout(this.scanTimeout);
    this.scanTimeout = setTimeout(() => {
      this.rescanQueries();
    }, this.scanDebounceDelay);
  }

  rescanQueries() {
    const oldCount = this.queries.length;
    this.scanExistingQueries();
    
    if (this.queries.length !== oldCount) {
      this.notifyUpdate();
      this.saveIndex();
    }
  }

  notifyUpdate() {
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('aiIndexerUpdate', {
      detail: {
        queries: this.queries,
        platform: this.platform
      }
    }));
  }

  async saveIndex() {
    try {
      const indexData = {
        url: window.location.href,
        platform: this.platform.name,
        queries: this.queries.map(q => ({
          id: q.id,
          text: q.text,
          truncatedText: q.truncatedText,
          timestamp: q.timestamp,
          index: q.index
        }))
      };

      await chrome.runtime.sendMessage({
        type: 'SAVE_INDEX',
        data: indexData
      });
    } catch (error) {
      console.error('Failed to save index:', error);
    }
  }

  async loadStoredIndex() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LOAD_INDEX',
        url: window.location.href
      });

      if (response.success && response.data) {
        // Merge stored queries with current ones
        this.mergeStoredQueries(response.data.queries);
      }
    } catch (error) {
      console.error('Failed to load stored index:', error);
    }
  }

  mergeStoredQueries(storedQueries) {
    // This is a placeholder for merging logic
    // In a real implementation, you'd want to match stored queries
    // with current DOM elements and preserve scroll positions
    console.log(`Loaded ${storedQueries.length} stored queries`);
  }

  getQueries() {
    return [...this.queries];
  }

  generateElementSelector(element) {
    // Generate a selector that can help re-find this element
    let selector = '';
    
    // Try to create a unique selector
    if (element.id) {
      selector = `#${element.id}`;
    } else if (element.getAttribute('data-message-id')) {
      selector = `[data-message-id="${element.getAttribute('data-message-id')}"]`;
    } else if (element.getAttribute('data-testid')) {
      selector = `[data-testid="${element.getAttribute('data-testid')}"]`;
    } else {
      // Fallback to class-based selector
      const classes = Array.from(element.classList).slice(0, 3).join('.');
      if (classes) {
        selector = `.${classes}`;
      }
    }
    
    return selector;
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.periodicScanInterval) {
      clearInterval(this.periodicScanInterval);
      this.periodicScanInterval = null;
    }
    
    clearTimeout(this.scanTimeout);
    this.queries = [];
    console.log('ConversationIndexer: Destroyed');
  }
}

// Export for use in other modules
window.ConversationIndexer = ConversationIndexer;
