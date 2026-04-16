import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Package, Plus, TrendingUp, Clock, Trash2, Edit2, AlertCircle, LayoutDashboard, X, Save, ImageIcon, AlertTriangle, Info, CheckCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const FarmerDashboard = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [myCrops, setMyCrops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [editData, setEditData] = useState({});
  const [errors, setErrors] = useState({});
  const profile = JSON.parse(localStorage.getItem('mc_profile') || '{}');

  // Payout / Onboarding state
  const [isFarmerOnboarded, setIsFarmerOnboarded] = useState(false);
  const [isSimulatedAccount, setIsSimulatedAccount] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [bankData, setBankData] = useState({ bank_account: '', ifsc: '', name: profile.full_name || '' });
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Spoilage Rescue state
  const [rescueListings, setRescueListings] = useState([]);
  const [rescueModal, setRescueModal] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [rescueErrors, setRescueErrors] = useState({});
  const [rescueSuccess, setRescueSuccess] = useState('');
  const [rescueForm, setRescueForm] = useState({
    crop_name: '',
    quantity_kg: '',
    original_price_per_kg: '',
    discount_percent: 30,
    shelf_life_hours: 24,
    description: '',
  });

  const discountedPrice = rescueForm.original_price_per_kg
    ? (rescueForm.original_price_per_kg * (1 - rescueForm.discount_percent / 100)).toFixed(2)
    : '0.00';

  const fetchDashboardData = async () => {
    setLoading(true);
    const [cropsRes, ordersRes, rescueRes] = await Promise.all([
      api.getCropsByFarmer(profile.id),
      api.getOrdersByFarmer(profile.id),
      api.getSpoilageByFarmer(profile.id),
    ]);

    if (cropsRes.success) setMyCrops(cropsRes.data);
    if (ordersRes.success) {
      setOrders(ordersRes.data);
      const pending = ordersRes.data.filter(o => o.status === 'pending').length;
      setPendingCount(pending);
    }
    if (rescueRes.success) setRescueListings(rescueRes.data);

    // Check onboarding status properly from the new endpoint
    const statusRes = await api.getOnboardStatus(profile.id);
    if (statusRes.success && statusRes.onboarded) {
      setIsFarmerOnboarded(true);
      setIsSimulatedAccount(statusRes.is_simulated);
      if (statusRes.data) {
        setBankData({
          bank_account: statusRes.data.bank_account_number || '',
          ifsc: statusRes.data.ifsc_code || '',
          name: profile.full_name || ''
        });
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (profile.id) fetchDashboardData();
    else if (!loading) setLoading(false); // Stop loading if no profile
  }, [profile.id]);

  const handleDelete = async (id) => {
    if (await showConfirm(t('delete') + '?')) {
      const res = await api.deleteCrop(id);
      if (res.success) {
        fetchDashboardData();
      } else {
        showToast(res.error || "Failed to delete crop listing.", "error");
      }
    }
  };

  const handleEditOpen = (crop) => {
    setEditModal(crop);
    setErrors({});
    setEditData({
      crop_name: crop.crop_name,
      quantity_kg: crop.quantity_kg || crop.quantity,
      price_per_kg: crop.price_per_kg || crop.price_per_unit,
      harvest_date: crop.harvest_date,
      farmer_location: crop.farmer_location || crop.location,
      is_available: crop.is_available,
      image_url: crop.image_url
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, image_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSave = async () => {
    const newErrors = {};
    if (!editData.crop_name || editData.crop_name.trim() === '') {
      newErrors.crop_name = t('err_enter_crop') || 'Crop name is required.';
    }
    // Allow 0 for quantity - specifically for restocking later
    if (editData.quantity_kg === undefined || editData.quantity_kg === '' || Number(editData.quantity_kg) < 0) {
      newErrors.quantity_kg = t('err_enter_qty') || 'Quantity must be >= 0.';
    }
    if (!editData.price_per_kg || Number(editData.price_per_kg) <= 0) {
      newErrors.price_per_kg = t('err_enter_price') || 'Price must be > 0.';
    }
    if (!editData.harvest_date) {
      newErrors.harvest_date = 'Harvest date is required.';
    }
    if (!editData.farmer_location || editData.farmer_location.trim() === '') {
      newErrors.farmer_location = 'Location is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Use ._id if present, fallback to .id
    const targetId = editModal._id || editModal.id;
    const res = await api.updateCrop(targetId, {
      ...editData,
      is_available: editData.is_available && Number(editData.quantity_kg) > 0
    });
    
    if (res.success) {
      showToast(t('updated_successfully') || 'Updated successfully!', 'success');
      setEditModal(null);
      fetchDashboardData();
    } else {
      setErrors({ submit: res.error || (t('err_update') || 'Failed to update') });
    }
  };

  // Rescue handlers
  const handleRescueChange = (e) => {
    const { name, value } = e.target;
    setRescueForm(prev => ({ ...prev, [name]: value }));
    if (rescueErrors[name]) setRescueErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleRescueSubmit = async () => {
    const newErrors = {};
    if (!rescueForm.crop_name.trim()) newErrors.crop_name = 'Crop name is required.';
    if (!rescueForm.quantity_kg || Number(rescueForm.quantity_kg) <= 0) newErrors.quantity_kg = 'Valid quantity required.';
    if (!rescueForm.original_price_per_kg || Number(rescueForm.original_price_per_kg) <= 0) newErrors.original_price_per_kg = 'Original price required.';
    if (Number(rescueForm.discount_percent) < 20) newErrors.discount_percent = 'Minimum 20% discount required.';
    if (Number(rescueForm.shelf_life_hours) > 72) newErrors.shelf_life_hours = 'Must be 72 hours or less.';

    if (Object.keys(newErrors).length > 0) { setRescueErrors(newErrors); return; }
    setRescueErrors({});
    setRescueLoading(true);

    const payload = {
      farmer_id: profile.id,
      farmer_name: profile.full_name || profile.name,
      farmer_phone: profile.phone,
      farmer_location: profile.location,
      crop_name: rescueForm.crop_name,
      quantity_kg: Number(rescueForm.quantity_kg),
      original_price_per_kg: Number(rescueForm.original_price_per_kg),
      discounted_price_per_kg: Number(discountedPrice),
      discount_percent: Number(rescueForm.discount_percent),
      shelf_life_hours: Number(rescueForm.shelf_life_hours),
      description: rescueForm.description,
    };

    const res = await api.addSpoilageListing(payload);
    setRescueLoading(false);
    if (res.success) {
      setRescueModal(false);
      setRescueForm({ crop_name: '', quantity_kg: '', original_price_per_kg: '', discount_percent: 30, shelf_life_hours: 24, description: '' });
      setRescueSuccess('✅ At-risk crop listed on Rescue Network! Retailers will be notified.');
      fetchDashboardData();
      setTimeout(() => setRescueSuccess(''), 5000);
    } else {
      setRescueErrors({ submit: res.error || 'Failed to create rescue listing.' });
    }
  };

  const handleRescueDelete = async (id) => {
    if (await showConfirm('Remove this rescue listing?')) {
      await api.deleteSpoilageListing(id);
      fetchDashboardData();
    }
  };

  const handleRescueMarkSold = async (id) => {
    await api.updateSpoilageListing(id, { status: 'sold', is_available: false });
    fetchDashboardData();
  };

  const handlePayoutSubmit = async () => {
    if (!bankData.bank_account || !bankData.ifsc) {
      showToast("Please enter both account number and IFSC code.", "error");
      return;
    }
    setPayoutLoading(true);
    const res = await api.onboardFarmer({
      farmer_id: profile.id,
      bank_account: bankData.bank_account,
      ifsc: bankData.ifsc,
      name: bankData.name
    });
    setPayoutLoading(true);
    if (res.success) {
      setIsFarmerOnboarded(true);
      setShowPayoutModal(false);
      showToast("Bank account linked successfully! You are now ready for direct secure payouts.", "success");
      fetchDashboardData();
    } else {
      showToast("Onboarding failed: " + res.error, "error");
    }
    setPayoutLoading(false);
  };

  const getFinancialStats = () => {
    const netEarnings = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (Number(o.total_price) || (o.quantity_kg * o.price_per_kg) || 0), 0);
    
    const pendingPayouts = orders
      .filter(o => ['paid', 'transit'].includes(o.status))
      .reduce((sum, o) => sum + (Number(o.total_price) || (o.quantity_kg * o.price_per_kg) || 0), 0);
      
    const potentialRevenue = orders
      .filter(o => o.status === 'accepted')
      .reduce((sum, o) => sum + (Number(o.total_price) || (o.quantity_kg * o.price_per_kg) || 0), 0);

    return { netEarnings, pendingPayouts, potentialRevenue };
  };

  const stats = getFinancialStats();

  if (loading) return <div className="p-20 text-center text-primary font-bold">{t('analyzing_data') || 'Loading Dashboard...'}</div>;

  return (
    <div className="container mx-auto py-12 px-4 relative">
      {/* Decorative Background Elements */}
      <div className="hero-blob w-[500px] h-[500px] bg-primary -top-48 -left-48"></div>
      <div className="hero-blob w-[400px] h-[400px] bg-accent -bottom-48 -right-48 opacity-10"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-black text-primary-dark tracking-tight leading-tight">
            Hello, <span className="text-gradient">{profile.full_name?.split(' ')[0] || 'Farmer'}</span>
          </h1>
          <p className="text-text-muted font-medium text-lg">{t('dashboard_subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/ai-predictor" className="btn btn-outline border-primary/20 bg-white/50 backdrop-blur-sm group px-8">
            <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
            <span className="font-bold">{t('ai_predictor_btn')}</span>
          </Link>
          <Link to="/add-crop" className="btn btn-primary px-8 shadow-xl shadow-primary/20">
            <Plus className="w-5 h-5" /> 
            <span className="font-bold">{t('add_crop_btn')}</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <div className="card-premium group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-success bg-success/10 px-2 py-1 rounded-full">+12%</span>
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('active_listings')}</h3>
          <div className="text-4xl font-black text-primary-dark">{myCrops.filter(c => c.is_available).length}</div>
        </div>

        <div className="card-premium group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300">
              <Clock className="w-6 h-6" />
            </div>
            {pendingCount > 0 && <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
            </span>}
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-text-muted mb-1">{t('pending_orders')}</h3>
          <div className="text-4xl font-black text-primary-dark">{pendingCount}</div>
        </div>

        <div className="card-premium lg:col-span-2 bg-primary-dark !text-white border-none group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row h-full justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-widest opacity-60">{t('earnings_summary')}</h3>
              <div className="text-4xl md:text-5xl font-black text-accent flex items-baseline gap-2">
                <span className="text-2xl opacity-60">₹</span>
                {stats.netEarnings.toLocaleString()}
              </div>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{t('settlement_desc')}</p>
            </div>
            <div className="flex flex-col gap-3 justify-center min-w-[200px]">
               <div className="flex items-center justify-between text-sm bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="opacity-60 font-bold">{t('pending_payouts')}</span>
                  <span className="font-black text-accent">₹{stats.pendingPayouts.toLocaleString()}</span>
               </div>
               <div className="flex items-center justify-between text-sm bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="opacity-60 font-bold">{t('potential_revenue')}</span>
                  <span className="font-black text-primary-light">₹{stats.potentialRevenue.toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Persistence Payout Status Row */}
      <div className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className={`glass-card ${isFarmerOnboarded && !isSimulatedAccount ? 'border-success/30' : isSimulatedAccount ? 'border-accent/30' : 'border-info/30'} !p-8 flex items-center justify-between group overflow-hidden relative`}>
            <div className={`absolute top-0 left-0 w-2 h-full ${isFarmerOnboarded && !isSimulatedAccount ? 'bg-success' : isSimulatedAccount ? 'bg-accent animate-pulse' : 'bg-info'}`}></div>
            <div className="flex items-center gap-6">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${isFarmerOnboarded && !isSimulatedAccount ? 'bg-success shadow-success/20' : isSimulatedAccount ? 'bg-accent shadow-accent/20' : 'bg-info shadow-info/20 animate-pulse'}`}>
                  <CreditCard className="w-7 h-7" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-primary-dark uppercase tracking-tight">
                    {isFarmerOnboarded ? (isSimulatedAccount ? 'Demo Mode (Upgrade Live)' : 'Payouts Secured') : 'Enable Direct Payouts'}
                  </h3>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mt-1">
                     {isFarmerOnboarded 
                       ? (isSimulatedAccount ? 'Real payouts are currently disabled' : `Linked: Account ending in ...${bankData.bank_account.slice(-4)}`) 
                       : 'Link bank account for automated fund release'}
                  </p>
               </div>
            </div>
            <button 
              onClick={() => setShowPayoutModal(true)}
              className={`btn ${isFarmerOnboarded ? (isSimulatedAccount ? 'btn-accent animate-bounce' : 'btn-outline border-success/30 text-success bg-success/5') : 'btn-primary'} px-8 font-black uppercase text-xs tracking-widest z-10`}
            >
              {isFarmerOnboarded ? (isSimulatedAccount ? 'UPGRADE NOW' : 'Manage') : 'Setup Now'}
            </button>
         </div>

         <div className="glass-card-dark !p-8 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-accent opacity-5 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
            <div className="flex items-center gap-6 relative z-10">
               <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                  <ShieldCheck className="w-7 h-7 text-accent" />
               </div>
               <div>
                  <h3 className="text-xl font-black uppercase text-accent tracking-tight">Escrow Protected</h3>
                  <p className="text-xs font-bold opacity-60 uppercase tracking-wider mt-1">Funds are held securely until verification</p>
               </div>
            </div>
            <Link to="/orders" className="text-white/40 hover:text-white transition-colors">
              <Plus className="w-8 h-8 rotate-45" />
            </Link>
         </div>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-black text-primary-dark uppercase tracking-tight flex items-center gap-4">
          <span className="w-12 h-1 bg-primary rounded-full"></span>
          {t('my_listings')}
        </h2>
      </div>

      {myCrops.length === 0 ? (
        <div className="card-premium text-center py-24 bg-white/50 backdrop-blur-sm border-dashed">
          <div className="w-20 h-20 bg-bg rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-text-muted/30" />
          </div>
          <h3 className="text-2xl font-black text-text-muted mb-6">{t('no_orders_yet') === 'No orders yet' ? 'No crops listed' : t('no_orders_yet')}</h3>
          <Link to="/add-crop" className="btn btn-primary px-12 rounded-full font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">{t('add_new')}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {myCrops.map(crop => (
            <div key={crop._id} className="card-premium group !p-0">
               <div className="relative h-48 overflow-hidden">
                  {crop.image_url ? (
                    <img src={crop.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={crop.crop_name} />
                  ) : (
                    <div className="w-full h-full bg-bg flex items-center justify-center text-5xl">🌱</div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${crop.is_available ? 'bg-success/80 text-white border-success/20' : 'bg-danger/80 text-white border-danger/20'}`}>
                      {crop.is_available ? t('available') : t('out_of_stock')}
                    </span>
                  </div>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-2xl font-black text-primary-dark tracking-tight">{(crop.crop_name && t(`data.${crop.crop_name}`) !== `data.${crop.crop_name}`) ? t(`data.${crop.crop_name}`) : crop.crop_name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-lg font-black text-primary">₹{crop.price_per_unit || 0}</span>
                       <span className="text-xs font-bold text-text-muted uppercase tracking-widest">/ {(crop.unit && t(`data.${crop.unit}`)) || crop.unit || 'kg'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-widest pt-4 border-t border-slate-50">
                     <span>Stock: {crop.quantity || 0} {crop.unit || 'kg'}</span>
                     <div className="flex gap-2">
                        <button onClick={() => handleEditOpen(crop)} className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-primary-light hover:bg-primary-light hover:text-white transition-all duration-300">
                           <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(crop._id)} className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-danger hover:bg-danger hover:text-white transition-all duration-300">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-20 mb-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-black text-danger uppercase tracking-tight flex items-center gap-4">
              <span className="w-12 h-1 bg-danger rounded-full"></span>
              {t('spoilage_rescue')}
            </h2>
            <p className="text-text-muted font-medium mt-2">{t('spoilage_rescue_desc')}</p>
          </div>
          <button
            onClick={() => { setRescueModal(true); setRescueErrors({}); }}
            className="btn bg-danger text-white px-8 py-4 shadow-xl shadow-danger/20 group"
          >
            <AlertTriangle className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
            {t('report_at_risk')}
          </button>
        </div>

        {rescueSuccess && (
          <div className="mb-8 p-6 bg-success/5 border border-success/20 rounded-3xl flex items-center gap-4 text-success font-bold animate-in slide-in-from-top-4">
            <div className="w-10 h-10 bg-success text-white rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            {t('rescue_msg')}
          </div>
        )}

        {rescueListings.length === 0 ? (
          <div className="card-premium text-center py-20 border-dashed border-danger/20 bg-danger/[0.02]">
            <div className="w-16 h-16 bg-danger/5 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-xl font-bold text-text-muted">{t('no_orders_yet')}</h3>
            <p className="text-sm text-text-muted/60 mt-1 max-w-xs mx-auto">{t('spoilage_rescue_desc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rescueListings.map(item => (
              <div key={item.id}
                className={`card-premium !p-0 border-l-8 ${
                  item.status === 'sold' ? 'border-l-slate-300 opacity-60' :
                  item.shelf_life_hours <= 12 ? 'border-l-danger' :
                  item.shelf_life_hours <= 24 ? 'border-l-accent' : 'border-l-warning'
                }`}
              >
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black text-primary-dark">{(item.crop_name && t(`data.${item.crop_name}`) !== `data.${item.crop_name}`) ? t(`data.${item.crop_name}`) : item.crop_name}</h3>
                      <div className="badge-premium bg-slate-100 border-slate-200 text-text-muted mt-2">{item.quantity_kg} kg {t('quantity_label')}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'sold' ? 'bg-slate-100 text-slate-500' :
                      item.status === 'expired' ? 'bg-slate-200 text-slate-600' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {item.status === 'sold' ? '✓ ' + t('done') : item.status === 'expired' ? 'Expired' : t('active')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-bg p-4 rounded-2xl">
                    <div className="space-y-1 text-center border-r border-slate-200">
                      <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('rescue_price')}</div>
                      <div className="text-lg font-black text-success">₹{item.discounted_price_per_kg}</div>
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('shelf_life')}</div>
                      <div className={`text-lg font-black ${
                        item.shelf_life_hours <= 12 ? 'text-danger' :
                        item.shelf_life_hours <= 24 ? 'text-accent' : 'text-warning'
                      }`}>{item.shelf_life_hours}h</div>
                    </div>
                  </div>

                  {item.status === 'active' && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleRescueMarkSold(item.id)}
                        className="flex-1 btn btn-outline !py-2 !px-0 bg-success/5 border-success/20 text-success hover:bg-success hover:text-white transition-all text-xs"
                      >
                        <CheckCircle className="w-3 h-3" /> {t('mark_sold')}
                      </button>
                      <button
                        onClick={() => handleRescueDelete(item.id)}
                        className="btn btn-outline !py-2 !px-3 border-danger/20 text-danger hover:bg-danger hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="card bg-white w-full max-md p-8 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-black flex items-center gap-2"><Edit2 className="w-6 h-6 text-primary"/> {t('edit_listing_title')}</h2>
              <button onClick={() => setEditModal(null)} className="p-1 hover:bg-bg rounded"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2 block">{t('crop_name')}</label>
                <input 
                  className={`w-full p-3 rounded-small border-2 ${errors.crop_name ? 'border-red-500' : 'border-primary/10'} font-bold outline-none focus:border-primary`}
                  value={editData.crop_name || ''}
                  onChange={(e) => {
                    setEditData({...editData, crop_name: e.target.value});
                    if (errors.crop_name) setErrors({...errors, crop_name: null});
                  }}
                />
                {errors.crop_name && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-widest">{errors.crop_name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2 block">{t('quantity_label')}</label>
                  <input 
                    type="number"
                    className={`w-full p-3 rounded-small border-2 ${errors.quantity_kg ? 'border-red-500' : 'border-primary/10'} font-bold outline-none focus:border-primary`}
                    value={editData.quantity_kg !== undefined ? editData.quantity_kg : ''}
                    onChange={(e) => {
                      setEditData({...editData, quantity_kg: e.target.value});
                      if (errors.quantity_kg) setErrors({...errors, quantity_kg: null});
                    }}
                  />
                  {errors.quantity_kg && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-widest">{errors.quantity_kg}</p>}
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2 block">{t('price_per_unit')}</label>
                  <input 
                    type="number"
                    className={`w-full p-3 rounded-small border-2 ${errors.price_per_kg ? 'border-red-500' : 'border-primary/10'} font-bold outline-none focus:border-primary`}
                    value={editData.price_per_kg || ''}
                    onChange={(e) => {
                      setEditData({...editData, price_per_kg: e.target.value});
                      if (errors.price_per_kg) setErrors({...errors, price_per_kg: null});
                    }}
                  />
                  {errors.price_per_kg && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-widest">{errors.price_per_kg}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2 block">{t('harvest_date_label')}</label>
                  <input 
                    type="date"
                    className={`w-full p-3 rounded-small border-2 ${errors.harvest_date ? 'border-red-500' : 'border-primary/10'} font-bold outline-none focus:border-primary text-sm`}
                    value={editData.harvest_date || ''}
                    onChange={(e) => {
                      setEditData({...editData, harvest_date: e.target.value});
                      if (errors.harvest_date) setErrors({...errors, harvest_date: null});
                    }}
                  />
                  {errors.harvest_date && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-widest">{errors.harvest_date}</p>}
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2 block">{t('location')}</label>
                  <input 
                    className={`w-full p-3 rounded-small border-2 ${errors.farmer_location ? 'border-red-500' : 'border-primary/10'} font-bold outline-none focus:border-primary text-sm`}
                    value={editData.farmer_location || ''}
                    onChange={(e) => {
                      setEditData({...editData, farmer_location: e.target.value});
                      if (errors.farmer_location) setErrors({...errors, farmer_location: null});
                    }}
                  />
                    {errors.farmer_location && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-widest">{errors.farmer_location}</p>}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-large border border-primary/10">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-primary-dark block mb-1">Listing Status</label>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Make this crop visible to retailers</p>
                </div>
                <button 
                  onClick={() => setEditData({...editData, is_available: !editData.is_available})}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editData.is_available ? 'bg-success' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editData.is_available ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              
              <div className="relative p-4 bg-primary/5 rounded-large border border-dashed border-primary/20 flex flex-col items-center gap-3 overflow-hidden group/img">
                 {editData.image_url ? (
                   <img src={editData.image_url} className="w-full h-32 object-cover rounded-md mb-2" />
                 ) : (
                   <ImageIcon className="w-8 h-8 text-primary opacity-40" />
                 )}
                 <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-70">
                   {editData.image_url ? t('change_photo') : t('upload_photo_label')}
                 </span>
                 <input 
                   type="file" 
                   accept="image/*" 
                   className="absolute inset-0 opacity-0 cursor-pointer" 
                   onChange={handleImageChange}
                 />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditModal(null)} className="flex-1 btn btn-outline py-4">{t('cancel')}</button>
              <button onClick={handleEditSave} className="flex-[2] btn btn-primary py-4 gap-2 font-black uppercase">
                <Save className="w-5 h-5"/> {t('save_changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== RESCUE MODAL ====== */}
      {rescueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="card bg-white w-full max-lg p-8 animate-in slide-in-from-bottom-5 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                  <AlertTriangle className="w-2.5 h-2.5" /> {t('spoilage_rescue')}
                </div>
                <h2 className="text-2xl font-heading font-black text-green-900">{t('report_at_risk')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('spoilage_rescue_desc')}</p>
              </div>
              <button onClick={() => setRescueModal(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Crop Name */}
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-green-900 mb-2 block">{t('crop_name')}</label>
                <input
                  name="crop_name"
                  className={`w-full p-3 rounded-xl border-2 ${rescueErrors.crop_name ? 'border-red-500' : 'border-gray-200'} font-bold outline-none focus:border-red-500 transition-all`}
                  placeholder="e.g. Tomato, Onion, Cabbage..."
                  value={rescueForm.crop_name}
                  onChange={handleRescueChange}
                />
                {rescueErrors.crop_name && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{rescueErrors.crop_name}</p>}
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-green-900 mb-2 block">{t('quantity_label')}</label>
                <input
                  name="quantity_kg" type="number" min="1"
                  className={`w-full p-3 rounded-xl border-2 ${rescueErrors.quantity_kg ? 'border-red-500' : 'border-gray-200'} font-bold outline-none focus:border-red-500 transition-all`}
                  placeholder="Amount in kg"
                  value={rescueForm.quantity_kg}
                  onChange={handleRescueChange}
                />
                {rescueErrors.quantity_kg && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{rescueErrors.quantity_kg}</p>}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-green-900 mb-2 block">{t('original')} (₹)</label>
                  <input
                    name="original_price_per_kg" type="number" min="1"
                    className={`w-full p-3 rounded-xl border-2 ${rescueErrors.original_price_per_kg ? 'border-red-500' : 'border-gray-200'} font-bold outline-none focus:border-red-500 transition-all`}
                    placeholder="₹"
                    value={rescueForm.original_price_per_kg}
                    onChange={handleRescueChange}
                  />
                  {rescueErrors.original_price_per_kg && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{rescueErrors.original_price_per_kg}</p>}
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-green-900 mb-2 block">{t('discount')} (%)</label>
                  <select
                    name="discount_percent"
                    className="w-full p-3 rounded-xl border-2 border-gray-200 font-bold outline-none focus:border-red-500 transition-all bg-white"
                    value={rescueForm.discount_percent}
                    onChange={handleRescueChange}
                  >
                    {[20, 25, 30, 35, 40, 45, 50, 60, 70].map(d => (
                      <option key={d} value={d}>{d}% OFF</option>
                    ))}
                  </select>
                  {rescueErrors.discount_percent && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{rescueErrors.discount_percent}</p>}
                </div>
              </div>

              {/* Price Preview */}
              <div className="flex items-center justify-between bg-red-50 rounded-xl p-4 border border-red-100">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('rescue_price')}</div>
                  <div className="text-2xl font-black text-green-800">₹{discountedPrice}/kg</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-red-600">{rescueForm.discount_percent}% OFF</div>
                  <div className="text-xs text-gray-400 line-through font-bold">₹{rescueForm.original_price_per_kg || '0'}/kg</div>
                </div>
              </div>

              {/* Shelf Life */}
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-green-900 mb-2 block">
                  {t('shelf_life_hours')}
                </label>
                <input
                  name="shelf_life_hours" type="number" min="1" max="72"
                  className={`w-full p-3 rounded-xl border-2 ${rescueErrors.shelf_life_hours ? 'border-red-500' : 'border-gray-200'} font-bold outline-none focus:border-red-500 transition-all`}
                  placeholder="e.g. 24 hours"
                  value={rescueForm.shelf_life_hours}
                  onChange={handleRescueChange}
                />
                {rescueErrors.shelf_life_hours && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{rescueErrors.shelf_life_hours}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-green-900 mb-2 block">{t('description_label')}</label>
                <textarea
                  name="description"
                  className="w-full p-3 rounded-xl border-2 border-gray-200 font-medium outline-none focus:border-red-500 transition-all h-20"
                  placeholder="Condition of produce, storage details, pickup notes..."
                  value={rescueForm.description}
                  onChange={handleRescueChange}
                />
              </div>
            </div>

            {rescueErrors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-bold">
                <Info className="w-4 h-4 flex-shrink-0" /> {rescueErrors.submit}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setRescueModal(false)} className="flex-1 btn btn-outline py-4">{t('cancel')}</button>
              <button
                onClick={handleRescueSubmit}
                disabled={rescueLoading}
                className="flex-[2] py-4 gap-2 font-black text-sm btn text-white flex items-center justify-center"
                style={{ backgroundColor: '#dc2626' }}
              >
                {rescueLoading ? 'Listing...' : t('list_rescue')} <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ====== PAYOUT ONBOARDING MODAL ====== */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="card bg-white w-full max-md p-8 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-black flex items-center gap-3"><CreditCard className="w-8 h-8 text-primary"/> Payout Settings</h2>
              <button onClick={() => setShowPayoutModal(false)} className="p-1 hover:bg-bg rounded"><X className="w-6 h-6"/></button>
            </div>
            
            <p className="text-sm text-text-muted font-bold mb-6">Mandi-Connect uses Razorpay Route to ensure you get paid directly to your bank account as soon as the retailer verifies delivery.</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2 block">Account Holder Name</label>
                <input 
                  className="w-full p-3 rounded-small border-2 border-primary/10 font-bold outline-none focus:border-primary"
                  value={bankData.name}
                  onChange={(e) => setBankData({...bankData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2 block">Bank Account Number</label>
                <input 
                  className="w-full p-3 rounded-small border-2 border-primary/10 font-bold outline-none focus:border-primary"
                  placeholder="Enter your account number"
                  value={bankData.bank_account}
                  onChange={(e) => setBankData({...bankData, bank_account: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-primary-dark mb-2 block">IFSC Code</label>
                <input 
                  className="w-full p-3 rounded-small border-2 border-primary/10 font-bold outline-none focus:border-primary uppercase"
                  placeholder="e.g. SBIN0001234"
                  value={bankData.ifsc}
                  onChange={(e) => setBankData({...bankData, ifsc: e.target.value})}
                />
              </div>
            </div>

            <div className="p-4 bg-info/5 rounded-large border border-info/20 mb-8">
               <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-info flex-shrink-0 mt-1" />
                  <p className="text-[10px] font-bold text-info-dark leading-relaxed uppercase">
                     Data is encrypted and shared only with Razorpay for secure transfers. No bank details are stored in plain text.
                  </p>
               </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPayoutModal(false)} className="flex-1 btn btn-outline py-4">Cancel</button>
              <button onClick={handlePayoutSubmit} disabled={payoutLoading} className="flex-[2] btn btn-primary py-4 gap-2 font-black uppercase shadow-hard">
                {payoutLoading ? "Linking..." : (isFarmerOnboarded ? "Update Account" : "Link Account")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
