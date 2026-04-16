import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, LogIn, Menu, X, ChevronDown, Home, ShoppingBag, Leaf, Brain, LayoutDashboard } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
  const { lang, setLanguage, t } = useI18n();
  const location = useLocation();
  const profile = JSON.parse(localStorage.getItem('mc_profile') || 'null');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('mc_profile');
    window.location.href = '/login';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const navItemClass = "text-sm font-semibold hover:text-accent transition-all duration-300 relative group py-2 px-1";
  const navItemActiveLine = "absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full";

  const isHomePage = location.pathname === '/';

  return (
    <>
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${(isScrolled || !isHomePage || isMobileMenuOpen)
        ? "bg-white/90 backdrop-blur-xl border-b border-slate-200 py-3 shadow-premium text-slate-900"
        : "bg-transparent py-5 text-white"
      }`}>
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 md:w-12 md:h-12 transition-all duration-500 group-hover:scale-110 drop-shadow-md">
            <img src="/logo.png" alt="Agri Mitra Logo" className="w-full h-full object-cover rounded-xl md:rounded-2xl" />
          </div>
          <div className="flex flex-col">
            <span
              dangerouslySetInnerHTML={{ __html: t('nav_brand') }}
              className={`text-lg md:text-2xl font-heading font-black tracking-tighter leading-none ${(isScrolled || !isHomePage || isMobileMenuOpen) ? "text-primary-dark" : "text-white"
                }`}
            />
            <span className={`text-[8px] md:text-[9px] uppercase font-bold tracking-[0.2em] mt-0.5 md:mt-1 ${(isScrolled || !isHomePage || isMobileMenuOpen) ? "text-primary" : "text-accent"
              }`}>
              {t('nav_smart_farming')}
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {profile ? (
            <div className="flex items-center gap-8">
              {profile.role === 'farmer' ? (
                <>
                  <Link to="/farmer-dash" className={navItemClass}>{t('nav_dashboard')}<span className={navItemActiveLine} /></Link>
                  <Link to="/add-crop" className={navItemClass}>{t('list_crops')}<span className={navItemActiveLine} /></Link>
                  <Link to="/spoilage-rescue" className="text-sm font-bold flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-1.5 rounded-full hover:bg-red-50 rounded-full transition-all border border-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {t('nav_rescue')}
                  </Link>
                  <Link to="/ai-predictor" className={navItemClass}>{t('nav_ai_predictor')}<span className={navItemActiveLine} /></Link>
                  <Link to="/orders" className={navItemClass}>{t('nav_orders')}<span className={navItemActiveLine} /></Link>
                </>
              ) : (
                <>
                  <Link to="/marketplace" className={navItemClass}>{t('nav_marketplace')}<span className={navItemActiveLine} /></Link>
                  <Link to="/spoilage-rescue" className={navItemClass}>{t('nav_rescue')}<span className={navItemActiveLine} /></Link>
                  <Link to="/ai-predictor" className={navItemClass}>{t('nav_ai_predictor')}<span className={navItemActiveLine} /></Link>
                  <Link to="/orders" className={navItemClass}>{t('nav_orders')}<span className={navItemActiveLine} /></Link>
                </>
              )}
            </div>
          ) : null}

          <div className="flex items-center gap-4 pl-4 border-l border-white/20">
            <div className="relative group">
              <select
                value={lang}
                onChange={(e) => setLanguage(e.target.value)}
                className={`bg-white/10 hover:bg-white/20 border border-white/20 rounded-full pl-8 pr-4 py-1.5 text-xs font-bold outline-none cursor-pointer appearance-none transition-all ${(isScrolled || !isHomePage) ? "text-slate-700 bg-slate-100 border-slate-200" : "text-white"
                  }`}
              >
                <option value="en" className="text-black">EN</option>
                <option value="hi" className="text-black">हिन्दी</option>
                <option value="kn" className="text-black">ಕನ್ನಡ</option>
              </select>
              <Globe className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70 ${(isScrolled || !isHomePage) ? "text-slate-700" : "text-white"
                }`} />
            </div>

            {profile && <NotificationCenter userId={profile.id} />}

            {profile ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="group flex items-center gap-3 p-1 pr-3 rounded-full bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all duration-300"
                >
                  <div className="w-8 h-8 rounded-full bg-accent text-white font-bold text-xs flex items-center justify-center shadow-md">
                    {getInitials(profile.full_name || profile.name)}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showDropdown ? "rotate-180" : ""}`} />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-3 w-56 glass-card !p-2 !rounded-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="px-4 py-3 border-b border-slate-100 mb-1">
                      <div className="font-bold text-slate-800 text-sm truncate">{profile.full_name || profile.name}</div>
                      <div className="text-[10px] uppercase tracking-widest font-black text-primary mt-0.5">{profile.role}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                    >
                      {t('sign_out') || 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-accent btn-sm !px-6">
                <LogIn className="w-4 h-4" /> {t('nav_login')}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden p-2 relative z-[110] transition-colors ${isMobileMenuOpen ? "text-slate-900" : (isScrolled || !isHomePage ? "text-slate-900" : "text-white")}`}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

    </nav>
    
    {/* Mobile Menu Backdrop */}
    {isMobileMenuOpen && (
      <div 
        className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] transition-opacity duration-300"
        onClick={() => setIsMobileMenuOpen(false)}
      />
    )}

    {/* Mobile Drawer */}
    {isMobileMenuOpen && (
      <div className="lg:hidden fixed top-0 right-0 bottom-0 w-[280px] bg-white z-[100] shadow-[-10px_0_30px_-5px_rgba(0,0,0,0.1)] border-l border-slate-100 animate-slide-in-right flex flex-col">
        {/* Internal Close Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col h-full pt-16 px-6 pb-8 overflow-y-auto">
          <div className="flex flex-col gap-1">
             <div className="mb-4 px-2">
                <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-6">{t('menu') || 'Navigation'}</div>
                <div className="flex flex-col gap-3">
                  <Link to="/" className="text-lg font-bold text-slate-900 p-2 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                    <Home className="w-5 h-5 text-primary" /> {t('nav_home')}
                  </Link>
                  <Link to="/marketplace" className="text-lg font-bold text-slate-900 p-2 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-primary" /> {t('nav_marketplace')}
                  </Link>
                  <Link to="/spoilage-rescue" className="text-lg font-bold text-slate-900 p-2 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                    <Leaf className="w-5 h-5 text-red-500" /> {t('nav_rescue')}
                  </Link>
                  <Link to="/ai-predictor" className="text-lg font-bold text-slate-900 p-2 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                    <Brain className="w-5 h-5 text-accent" /> {t('nav_ai_predictor')}
                  </Link>
                  {profile?.role === 'farmer' && (
                    <Link to="/farmer-dash" className="text-lg font-bold text-slate-900 p-2 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                      <LayoutDashboard className="w-5 h-5 text-primary" /> {t('nav_dashboard')}
                    </Link>
                  )}
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-8">
                <div className="px-2">
                  <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4">{t('settings') || 'Settings'}</div>
                   <div className="flex flex-col gap-3">
                      <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-200/50 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-black text-slate-800 text-xs uppercase tracking-widest">{t('language') || 'Language'}</span>
                        </div>
                        <div className="flex p-1 bg-white border border-slate-100 rounded-2xl shadow-inner gap-1">
                          {['en', 'hi', 'kn'].map(l => (
                            <button 
                              key={l} 
                              onClick={() => setLanguage(l)}
                              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${lang === l 
                                ? 'bg-primary text-white shadow-lg' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                   </div>
                </div>

                <div className="px-2 mt-auto">
                   {profile ? (
                     <div className="p-5 bg-slate-900 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="flex items-center gap-4 relative z-10 overflow-hidden">
                           <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-black text-sm border-2 border-slate-700 shadow-lg">
                             {getInitials(profile.full_name || profile.name)}
                           </div>
                           <div className="overflow-hidden">
                              <div className="text-white font-black text-base truncate leading-tight tracking-tight">{profile.full_name || profile.name}</div>
                              <div className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mt-1">{profile.role}</div>
                           </div>
                        </div>
                        <button onClick={handleLogout} className="p-3 text-red-400 hover:bg-red-500/20 rounded-2xl transition-all relative z-10 active:scale-95" title="Logout">
                          <LogIn className="w-5 h-5 rotate-180" />
                        </button>
                     </div>
                   ) : (
                     <Link to="/login" className="btn btn-primary w-full py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 rounded-[2rem] flex items-center justify-center gap-4 hover:-translate-y-1 transition-all">
                       <LogIn className="w-5 h-5" /> {t('nav_login')}
                     </Link>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

const Footer = () => {
  const { t } = useI18n();
  return (
    <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 text-center md:text-left">
          <div className="md:col-span-2">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-0.5 overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-heading font-black text-white tracking-tighter">
                Agri<span className="text-accent">-Mitra</span>
              </span>
            </div>
            <p className="max-w-sm text-slate-400 leading-relaxed font-medium">
              Empowering the agricultural back-bone of our nation with technology that ensures fair trade and transparency.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Platform</h4>
            <ul className="space-y-4 font-medium text-sm">
              <li><Link to="/marketplace" className="hover:text-accent transition-colors">Marketplace</Link></li>
              <li><Link to="/ai-predictor" className="hover:text-accent transition-colors">AI Predictor</Link></li>
              <li><Link to="/spoilage-rescue" className="hover:text-accent transition-colors">Spoilage Rescue</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Support</h4>
            <ul className="space-y-4 font-medium text-sm">
              <li><a href="#" className="hover:text-accent transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold uppercase tracking-widest">
          <p>© 2026 Agri-Mitra. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Navbar, Footer };
