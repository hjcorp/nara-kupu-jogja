const { getEvents, createEvent } = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const events = await getEvents();
    return res.status(200).json(events);
  }
  if (req.method === 'POST') {
    try {
      const event = await createEvent(req.body);
      return res.status(201).json(event);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
};
