// Platform Detection Utility for AI Chat Indexer
class PlatformDetector {
  static detect() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const userAgent = navigator.userAgent;
    
    // Platform detection patterns
    const platforms = {
      chatgpt: {
        pattern: /chat\.openai\.com|chatgpt\.com/,
        name: 'chatgpt',
        displayName: 'ChatGPT'
      },
      gemini: {
        pattern: /gemini\.google\.com|bard\.google\.com/,
        name: 'gemini',
        displayName: 'Gemini'
      },

      deepseek: {
        pattern: /chat\.deepseek\.com|deepseek\.com/,
        name: 'deepseek',
        displayName: 'DeepSeek'
      },
      grok: {
        pattern: /grok\.x\.ai|x\.ai\/grok/,
        name: 'grok',
        displayName: 'Grok'
      },
      claude: {
        pattern: /claude\.ai/,
        name: 'claude',
        displayName: 'Claude'
      }
    };

    for (const [key, platform] of Object.entries(platforms)) {
      if (platform.pattern.test(hostname)) {
        return {
          name: platform.name,
          displayName: platform.displayName,
          hostname,
          pathname,
          version: this.detectPlatformVersion(platform.name),
          selectors: this.getPlatformSelectors(platform.name)
        };
      }
    }
    
    return {
      name: 'unknown',
      displayName: 'Unknown Platform',
      hostname,
      pathname,
      version: 'unknown',
      selectors: this.getDefaultSelectors()
    };
  }

  static detectPlatformVersion(platform) {
    switch(platform) {
      case 'chatgpt':
        // Detect ChatGPT UI version
        if (document.querySelector('[data-testid="conversation-turn"]')) {
          return 'new-ui';
        } else if (document.querySelector('.chat-message')) {
          return 'legacy';
        }
        return 'unknown';
        
      case 'gemini':
        // Detect Gemini/Bard version
        if (document.querySelector('[data-message-author]')) {
          return 'gemini';
        } else if (document.querySelector('.conversation-container')) {
          return 'bard-legacy';
        }
        return 'unknown';
        

        
      default:
        return 'unknown';
    }
  }

  static getPlatformSelectors(platform) {
    const selectorMap = {
      chatgpt: {
        userMessage: '[data-message-author-role="user"]',
        assistantMessage: '[data-message-author-role="assistant"]',
        messageContent: '.whitespace-pre-wrap',
        conversationContainer: '[data-testid^="conversation-turn"]',
        fallbackUserMessage: '.group.w-full:has([data-message-author-role="user"]), div[class*="user"], .message[data-role="user"]',
        fallbackMessageContent: 'div[data-message-id] div.whitespace-pre-wrap, .message-text, .text-base'
      },
      gemini: {
        userMessage: '[data-message-author="user"]',
        assistantMessage: '[data-message-author="assistant"]', 
        messageContent: '.message-content',
        conversationContainer: '.conversation-container',
        fallbackUserMessage: '.user-message, div[class*="user"], .query-wrapper',
        fallbackMessageContent: '.message-text, .user-text, .query-text'
      },
      perplexity: {
        userMessage: '.user-input-container',
        assistantMessage: '.answer-container',
        messageContent: '.prose',
        conversationContainer: '.thread-container',
        fallbackUserMessage: '[data-testid="user-message"], .user-query, div[class*="user"]',
        fallbackMessageContent: '.message-content, .user-text, .query-text'
      },
      deepseek: {
        userMessage: '.user-message',
        assistantMessage: '.assistant-message',
        messageContent: '.message-content',
        conversationContainer: '.chat-container',
        fallbackUserMessage: 'div[class*="user"], .human-message, [data-role="user"]',
        fallbackMessageContent: '.user-text, .message-text, .content'
      },
      grok: {
        userMessage: '.user-message',
        assistantMessage: '.assistant-message',
        messageContent: '.message-content',
        conversationContainer: '.chat-interface',
        fallbackUserMessage: 'div[class*="user"], .human-message, [data-role="user"]',
        fallbackMessageContent: '.user-text, .message-text, .content'
      },
      claude: {
        userMessage: '.user-message',
        assistantMessage: '.assistant-message',
        messageContent: '.message-content',
        conversationContainer: '.chat-container',
        fallbackUserMessage: 'div[class*="user"], .human-message, [data-role="user"]',
        fallbackMessageContent: '.user-text, .message-text, .content'
      }
    };

    return selectorMap[platform] || this.getDefaultSelectors();
  }

  static getDefaultSelectors() {
    return {
      userMessage: '.user-message, .human-message, [role="user"]',
      assistantMessage: '.assistant-message, .ai-message, [role="assistant"]',
      messageContent: '.message-content, .content, .text',
      conversationContainer: '.conversation, .chat, .messages',
      fallbackUserMessage: '.message:has(.user)',
      fallbackMessageContent: '.content'
    };
  }

  static isSupported() {
    const platform = this.detect();
    return platform.name !== 'unknown';
  }

  static waitForPlatformReady(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        const platform = this.detect();
        
        if (platform.name !== 'unknown') {
          // Check if essential elements are present
          const container = document.querySelector(platform.selectors.conversationContainer);
          if (container) {
            resolve(platform);
            return;
          }
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error('Platform detection timeout'));
          return;
        }
        
        setTimeout(checkReady, 500);
      };
      
      checkReady();
    });
  }
}

// Export for use in other modules
window.PlatformDetector = PlatformDetector;
