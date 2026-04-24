const medicalData = require('../data/medicalDataset.json');
const drugInteractions = require('../data/drugInteractions.json');

// Score relevance: name match > keyword match > symptom match
function scoreMatch(disease, query) {
  const queryLower = query.toLowerCase();
  const diseaseLower = disease.disease.toLowerCase();

  if (diseaseLower === queryLower) return 1000;
  if (diseaseLower.startsWith(queryLower)) return 900;
  if (diseaseLower.includes(queryLower)) return 800;

  const keywordMatch = disease.keywords?.some(k => k.toLowerCase() === queryLower) ? 500 :
    disease.keywords?.some(k => k.toLowerCase().includes(queryLower)) ? 400 : 0;

  const symptomMatch = disease.symptoms?.some(s => s.toLowerCase().includes(queryLower)) ? 300 : 0;

  return Math.max(keywordMatch, symptomMatch);
}

exports.searchDisease = async (req, res) => {
  try {
    const { q, severity, emergency } = req.query;
    const query = q?.toLowerCase().trim();

    if (!query) return res.status(400).json({ message: 'Query required' });

    let results = medicalData.filter(d => {
      const hasMatch = d.disease.toLowerCase().includes(query) ||
        d.symptoms.some(s => s.toLowerCase().includes(query)) ||
        d.keywords?.some(k => k.toLowerCase().includes(query));

      if (!hasMatch) return false;
      if (severity && d.severity !== severity) return false;
      if (emergency === 'true' && !d.emergencyAlert) return false;

      return true;
    });

    // Rank by relevance score
    results = results.map(d => ({ ...d, score: scoreMatch(d, query) }))
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...d }) => d)
      .slice(0, 5);

    if (results.length === 0) {
      // Return semantically close suggestions (share keywords)
      const suggestions = medicalData
        .map(d => ({
          disease: d,
          shared: (d.keywords || []).filter(k => query.includes(k) || k.includes(query)).length
        }))
        .filter(s => s.shared > 0)
        .sort((a, b) => b.shared - a.shared)
        .slice(0, 5)
        .map(s => s.disease.disease);

      return res.json({
        found: false,
        message: 'Disease not found in our database. Please consult a doctor.',
        suggestions: suggestions.length > 0 ? suggestions : medicalData.slice(0, 5).map(d => d.disease)
      });
    }

    res.json({ found: true, results });
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
  try {
    const { severity } = req.query;
    let diseases = medicalData;

    if (severity) {
      diseases = diseases.filter(d => d.severity === severity);
    }

    res.json(diseases.map(d => ({ disease: d.disease, severity: d.severity, keywords: d.keywords, emergencyAlert: d.emergencyAlert })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all unique symptoms for filter UI
exports.getSymptoms = async (req, res) => {
  try {
    const symptomsSet = new Set();
    medicalData.forEach(disease => {
      disease.symptoms?.forEach(symptom => symptomsSet.add(symptom));
      disease.keywords?.forEach(keyword => symptomsSet.add(keyword));
    });
    const symptoms = Array.from(symptomsSet).sort();
    res.json({ symptoms });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Check drug interactions
exports.checkInteractions = async (req, res) => {
  try {
    const { drugs } = req.query;
    if (!drugs) return res.json({ interactions: [] });

    const drugList = drugs.split(',').map(d => d.trim());
    const found = [];

    for (const interaction of drugInteractions) {
      const interactionDrugs = interaction.drugs.map(d => d.toLowerCase());
      const matchingDrugs = drugList.filter(d =>
        interactionDrugs.some(id => d.toLowerCase().includes(id) || id.includes(d.toLowerCase()))
      );

      if (matchingDrugs.length >= 2) {
        found.push({
          drugs: matchingDrugs,
          severity: interaction.severity,
          effect: interaction.effect
        });
      }
    }

    res.json({ interactions: found });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
