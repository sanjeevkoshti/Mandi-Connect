import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Package, Clock, CreditCard, ChevronRight, TrendingUp, AlertCircle, X } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  
  const { t } = useI18n();
  const { showToast } = useToast();
  const profile = JSON.parse(localStorage.getItem('mc_profile') || '{}');

  const fetchOrders = async () => {
    setLoading(true);
    let res;
    if (profile.role === 'farmer') res = await api.getOrdersByFarmer(profile.id);
    else res = await api.getOrdersByRetailer(profile.id);
    
    if (res.success) setOrders(res.data);
    setLoading(false);
  };

  useEffect(() => {
    if (profile.id) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [profile.id, profile.role]);

  const getHarvestTotals = () => {
    const activeOrders = orders.filter(o => ['accepted', 'paid'].includes(o.status));
    const totals = {};
    activeOrders.forEach(o => {
      if (!totals[o.crop_name]) totals[o.crop_name] = { qty: 0, count: 0 };
      totals[o.crop_name].qty += Number(o.quantity_kg) || 0;
      totals[o.crop_name].count += 1;
    });
    return Object.entries(totals).map(([name, data]) => ({ name, ...data }));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'counter_offered': return 'bg-accent/10 text-accent border-accent/20';
      case 'accepted': return 'bg-info/10 text-info border-info/20';
      case 'paid': return 'bg-success/10 text-success border-success/20';
      case 'transit': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'delivered': return 'bg-primary/10 text-primary border-primary/20';
      case 'rejected': return 'bg-danger/10 text-danger border-danger/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  const cropEmoji = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('tomato')) return '🍅';
    if (n.includes('onion')) return '🧅';
    if (n.includes('potato')) return '🥔';
    if (n.includes('wheat') || n.includes('grain')) return '🌾';
    if (n.includes('corn') || n.includes('maize')) return '🌽';
    if (n.includes('carrot')) return '🥕';
    if (n.includes('chilli')) return '🌶️';
    return '🥬';
  };

  if (loading) return <div className="p-20 text-center text-primary font-bold">{t('loading_orders') || 'Loading Orders...'}</div>;

  return (
    <div className="container mx-auto py-12 px-4 relative overflow-hidden">
      <div className="hero-blob w-[400px] h-[400px] bg-primary -top-48 -right-48 opacity-10"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-black text-primary-dark tracking-tight leading-tight uppercase">
            {t('order_management')}
          </h1>
          <p className="text-text-muted font-medium text-lg">{t('manage_trade_desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-6">
          {orders.length === 0 ? (
            <div className="card-premium text-center py-24 bg-white/50 backdrop-blur-sm border-dashed">
              <TrendingUp className="w-20 h-20 text-text-muted/20 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-text-muted mb-2">{t('no_orders_yet')}</h3>
              <p className="text-text-muted/60 max-w-sm mx-auto mb-10">{t('no_orders_desc')}</p>
              <Link to="/marketplace" className="btn btn-primary px-12 rounded-full font-black uppercase text-xs tracking-widest">{t('go_to_marketplace')}</Link>
            </div>
          ) : (
            orders.map((order, idx) => (
              <div key={order.id || idx} className="card-premium group !p-0 overflow-hidden">
                <div className="flex flex-col md:flex-row items-stretch">
                  <div className="md:w-48 h-48 md:h-auto bg-slate-50 relative overflow-hidden flex-shrink-0">
                    {order.image_url ? (
                      <img src={order.image_url} alt={order.crop_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl bg-bg">{cropEmoji(order.crop_name)}</div>
                    )}
                    <div className="absolute top-4 left-4">
                      <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${getStatusColor(order.status)}`}>
                        {t(`status_${order.status}`) || order.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-8 flex flex-col justify-between">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="space-y-2">
                        <Link to={`/order/${order.id}`} className="text-2xl font-black text-primary-dark uppercase hover:text-primary transition-colors tracking-tight block leading-none">
                          {(() => {
                            const rawName = (order.crop_name || '').replace('[RESCUE] ', '');
                            return t(`data.${rawName}`) !== `data.${rawName}` ? t(`data.${rawName}`) : rawName;
                          })()}
                        </Link>
                        <div className="flex gap-4 text-xs font-bold text-text-muted uppercase tracking-widest">
                           <span className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded-lg">
                              <Clock className="w-3.5 h-3.5 opacity-40" /> 
                              {new Date(order.created_at).toLocaleDateString()}
                           </span>
                           <span className="flex items-center gap-2 bg-slate-100/50 px-2 py-1 rounded-lg">
                              <Package className="w-3.5 h-3.5 opacity-40" /> 
                              {order.quantity_kg} kg
                           </span>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-3xl font-black text-primary-dark">
                            <span className="text-lg opacity-40 mr-1">₹</span>
                            {(order.total_price || (order.quantity_kg * order.price_per_kg) || 0).toLocaleString()}
                         </div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-1">Total Transaction</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                       <div className="flex -space-x-3 overflow-hidden">
                          {/* Placeholder avatars for premium look */}
                          <div className="inline-block h-8 w-8 rounded-full ring-4 ring-white bg-primary-light/20 flex items-center justify-center text-[10px] font-black text-primary">FC</div>
                          <div className="inline-block h-8 w-8 rounded-full ring-4 ring-white bg-accent/20 flex items-center justify-center text-[10px] font-black text-accent">RT</div>
                       </div>
                       <Link to={`/order/${order.id}`} className="btn btn-primary px-8 rounded-full font-black text-xs uppercase tracking-widest group">
                          {t('view_details')} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card-dark !p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6">{t('trading_stats')}</h3>
            <div className="space-y-6 relative z-10">
              <div className="space-y-1">
                <div className="text-4xl font-black text-accent">
                   {orders.filter(o => !['delivered', 'rejected'].includes(o.status)).length}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t('active_orders')}</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-black text-white">
                   ₹{orders.reduce((sum, o) => sum + ((o.quantity_kg || 0) * (o.price_per_kg || 0)), 0).toLocaleString()}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 font-bold">{t('total_value')}</div>
              </div>
            </div>
          </div>

          {profile.role === 'farmer' && orders.some(o => ['accepted', 'paid'].includes(o.status)) && (
            <button 
              onClick={() => setShowHarvestModal(true)}
              className="w-full card-premium !p-8 group text-center"
            >
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2">{t('harvest_list')}</h3>
              <p className="text-[10px] font-bold text-text-muted leading-relaxed opacity-60">{t('harvest_desc')}</p>
            </button>
          )}
        </div>
      </div>

      {/* Harvest Summary Modal */}
      {showHarvestModal && (
        <div className="fixed inset-0 bg-primary-dark/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-12 max-w-lg w-full shadow-[0_32px_120px_-20px_rgba(0,0,0,0.5)] border border-white/20 relative">
            <div className="absolute top-8 right-8">
              <button onClick={() => setShowHarvestModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <Package className="w-3 h-3" /> Logistics Ready
              </div>
              <h3 className="text-3xl font-black text-primary-dark uppercase tracking-tight">
                {t('total_harvest_summary') || 'Harvest List'}
              </h3>
            </div>
            
            <div className="space-y-4 mb-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {getHarvestTotals().length > 0 ? (
                getHarvestTotals().map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-6 rounded-[32px] bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-soft transition-all">
                    <div className="flex flex-col">
                      <span className="font-black text-primary-dark uppercase text-base tracking-tight">{t(`data.${item.name}`) !== `data.${item.name}` ? t(`data.${item.name}`) : item.name}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.count} {t('active_orders') || 'Orders'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-primary">{item.qty} <span className="text-[10px] uppercase tracking-widest opacity-60">kg</span></span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-10 font-bold text-slate-400">{t('no_active_to_harvest') || 'No active orders today.'}</p>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  const items = getHarvestTotals();
                  const results = items.map(item => `${item.name}: ${item.qty}kg (${item.count} orders)`);
                  navigator.clipboard.writeText(results.join('\n'));
                  showToast("Copied to clipboard!", "success");
                }}
                className="flex-1 py-5 rounded-3xl border-2 border-slate-100 font-black text-[11px] uppercase tracking-widest hover:border-primary hover:text-primary transition-all"
              >
                Copy List
              </button>
              <button 
                onClick={() => setShowHarvestModal(false)} 
                className="flex-1 btn btn-primary py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-hard"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
