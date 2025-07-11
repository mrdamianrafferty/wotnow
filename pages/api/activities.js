import activityTypes from '../../data/activityTypes';

export default function handler(req, res) {
  const { city } = req.query;

  if (!city) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'City is required' });
  }

  const activities = activityTypes.map(act => ({
    ...act,
    name: `${act.name} in ${city}`
  }));

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(activities);
}