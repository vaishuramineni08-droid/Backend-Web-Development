
'use strict';

const router = require('express').Router();
const { charges, idempotency, nextChargeId } = require('../store');

router.post('/', (req, res) => {
  // Read the idempotency key
  const key = req.headers['idempotency-key'];

  // Rule 1: Reject requests without a key
  if (!key) {
    return res.status(400).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required',
      },
    });
  }

  // Rule 2: Return the saved response for repeated keys
  if (idempotency.has(key)) {
    const saved = idempotency.get(key);
    return res.status(saved.status).json(saved.body);
  }

  // Rule 3: Create one new charge
  const amount = req.body && req.body.amount;

  const charge = {
    id: nextChargeId(),
    amount,
    status: 'charged',
  };

  charges.push(charge);

  const body = {
    id: charge.id,
    amount: charge.amount,
    status: charge.status,
  };

  // Save the response in the Map
  idempotency.set(key, {
    status: 201,
    body,
  });

  return res.status(201).json(body);
});

module.exports = router;
