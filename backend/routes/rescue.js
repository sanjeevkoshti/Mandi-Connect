const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// GET all active rescue requests
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rescue_listings')
      .select('*')
      .eq('status', 'active')
      .order('urgency_level', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET rescue listings for a specific farmer
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rescue_listings')
      .select('*')
      .eq('farmer_id', req.params.farmerId);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST a new rescue request
router.post('/', async (req, res) => {
  try {
    const {
      farmer_id, farmer_name, farmer_location,
      crop_name, quantity_kg, original_price,
      discount_price, hours_left, description
    } = req.body;

    const { data, error } = await supabase
      .from('rescue_listings')
      .insert([{
        farmer_id, farmer_name, farmer_location,
        crop_name, quantity_kg, original_price,
        discount_price, hours_left, description,
        urgency_level: hours_left <= 24 ? 'high' : 'medium',
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
