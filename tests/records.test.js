const request = require('supertest');
const mongoose = require('mongoose');
const Record = require('../server/models/Record');
const User = require('../server/models/User');
require('dotenv').config();

let app, token, userId;

beforeAll(async () => {
  app = require('../server/index.js');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/MediCare_test');

  const user = await User.create({
    name: 'Test Patient',
    email: 'patient@example.com',
    password: 'Test123!',
    role: 'patient'
  });
  userId = user._id;

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'patient@example.com', password: 'Test123!' });
  token = res.body.token;
});

afterAll(async () => {
  await Record.deleteMany({});
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe('Records Routes', () => {
  let recordId;

  test('POST /api/records - should create a new record', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${token}`)
      .send({
        disease: 'Diabetes',
        symptoms: ['high blood sugar', 'fatigue'],
        age: 35,
        weight: 75,
        gender: 'Male',
        severity: 'moderate',
        medicines: [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '30 days' }],
        precautions: ['Check blood sugar regularly']
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.disease).toBe('Diabetes');
    recordId = res.body._id;
  });

  test('GET /api/records/mine - should get patient records', async () => {
    const res = await request(app)
      .get('/api/records/mine')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/records/:id - should get single record', async () => {
    if (!recordId) return;
    const res = await request(app)
      .get(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(recordId);
  });

  test('DELETE /api/records/:id - should delete patient record', async () => {
    if (!recordId) return;
    const res = await request(app)
      .delete(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });
});
