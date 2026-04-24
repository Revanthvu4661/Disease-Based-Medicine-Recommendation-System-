const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../server/models/User');
require('dotenv').config();

let app;

beforeAll(async () => {
  app = require('../server/index.js');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/MediCare_test');
  await User.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe('Auth Routes', () => {
  test('POST /api/auth/register - should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123!',
        role: 'patient'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@example.com');
  });

  test('POST /api/auth/login - should login existing user', async () => {
    await User.create({
      name: 'Login Test',
      email: 'login@example.com',
      password: 'Test123!',
      role: 'doctor'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'Test123!'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('GET /api/auth/doctors - should return list of doctors', async () => {
    await User.create({
      name: 'Dr. Smith',
      email: 'doctor@example.com',
      password: 'Test123!',
      role: 'doctor',
      specialization: 'Cardiology'
    });

    const res = await request(app).get('/api/auth/doctors');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
