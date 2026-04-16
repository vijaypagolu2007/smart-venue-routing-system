const express = require("express");
const router = express.Router();
const { getCrowdData } = require("../simulation/venueState");

router.get("/", (req, res) => {
  res.json(getCrowdData());
});

module.exports = router;
