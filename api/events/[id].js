const { updateEvent, deleteEvent } = require('../../lib/store');

module.exports = async (req, res) => {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const event = await updateEvent(id, req.body);
      return res.status(200).json(event);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await deleteEvent(id);
      return res.status(204).end();
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
};
