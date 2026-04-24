const request = require('supertest');
const mongoose = require('mongoose');
const Appointment = require('../server/models/Appointment');
const User = require('../server/models/User');
require('dotenv').config();

let app, patientToken, doctorToken, patientId, doctorId;

beforeAll(async () => {
  app = require('../server/index.js');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/MediCare_test');

  const patient = await User.create({
    name: 'Test Patient',
    email: 'patient@test.com',
    password: 'Test123!',
    role: 'patient'
  });
  patientId = patient._id;

  const doctor = await User.create({
    name: 'Dr. Test',
    email: 'doctor@test.com',
    password: 'Test123!',
    role: 'doctor'
  });
  doctorId = doctor._id;

  const patientRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'patient@test.com', password: 'Test123!' });
  patientToken = patientRes.body.token;

  const doctorRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'doctor@test.com', password: 'Test123!' });
  doctorToken = doctorRes.body.token;
});

afterAll(async () => {
  await Appointment.deleteMany({});
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe('Appointment Routes', () => {
  let appointmentId;

  test('POST /api/appointments - should create appointment', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId,
        requestedDate: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '10:00',
        reason: 'Checkup'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('pending');
    appointmentId = res.body._id;
  });

  test('GET /api/appointments - should list appointments', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('PATCH /api/appointments/:id - should update appointment', async () => {
    if (!appointmentId) return;
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'approved' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('approved');
  });
});
