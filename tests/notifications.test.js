const request = require('supertest');
const mongoose = require('mongoose');
const Notification = require('../server/models/Notification');
const User = require('../server/models/User');
require('dotenv').config();

let app, token, userId;

beforeAll(async () => {
  app = require('../server/index.js');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/MediCare_test');

  const user = await User.create({
    name: 'Test User',
    email: 'notif@example.com',
    password: 'Test123!',
    role: 'patient'
  });
  userId = user._id;

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'notif@example.com', password: 'Test123!' });
  token = res.body.token;
});

afterAll(async () => {
  await Notification.deleteMany({});
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe('Notification Routes', () => {
  let notificationId;

  beforeAll(async () => {
    const notif = await Notification.create({
      userId,
      type: 'record_reviewed',
      title: 'Record Reviewed',
      message: 'Your record has been reviewed'
    });
    notificationId = notif._id;
  });

  test('GET /api/notifications - should get user notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/notifications/unread - should get unread count', async () => {
    const res = await request(app)
      .get('/api/notifications/unread')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('unread');
    expect(typeof res.body.unread).toBe('number');
  });

  test('PATCH /api/notifications/:id/read - should mark as read', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.read).toBe(true);
  });

  test('PATCH /api/notifications/read/all - should mark all as read', async () => {
    const res = await request(app)
      .patch('/api/notifications/read/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });
});
