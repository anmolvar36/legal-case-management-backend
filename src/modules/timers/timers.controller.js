const timersService = require('./timers.service');

const getActive = async (req, res) => {
  try {
    const active = await timersService.getActive(req.user.id);
    res.json({ success: true, data: active });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

const start = async (req, res) => {
  try {
    if (req.user.role !== 'lawyer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only staff can track time.' });
    }
    const { matter_id } = req.body;
    if (!matter_id) {
      return res.status(400).json({ success: false, message: 'Matter ID is required.' });
    }
    
    const timer = await timersService.start(req.user.id, matter_id);
    res.status(201).json({ success: true, data: timer });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

const stop = async (req, res) => {
  try {
    const { id } = req.params;
    const timer = await timersService.stop(req.user.id, id);
    res.json({ success: true, data: timer });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

const list = async (req, res) => {
  try {
    const { matter_id } = req.query;
    const entries = await timersService.list(req.user.id, { matter_id });
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getActive,
  start,
  stop,
  list,
};
