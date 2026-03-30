import { Router } from 'express';

const router = Router();

// ─── GEOCODE ──────────────────────────────────────────────────────────────────

router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'address is required' });
    }
    const { getOrCreateCoordinates } = await import('../googleMaps.js');
    const coords = await getOrCreateCoordinates(address);
    if (!coords) return res.status(404).json({ error: 'Could not geocode address' });
    res.json({ lat: coords.lat, lng: coords.lng });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
