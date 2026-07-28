const { getMembers, createMember } = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const members = await getMembers();
    return res.status(200).json(members);
  }
  if (req.method === 'POST') {
    try {
      const member = await createMember(req.body);
      return res.status(201).json(member);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
};
