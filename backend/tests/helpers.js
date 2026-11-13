process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.BASE_URL = 'https://lp.example.test';
process.env.CORS_ORIGINS = 'http://allowed.test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const createApp = require('../src/app');

let mongod;
let counter = 0;

async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}
async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}
async function clearDb() {
  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
}

const app = createApp();
const api = () => request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

async function registerUser(overrides = {}) {
  counter += 1;
  const body = { name: 'کاربر تست', email: `user${counter}@example.com`, password: 'Passw0rd!x', ...overrides };
  const res = await api().post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error('registerUser failed: ' + JSON.stringify(res.body));
  return { token: res.body.data.token, user: res.body.data.user, password: body.password, email: body.email, auth: bearer(res.body.data.token) };
}

async function createLink(auth, body = {}) {
  counter += 1;
  const res = await api().post('/api/links').set(auth).send({ url: `https://example.com/page-${counter}`, ...body });
  if (res.status !== 201) throw new Error('createLink failed: ' + JSON.stringify(res.body));
  return res.body.data.link;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, { tries = 40, ms = 50 } = {}) {
  for (let i = 0; i < tries; i++) { const v = await fn(); if (v) return v; await wait(ms); }
  return fn();
}

module.exports = { app, api, bearer, startDb, stopDb, clearDb, registerUser, createLink, wait, waitFor };
