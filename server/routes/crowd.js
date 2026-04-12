const express = require("express");
const router = express.Router();
const { getCrowdData } = require("../simulation/stadium");

router.get("/", (req, res) => {
  res.json(getCrowdData());
});

module.exports = router;
