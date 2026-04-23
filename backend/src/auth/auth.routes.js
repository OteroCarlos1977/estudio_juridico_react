const express = require("express");
const { z } = require("zod");
const {
  buildPublicUser,
  getUserById,
  getUserByUsername,
  signToken,
  verifyPassword,
} = require("./auth.service");
const { requireAuth } = require("./auth.middleware");

const router = express.Router();

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const userRecord = getUserByUsername(payload.username);
    if (!userRecord || !(await verifyPassword(userRecord, payload.password))) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Usuario o contraseña incorrectos." });
    }

    const user = buildPublicUser(userRecord);
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, (req, res) => {
  const userRecord = getUserById(req.user.id);
  res.json({ user: buildPublicUser(userRecord) });
});

module.exports = router;
