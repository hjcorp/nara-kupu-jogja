module.exports = (req, res) => {
  const candidates = ['REDIS_URL', 'STORAGE_URL', 'KV_URL', 'REDIS_CONNECTION_STRING'];
  const found = {};
  candidates.forEach(name => { found[name] = !!process.env[name]; });

  // Cari juga env var lain yang isinya connection string redis://,
  // tanpa membocorkan isinya — cuma nama variabelnya saja.
  const otherRedisLikeVars = Object.keys(process.env).filter(key => {
    const val = process.env[key];
    return val && /^rediss?:\/\//.test(val) && !candidates.includes(key);
  });

  res.status(200).json({
    knownVarsPresent: found,
    otherRedisLikeVarsFound: otherRedisLikeVars,
    nodeEnv: process.env.VERCEL_ENV || 'unknown'
  });
};
