const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config();

let app;

beforeAll(async () => {
  app = require('../server/index.js');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/MediCare_test');
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Medical Routes', () => {
  test('GET /api/medical/search - should search diseases', async () => {
    const res = await request(app)
      .get('/api/medical/search?q=diabetes');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/medical/symptoms - should return symptoms', async () => {
    const res = await request(app)
      .get('/api/medical/symptoms');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/medical/interactions - should check drug interactions', async () => {
    const res = await request(app)
      .get('/api/medical/interactions?drugs=Warfarin,Aspirin');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('interactions');
  });

  test('GET /api/medical/disease/:name - should get disease details', async () => {
    const res = await request(app)
      .get('/api/medical/disease/Diabetes');

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('disease');
    }
  });
});
