// Color Extraction Utility for Adaptive UI Theming
class ColorExtractor {
  constructor(platform) {
    this.platform = platform;
    this.cache = new Map();
  }

  extractPlatformColors() {
    const cacheKey = `${this.platform.name}_${this.platform.version}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let colors;
    
    try {
      switch(this.platform.name) {
        case 'chatgpt':
          colors = this.extractChatGPTColors();
          break;
        case 'gemini':
          colors = this.extractGeminiColors();
          break;
        case 'perplexity':
          colors = this.extractPerplexityColors();
          break;
        default:
          colors = this.generateFallbackColors();
      }
    } catch (error) {
      console.warn('Color extraction failed:', error);
      colors = this.generateFallbackColors();
    }

    // Ensure colors have proper contrast
    colors = this.validateAndAdjustColors(colors);
    
    this.cache.set(cacheKey, colors);
    return colors;
  }

  extractChatGPTColors() {
    const colors = {
      primary: this.getComputedColor('body', 'background-color') || '#212121',
      secondary: this.getComputedColor('[data-testid="send-button"]', 'background-color') || '#10a37f',
      accent: this.getComputedColor('[data-message-author-role="user"]', 'color') || '#ececf1',
      surface: this.getComputedColor('nav', 'background-color') || '#171717',
      border: this.extractFromCSS('--border-light') || 'rgba(255, 255, 255, 0.1)'
    };

    // Try alternative selectors if primary extraction fails
    if (colors.primary === '#212121') {
      colors.primary = this.getComputedColor('.dark\\:bg-gray-800', 'background-color') || 
                       this.getComputedColor('[class*="bg-"]', 'background-color') || 
                       '#212121';
    }

    return colors;
  }

  extractGeminiColors() {
    const colors = {
      primary: this.extractFromCSS('--surface-container') || 
               this.getComputedColor('body', 'background-color') || 
               '#1e1e1e',
      secondary: this.extractFromCSS('--primary') || 
                 this.getComputedColor('[data-mdc-dialog-action="ok"]', 'background-color') || 
                 '#1a73e8',
      accent: this.extractFromCSS('--on-surface') || 
              this.getComputedColor('[data-message-author="user"]', 'color') || 
              '#e8eaed',
      surface: this.extractFromCSS('--surface-container-high') || 
               this.getComputedColor('.conversation-container', 'background-color') || 
               '#2d2d30',
      border: this.extractFromCSS('--outline-variant') || 'rgba(255, 255, 255, 0.12)'
    };

    return colors;
  }

  extractPerplexityColors() {
    const colors = {
      primary: this.getDominantBackgroundColor() || 
               this.getComputedColor('body', 'background-color') || 
               '#202222',
      secondary: this.getComputedColor('button[type="submit"]', 'background-color') || 
                 this.getComputedColor('.btn-primary', 'background-color') || 
                 '#20808d',
      accent: this.getComputedColor('.user-input-container', 'color') || 
              this.getComputedColor('h1', 'color') || 
              '#ffffff',
      surface: this.getComputedColor('.thread-container', 'background-color') || 
               this.getComputedColor('main', 'background-color') || 
               '#2c2d30',
      border: this.getComputedColor('hr', 'border-color') || 'rgba(255, 255, 255, 0.1)'
    };

    return colors;
  }

  getComputedColor(selector, property) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        const style = getComputedStyle(element);
        const value = style.getPropertyValue(property).trim();
        
        // Convert rgb/rgba to hex if possible
        if (value.startsWith('rgb')) {
          return this.rgbToHex(value);
        }
        
        return value || null;
      }
    } catch (error) {
      console.warn(`Failed to get computed color for ${selector}:${property}`, error);
    }
    
    return null;
  }

  extractFromCSS(variableName) {
    try {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(variableName).trim();
      
      if (value && value !== 'initial' && value !== 'inherit') {
        return value.startsWith('rgb') ? this.rgbToHex(value) : value;
      }
    } catch (error) {
      console.warn(`Failed to extract CSS variable ${variableName}`, error);
    }
    
    return null;
  }

  getDominantBackgroundColor() {
    try {
      // Get the most common background color from visible elements
      const elements = document.querySelectorAll('div, section, main, body');
      const colorCount = new Map();
      
      for (const element of elements) {
        const bgColor = getComputedStyle(element).backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          const hex = this.rgbToHex(bgColor);
          colorCount.set(hex, (colorCount.get(hex) || 0) + 1);
        }
      }
      
      // Return the most common color
      let mostCommon = null;
      let maxCount = 0;
      
      for (const [color, count] of colorCount.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = color;
        }
      }
      
      return mostCommon;
    } catch (error) {
      console.warn('Failed to get dominant background color', error);
      return null;
    }
  }

  rgbToHex(rgb) {
    try {
      const result = rgb.match(/\d+/g);
      if (result && result.length >= 3) {
        return '#' + result.slice(0, 3)
          .map(x => parseInt(x).toString(16).padStart(2, '0'))
          .join('');
      }
    } catch (error) {
      console.warn('Failed to convert RGB to hex:', rgb, error);
    }
    
    return rgb;
  }

  validateAndAdjustColors(colors) {
    // Ensure minimum contrast ratios and valid color values
    const validated = { ...colors };
    
    // Validate each color and provide fallbacks
    validated.primary = this.validateColor(colors.primary) || '#1a1a1a';
    validated.secondary = this.validateColor(colors.secondary) || '#0066cc';
    validated.accent = this.validateColor(colors.accent) || '#ffffff';
    validated.surface = this.validateColor(colors.surface) || '#2a2a2a';
    validated.border = this.validateColor(colors.border) || 'rgba(255, 255, 255, 0.1)';
    
    // Ensure accent color has sufficient contrast against surface
    if (this.getContrastRatio(validated.accent, validated.surface) < 3) {
      validated.accent = this.isColorDark(validated.surface) ? '#ffffff' : '#000000';
    }
    
    return validated;
  }

  validateColor(color) {
    if (!color) return null;
    
    try {
      const div = document.createElement('div');
      div.style.color = color;
      return div.style.color ? color : null;
    } catch {
      return null;
    }
  }

  getContrastRatio(color1, color2) {
    // Simplified contrast ratio calculation
    const l1 = this.getLuminance(color1);
    const l2 = this.getLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  getLuminance(color) {
    // Simplified luminance calculation
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0.5;
    
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return null;
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  isColorDark(color) {
    return this.getLuminance(color) < 0.5;
  }

  generateFallbackColors() {
    return {
      primary: '#1a1a1a',
      secondary: '#0066cc', 
      accent: '#ffffff',
      surface: '#2a2a2a',
      border: 'rgba(255, 255, 255, 0.1)'
    };
  }
}

// Export for use in other modules
window.ColorExtractor = ColorExtractor;
