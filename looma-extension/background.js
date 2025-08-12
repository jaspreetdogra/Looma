// Background service worker for Universal AI Chat Indexer
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.handleInstall();
      }
    });

    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Listen for tab updates to reinitialize on page changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.isSupportedUrl(tab.url)) {
        this.injectContentScript(tabId);
      }
    });
  }

  handleInstall() {
    console.log('AI Chat Indexer installed');
    // Set default settings
    chrome.storage.sync.set({
      enabled: true,
      sidebarWidth: 320,
      autoCollapse: false,
      theme: 'adaptive'
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'SAVE_INDEX':
          await this.saveIndex(message.data);
          sendResponse({ success: true });
          break;
        
        case 'LOAD_INDEX':
          const index = await this.loadIndex(message.url);
          sendResponse({ success: true, data: index });
          break;
        
        case 'GET_SETTINGS':
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;
        
        case 'UPDATE_SETTINGS':
          await this.updateSettings(message.data);
          sendResponse({ success: true });
          break;
        
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background service error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async saveIndex(data) {
    const key = this.generateStorageKey(data.url);
    await chrome.storage.local.set({
      [key]: {
        ...data,
        lastUpdated: Date.now()
      }
    });
  }

  async loadIndex(url) {
    const key = this.generateStorageKey(url);
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  }

  async getSettings() {
    const result = await chrome.storage.sync.get([
      'enabled', 'sidebarWidth', 'autoCollapse', 'theme'
    ]);
    return {
      enabled: result.enabled !== false,
      sidebarWidth: result.sidebarWidth || 320,
      autoCollapse: result.autoCollapse || false,
      theme: result.theme || 'adaptive'
    };
  }

  async updateSettings(settings) {
    await chrome.storage.sync.set(settings);
  }

  generateStorageKey(url) {
    const urlObj = new URL(url);
    return `index_${urlObj.hostname}_${urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  isSupportedUrl(url) {
    if (!url) return false;
    
    const supportedDomains = [
      'chat.openai.com',
      'chatgpt.com',
      'gemini.google.com',
      'bard.google.com',
      'www.perplexity.ai'
    ];
    
    try {
      const urlObj = new URL(url);
      return supportedDomains.includes(urlObj.hostname);
    } catch {
      return false;
    }
  }

  async injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }
}

// Initialize background service
new BackgroundService();
