import express from 'express';

const router = express.Router();

router.get('/avax-kes', async (req, res) => {
  // TODO: Implement price conversion
  // This should use your existing price service
  res.json({
    KES_per_AVAX: 146500,
    AVAX_per_KES: 0.00000683,
    timestamp: Math.floor(Date.now() / 1000),
    sources: {
      AVAX_USD: 'chainlink',
      USD_KES: 'exchangerate.host'
    },
    AVAX_USD_price: 35.50,
    USD_KES_rate: 4126.76
  });
});

export default router;

