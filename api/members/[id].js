const { updateMember, deleteMember } = require('../../lib/store');

module.exports = async (req, res) => {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const member = await updateMember(id, req.body);
      return res.status(200).json(member);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await deleteMember(id);
      return res.status(204).end();
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
};
