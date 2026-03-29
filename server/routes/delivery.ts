import { Router } from 'express';
import { calculateDelivery } from '../delivery.js';

const router = Router();

// ─── DELIVERY ─────────────────────────────────────────────────────────────────

router.post('/delivery/calculate', async (req, res) => {
  const { storeAddress, customerAddress } = req.body;
  if (!storeAddress || !customerAddress) {
    return res.status(400).json({ error: 'Store and customer addresses are required' });
  }
  try {
    const result = await calculateDelivery(storeAddress, customerAddress);
    if (!result) return res.status(500).json({ error: 'Could not calculate delivery' });
    res.json(result);
  } catch (err) {
    console.error('Error calculating delivery:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
