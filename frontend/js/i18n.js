/**
 * Mandi-Connect I18n Manager
 * Handles language switching and DOM translation asynchronously
 */
const i18n = {
  currentLang: 'en',
  translations: {},
  
  async init() {
    // 1. Get saved language or default to browser language
    const savedLang = localStorage.getItem('mc_lang');
    let langToLoad = 'en';

    if (savedLang) {
      langToLoad = savedLang;
    } else {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'hi' || browserLang === 'kn') {
        langToLoad = browserLang;
      }
    }

    // 2. Load the initial language JSON
    await this.loadLanguage(langToLoad);

    // 3. Setup language selectors if any exist on page
    this.setupSelectors();
  },

  async loadLanguage(lang) {
    try {
      // Create absolute/relative path that works for GH pages and local dev
      const basePath = window.location.pathname.includes('/frontend/') 
        ? '.' // If we are inside /frontend/
        : '.'; // Usually relative to the current HTML file
      
      const response = await fetch(`${basePath}/locales/${lang}.json`);
      if (!response.ok) {
         throw new Error(`Failed to load ${lang} translations`);
      }
      this.translations = await response.json();
      this.currentLang = lang;
      
      // Update state and UI
      localStorage.setItem('mc_lang', lang);
      document.documentElement.lang = lang;
      this.translatePage();

      // Update i18n-select elements if any
      const selectors = document.querySelectorAll('.i18n-select');
      selectors.forEach(s => s.value = lang);

      // Notify other components (like AI chat)
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    } catch (error) {
      console.error('I18n Error:', error);
      // Fallback
      if (lang !== 'en') {
        this.loadLanguage('en');
      }
    }
  },

  setLanguage(lang) {
    // Asynchronously load and set the new language
    this.loadLanguage(lang);
  },

  translatePage() {
    if (Object.keys(this.translations).length === 0) return;

    // Translate elements with data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.get(key);
      
      if (text !== key) { // Found a translation
        // Special case: check if it's an input/placeholder
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = text;
        } else if (el.tagName === 'OPTION') {
          el.text = text;
        } else {
          el.innerHTML = text;
        }
      }
    });

    // Translate specifically named attributes if needed
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.get(key);
      if (text !== key) el.placeholder = text;
    });

    const titles = document.querySelectorAll('[data-i18n-title]');
    titles.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = this.get(key);
      if (text !== key) el.title = text;
    });
  },

  setupSelectors() {
    const selectors = document.querySelectorAll('.i18n-select');
    selectors.forEach(select => {
      select.value = this.currentLang;
      select.onchange = (e) => this.setLanguage(e.target.value);
    });
  },

  get(key, params = {}) {
    // Resolve nested keys if needed (e.g., 'nav.nav_login') - currently flat structure but good practice
    let value = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), this.translations);
    
    // If not found, return the key itself
    if (value == null) return key;

    // Handle variable interpolation: {{name}} -> Pramod
    Object.keys(params).forEach(p => {
      value = value.replace(new RegExp(`{{${p}}}`, 'g'), params[p]);
    });
    
    return value;
  },

  getDataT(val) {
    if (!val) return val;
    const dataSection = this.translations.data || {};
    // Try exact or case-insensitive match
    if (dataSection[val]) return dataSection[val];
    const lowerVal = val.toString().toLowerCase();
    const foundKey = Object.keys(dataSection).find(k => k.toLowerCase() === lowerVal);
    return foundKey ? dataSection[foundKey] : val;
  }
};

// Initialize on load
window.addEventListener('load', () => i18n.init());
window.i18n = i18n;
