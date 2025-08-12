// Main Content Script for Universal AI Chat Indexer
class AIchatIndexer {
  constructor() {
    this.platform = null;
    this.indexer = null;
    this.themeManager = null;
    this.colorExtractor = null;
    this.isInitialized = false;
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3;
  }

  async initialize() {
    try {
      console.log('AI Chat Indexer: Initializing...');
      
      // Wait for platform to be ready
      this.platform = await PlatformDetector.waitForPlatformReady();
      console.log('AI Chat Indexer: Platform detected:', this.platform);

      if (!PlatformDetector.isSupported()) {
        console.warn('AI Chat Indexer: Unsupported platform');
        return;
      }

      // Extract colors for adaptive theming
      this.colorExtractor = new ColorExtractor(this.platform);
      const colors = this.colorExtractor.extractPlatformColors();
      console.log('AI Chat Indexer: Colors extracted:', colors);

      // Initialize conversation indexer
      this.indexer = new ConversationIndexer(this.platform);
      const queries = await this.indexer.initialize();
      console.log('AI Chat Indexer: Indexed queries:', queries.length);

      // Initialize theme manager and UI
      this.themeManager = new ThemeManager(this.platform, colors);
      await this.themeManager.initialize();
      console.log('AI Chat Indexer: UI initialized');

      // Update UI with queries
      this.themeManager.updateQueryList(queries);

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('AI Chat Indexer: Successfully initialized');

    } catch (error) {
      console.error('AI Chat Indexer: Initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  setupEventListeners() {
    // Listen for indexer updates
    window.addEventListener('aiIndexerUpdate', (event) => {
      if (this.themeManager) {
        this.themeManager.updateQueryList(event.detail.queries);
      }
    });

    // Listen for page navigation changes
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.handleNavigationChange();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isInitialized) {
        setTimeout(() => this.refreshIndex(), 500);
      }
    });

    // Add periodic refresh for real-time updates
    this.refreshInterval = setInterval(() => {
      if (this.isInitialized && !document.hidden) {
        this.refreshIndex();
      }
    }, 3000); // Refresh every 3 seconds

    // Listen for window resize
    window.addEventListener('resize', this.debounce(() => {
      this.handleResize();
    }, 300));

    // Listen for theme changes (dark/light mode)
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        this.handleThemeChange();
      });
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });
  }

  async handleNavigationChange() {
    console.log('AI Chat Indexer: Navigation change detected');
    
    // Reset and reinitialize for new page
    if (this.isInitialized) {
      this.destroy();
      await this.initialize();
    }
  }

  async refreshIndex() {
    if (!this.indexer || !this.themeManager) return;

    try {
      console.log('AI Chat Indexer: Refreshing index...');
      this.themeManager.showLoading(true);
      
      // Re-scan for new queries
      this.indexer.scanExistingQueries();
      const queries = this.indexer.getQueries();
      
      // Update UI
      this.themeManager.updateQueryList(queries);
      this.themeManager.showLoading(false);
      
      console.log('AI Chat Indexer: Index refreshed, found', queries.length, 'queries');
      
      // Force a notification event for real-time updates
      this.indexer.notifyUpdate();
    } catch (error) {
      console.error('AI Chat Indexer: Failed to refresh index:', error);
      this.themeManager.showLoading(false);
    }
  }

  handleResize() {
    // Handle window resize events - no auto-collapse needed with overlay design
    if (this.themeManager && window.innerWidth < 768) {
      // Just ensure overlay button remains accessible
      console.log('AI Chat Indexer: Small screen detected, overlay mode active');
    }
  }

  async handleThemeChange() {
    if (!this.colorExtractor || !this.themeManager) return;

    try {
      // Re-extract colors for new theme
      const colors = this.colorExtractor.extractPlatformColors();
      
      // Update theme
      this.themeManager.colors = colors;
      this.themeManager.applyTheme();
      
      console.log('AI Chat Indexer: Theme updated for color scheme change');
    } catch (error) {
      console.error('AI Chat Indexer: Failed to update theme:', error);
    }
  }

  async handleInitializationError(error) {
    if (this.retryAttempts < this.maxRetryAttempts) {
      this.retryAttempts++;
      console.log(`AI Chat Indexer: Retrying initialization (attempt ${this.retryAttempts})`);
      
      // Wait before retrying
      setTimeout(() => {
        this.initialize();
      }, 2000 * this.retryAttempts);
    } else {
      console.error('AI Chat Indexer: Max retry attempts reached, giving up');
      this.showErrorNotification('Failed to initialize AI Chat Indexer. Please refresh the page.');
    }
  }

  showErrorNotification(message) {
    // Create a simple error notification
    const notification = document.createElement('div');
    notification.id = 'ai-indexer-error';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000000;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        max-width: 300px;
        cursor: pointer;
      ">
        <strong>AI Chat Indexer Error</strong><br>
        ${message}
        <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
          Click to dismiss
        </div>
      </div>
    `;

    notification.addEventListener('click', () => {
      notification.remove();
    });

    document.body.appendChild(notification);

    // Auto remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_STATS':
          const stats = {
            queryCount: this.indexer ? this.indexer.getQueries().length : 0,
            platform: this.platform ? this.platform.name : 'unknown',
            isActive: this.isInitialized
          };
          sendResponse(stats);
          break;
          
        case 'TOGGLE_SIDEBAR':
          if (this.themeManager) {
            this.themeManager.toggleSidebar();
          }
          sendResponse({ success: true });
          break;
          
        case 'REFRESH_INDEX':
          this.refreshIndex();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Content script message error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  destroy() {
    console.log('AI Chat Indexer: Cleaning up...');

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.indexer) {
      this.indexer.destroy();
      this.indexer = null;
    }

    if (this.themeManager) {
      this.themeManager.destroy();
      this.themeManager = null;
    }

    this.colorExtractor = null;
    this.platform = null;
    this.isInitialized = false;
    this.retryAttempts = 0;
  }

  // Public API methods
  static getInstance() {
    if (!window.aiChatIndexerInstance) {
      window.aiChatIndexerInstance = new AIchatIndexer();
    }
    return window.aiChatIndexerInstance;
  }

  static async init() {
    const instance = AIchatIndexer.getInstance();
    if (!instance.isInitialized) {
      await instance.initialize();
    }
    return instance;
  }

  static destroy() {
    const instance = window.aiChatIndexerInstance;
    if (instance) {
      instance.destroy();
      window.aiChatIndexerInstance = null;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    AIchatIndexer.init();
  });
} else {
  // DOM already ready
  AIchatIndexer.init();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  AIchatIndexer.destroy();
});

// Export for debugging
window.AIchatIndexer = AIchatIndexer;
