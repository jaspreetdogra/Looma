// Theme Management System for Adaptive UI
class ThemeManager {
  constructor(platform, colors) {
    this.platform = platform;
    this.colors = colors;
    this.sidebar = null;
    this.isCollapsed = false;
    this.settings = {
      sidebarWidth: 320,
      autoCollapse: false,
      animationDuration: 300
    };
  }

  async initialize() {
    await this.loadSettings();
    this.createSidebar();
    this.applyTheme();
    this.setupEventListeners();
    return this.sidebar;
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS'
      });
      
      if (response.success) {
        this.settings = { ...this.settings, ...response.data };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  createSidebar() {
    // Remove existing sidebar and toggle if they exist
    const existing = document.getElementById('ai-indexer-sidebar');
    const existingToggle = document.getElementById('ai-indexer-toggle');
    if (existing) existing.remove();
    if (existingToggle) existingToggle.remove();

    // Create toggle button
    this.createToggleButton();

    this.sidebar = document.createElement('div');
    this.sidebar.id = 'ai-indexer-sidebar';
    this.sidebar.className = `ai-indexer-sidebar ${this.platform.name}-theme`;
    
    this.sidebar.innerHTML = this.generateSidebarHTML();
    
    // Apply initial width (more compact)
    this.sidebar.style.width = '280px';
    
    document.body.appendChild(this.sidebar);
    
    // Add resize functionality
    this.addResizeHandle();
  }

  createToggleButton() {
    this.toggleButton = document.createElement('div');
    this.toggleButton.id = 'ai-indexer-toggle';
    this.toggleButton.innerHTML = '█';
    this.toggleButton.title = 'AI Index';
    this.toggleButton.style.fontFamily = 'monospace';
    this.toggleButton.style.fontWeight = 'bold';
    this.toggleButton.style.fontSize = '16px';
    
    // Add click handler
    this.toggleButton.addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    document.body.appendChild(this.toggleButton);
  }

  toggleSidebar() {
    const isOpen = this.sidebar.classList.contains('open');
    
    if (isOpen) {
      this.sidebar.classList.remove('open');
      this.toggleButton.innerHTML = '█';
    } else {
      this.sidebar.classList.add('open');
      this.toggleButton.innerHTML = '×';
    }
  }

  generateSidebarHTML() {
    return `
      <div class="sidebar-header">
        <div class="title">AI INDEX</div>
        <div class="query-count">0</div>
        <button id="close-sidebar" class="control-btn">×</button>
      </div>
      
      <div class="search-container hidden">
        <input type="text" id="query-search" placeholder="SEARCH..." autocomplete="off">
        <button id="clear-search" class="clear-btn">CLR</button>
      </div>
      
      <div class="sidebar-content">
        <div id="query-list" class="query-list">
          <div class="empty-state">NO QUERIES YET</div>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <button id="search-toggle" class="footer-btn">SEARCH</button>
        <div class="last-updated">READY</div>
      </div>
    `;
  }

  getPlatformIcon() {
    const icons = {
      chatgpt: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142-.0852 4.783-2.7582a.7712.7712 0 0 0 .7806 0l5.8428 3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zm-2.4569-2.8096a4.4774 4.4774 0 0 1 2.3403-1.9581V16.12a.7714.7714 0 0 0 .3923.6813l5.8428 3.3685-2.02 1.1686a.0757.0757 0 0 1-.071 0l-4.8418-2.7952a4.4992 4.4992 0 0 1-1.6327-6.2719zm16.5078.2732l-5.8428-3.3685L18.4814 10.2a.0757.0757 0 0 1 .071 0l4.8418 2.7952a4.4944 4.4944 0 0 1-.6765 8.1042v-3.312a.7714.7714 0 0 0-.3927-.6813zm2.0107-3.0231l-.142.0852-4.783 2.7582a.7712.7712 0 0 0-.7806 0L9.39 15.4833V13.1509a.0804.0804 0 0 1 .0332-.0615l4.8418-2.7952a4.4992 4.4992 0 0 1 6.1408 1.6464 4.4708 4.4708 0 0 1 .5346 3.0137zM8.3065 12.863l-2.02-1.1686a.071.071 0 0 1-.038-.052V6.0826a4.504 4.504 0 0 1 7.3757-3.4537l-.1419.0804L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9996l-2.6069 1.4998L9.4041 13.553z"/>
      </svg>`,
      gemini: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L13.09 8.26L22 12L13.09 15.74L12 22L10.91 15.74L2 12L10.91 8.26L12 2Z"/>
      </svg>`,
      perplexity: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>`
    };

    return icons[this.platform.name] || icons.chatgpt;
  }

  applyTheme() {
    if (!this.sidebar) return;

    // Apply color variables
    this.sidebar.style.setProperty('--ai-indexer-primary', this.colors.primary);
    this.sidebar.style.setProperty('--ai-indexer-secondary', this.colors.secondary);
    this.sidebar.style.setProperty('--ai-indexer-accent', this.colors.accent);
    this.sidebar.style.setProperty('--ai-indexer-surface', this.colors.surface);
    this.sidebar.style.setProperty('--ai-indexer-border', this.colors.border);

    // Generate derived colors
    const shadowColor = this.adjustColorOpacity(this.colors.primary, 0.3);
    const hoverColor = this.adjustColorOpacity(this.colors.secondary, 0.1);
    
    this.sidebar.style.setProperty('--ai-indexer-shadow', shadowColor);
    this.sidebar.style.setProperty('--ai-indexer-hover', hoverColor);

    // Apply platform-specific styling
    this.applyPlatformSpecificStyles();
  }

  applyPlatformSpecificStyles() {
    const platformStyles = {
      chatgpt: {
        borderRadius: '8px',
        fontFamily: 'Söhne, system-ui, sans-serif',
        headerGradient: `linear-gradient(135deg, ${this.colors.surface}, ${this.colors.primary})`
      },
      gemini: {
        borderRadius: '12px',
        fontFamily: 'Google Sans, Roboto, sans-serif',
        headerGradient: `linear-gradient(135deg, ${this.colors.secondary}, ${this.colors.primary})`
      },
      perplexity: {
        borderRadius: '6px',
        fontFamily: 'Inter, system-ui, sans-serif',
        headerGradient: `linear-gradient(135deg, ${this.colors.surface}, ${this.colors.secondary})`
      }
    };

    const style = platformStyles[this.platform.name];
    if (style) {
      this.sidebar.style.setProperty('--ai-indexer-border-radius', style.borderRadius);
      this.sidebar.style.setProperty('--ai-indexer-font-family', style.fontFamily);
      this.sidebar.style.setProperty('--ai-indexer-header-gradient', style.headerGradient);
    }
  }

  setupEventListeners() {
    if (!this.sidebar) return;

    // Close sidebar
    const closeBtn = this.sidebar.querySelector('#close-sidebar');
    closeBtn?.addEventListener('click', () => this.toggleSidebar());

    // Search toggle
    const searchBtn = this.sidebar.querySelector('#search-toggle');
    searchBtn?.addEventListener('click', () => this.toggleSearch());

    // Search functionality
    const searchInput = this.sidebar.querySelector('#query-search');
    searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Clear search
    const clearBtn = this.sidebar.querySelector('#clear-search');
    clearBtn?.addEventListener('click', () => this.clearSearch());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  updateQueryList(queries) {
    const queryList = this.sidebar?.querySelector('#query-list');
    const queryCount = this.sidebar?.querySelector('.query-count');
    const emptyState = this.sidebar?.querySelector('.empty-state');
    
    if (!queryList) return;

    queryCount.textContent = queries.length;

    if (queries.length === 0) {
      queryList.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    const queryHTML = queries.map((query, index) => {
      return `
        <div class="query-item" data-query-id="${query.id}" data-index="${index}" data-full-text="${this.escapeHtml(query.text)}" title="Click to navigate to this query">
          <div class="query-header">
            <span class="query-number">${index + 1}</span>
            <span class="query-timestamp">${this.formatTimestamp(query.timestamp)}</span>
          </div>
          <div class="query-text">${query.truncatedText}</div>
        </div>
      `;
    }).join('');

    queryList.innerHTML = queryHTML;

    // Add click listeners for navigation
    queryList.querySelectorAll('.query-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        console.log('Query item clicked:', queries[index]);
        this.scrollToQuery(queries[index]);
      });
    });

    // Update last updated timestamp
    this.updateLastUpdated();
  }

  scrollToQuery(query) {
    console.log('Scrolling to:', query.text.substring(0, 50));
    
    // Simple element finding
    let element = query.element;
    
    if (!element) {
      // Try to find by text content
      const messages = document.querySelectorAll('[data-message-author-role="user"]');
      for (const msg of messages) {
        const content = msg.querySelector('.whitespace-pre-wrap');
        if (content && content.textContent.trim() === query.text.trim()) {
          element = msg;
          break;
        }
      }
    }
    
    if (!element) {
      console.log('Message not found for scrolling');
      return;
    }

    // Simple scroll
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });

    // Brief highlight
    element.style.backgroundColor = 'rgba(0, 188, 212, 0.2)';
    setTimeout(() => {
      element.style.backgroundColor = '';
    }, 1000);
  }

  findElementByText(searchText) {
    console.log('Searching for text:', searchText);
    
    // Get all potential message elements using multiple selectors
    const selectors = [
      '[data-message-author-role="user"]',
      '.group.w-full:has([data-message-author-role="user"])',
      '.user-message',
      '[data-testid="user-message"]',
      'div[class*="user"]',
      '.message[data-role="user"]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`Found ${elements.length} elements with selector: ${selector}`);
      
      for (const element of elements) {
        const text = this.extractTextFromElement(element);
        console.log('Comparing:', text.substring(0, 50), 'vs', searchText.substring(0, 50));
        
        if (text && text.trim() === searchText.trim()) {
          console.log('MATCH FOUND!', element);
          return element;
        }
        
        // Also try partial match
        if (text && text.includes(searchText.trim())) {
          console.log('PARTIAL MATCH FOUND!', element);
          return element;
        }
      }
    }
    
    console.log('No match found in any selector');
    return null;
  }

  extractTextFromElement(element) {
    // Try multiple content selectors
    const contentSelectors = [
      '.whitespace-pre-wrap',
      '.message-content',
      '.prose',
      '.content',
      '.text'
    ];
    
    for (const selector of contentSelectors) {
      const contentEl = element.querySelector(selector);
      if (contentEl && contentEl.textContent.trim()) {
        return contentEl.textContent.trim();
      }
    }
    
    // Fallback to element's own text
    return element.textContent.trim();
  }

  findQueryElement(query) {
    // Try to find the element by text content
    const selectors = this.platform.selectors;
    const userMessages = document.querySelectorAll(
      `${selectors.userMessage}, ${selectors.fallbackUserMessage}`
    );
    
    for (const messageEl of userMessages) {
      const content = this.extractMessageText(messageEl);
      if (content && content.trim() === query.text.trim()) {
        return messageEl;
      }
    }
    
    return null;
  }

  extractMessageText(messageEl) {
    const selectors = this.platform.selectors;
    const contentEl = messageEl.querySelector(selectors.messageContent) ||
                     messageEl.querySelector(selectors.fallbackMessageContent) ||
                     messageEl;
    
    return contentEl ? contentEl.textContent.trim() : '';
  }

  highlightElement(element) {
    const originalStyle = {
      transition: element.style.transition,
      boxShadow: element.style.boxShadow,
      backgroundColor: element.style.backgroundColor
    };

    // Apply highlight effect
    element.style.transition = 'all 0.3s ease';
    element.style.boxShadow = `0 0 0 3px ${this.colors.secondary}`;
    element.style.backgroundColor = this.adjustColorOpacity(this.colors.secondary, 0.1);

    // Remove highlight after 2 seconds
    setTimeout(() => {
      element.style.transition = originalStyle.transition;
      element.style.boxShadow = originalStyle.boxShadow;
      element.style.backgroundColor = originalStyle.backgroundColor;
    }, 2000);
  }



  toggleSearch() {
    const searchContainer = this.sidebar.querySelector('.search-container');
    const searchInput = this.sidebar.querySelector('#query-search');
    
    if (searchContainer) {
      const isVisible = !searchContainer.classList.contains('hidden');
      searchContainer.classList.toggle('hidden', isVisible);
      
      if (!isVisible) {
        setTimeout(() => searchInput?.focus(), 100);
      } else {
        this.clearSearch();
      }
    }
  }

  handleSearch(query) {
    const queryItems = this.sidebar.querySelectorAll('.query-item');
    const searchQuery = query.toLowerCase().trim();

    queryItems.forEach(item => {
      const text = item.querySelector('.query-text').textContent.toLowerCase();
      const matches = searchQuery === '' || text.includes(searchQuery);
      item.style.display = matches ? 'block' : 'none';
    });

    // Show/hide clear button
    const clearBtn = this.sidebar.querySelector('#clear-search');
    if (clearBtn) {
      clearBtn.style.display = searchQuery ? 'block' : 'none';
    }
  }

  clearSearch() {
    const searchInput = this.sidebar.querySelector('#query-search');
    if (searchInput) {
      searchInput.value = '';
      this.handleSearch('');
    }
  }



  handleKeyboard(e) {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'k':
          e.preventDefault();
          this.toggleSearch();
          break;
        case 'b':
          e.preventDefault();
          this.toggleCollapse();
          break;
      }
    }

    if (e.key === 'Escape') {
      this.clearSearch();
    }
  }

  addResizeHandle() {
    const resizeHandle = this.sidebar.querySelector('.resize-handle');
    if (!resizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = this.sidebar.offsetWidth;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = startX - e.clientX;
      const newWidth = Math.max(250, Math.min(600, startWidth + deltaX));
      
      this.sidebar.style.width = `${newWidth}px`;
      this.settings.sidebarWidth = newWidth;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        this.saveSettings();
      }
    });
  }

  async saveSettings() {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: this.settings
      });
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateLastUpdated() {
    const lastUpdated = this.sidebar?.querySelector('.last-updated');
    if (lastUpdated) {
      lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    }
  }

  adjustColorOpacity(color, opacity) {
    // Simple opacity adjustment for hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    if (color.startsWith('rgb')) {
      return color.replace(/[\d.]+\)$/g, `${opacity})`);
    }
    
    return color;
  }

  showLoading(show = true) {
    const loading = this.sidebar?.querySelector('.loading-indicator');
    if (loading) {
      loading.classList.toggle('hidden', !show);
    }
  }

  destroy() {
    if (this.sidebar) {
      this.sidebar.remove();
      this.sidebar = null;
    }
  }
}

// Export for use in other modules
window.ThemeManager = ThemeManager;
