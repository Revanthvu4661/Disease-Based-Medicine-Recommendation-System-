const medicalData = require('../data/medicalDataset.json');

exports.searchDisease = async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase().trim();
    if (!query) return res.status(400).json({ message: 'Query required' });

    // Find by disease name or symptoms
    const results = medicalData.filter(d => {
      return d.disease.toLowerCase().includes(query) ||
        d.symptoms.some(s => s.toLowerCase().includes(query)) ||
        d.keywords?.some(k => k.toLowerCase().includes(query));
    });

    if (results.length === 0) {
      // Return a generic suggestion
      return res.json({
        found: false,
        message: 'Disease not found in our database. Please consult a doctor.',
        suggestions: medicalData.slice(0, 5).map(d => d.disease)
      });
    }

    res.json({ found: true, results: results.slice(0, 3) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDiseaseByName = async (req, res) => {
  try {
    const name = req.params.name.toLowerCase();
    const disease = medicalData.find(d => d.disease.toLowerCase() === name);
    if (!disease) return res.status(404).json({ message: 'Disease not found' });
    res.json(disease);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDiseases = async (req, res) => {
  res.json(medicalData.map(d => ({ disease: d.disease, severity: d.severity, keywords: d.keywords })));
};
