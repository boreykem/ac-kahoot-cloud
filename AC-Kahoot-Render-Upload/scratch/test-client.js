const { io } = require('socket.io-client');
const socket = io('http://localhost:3333');

const pin = process.argv[2];

socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
  socket.emit('player:join', { pin, nickname: 'TestBot', avatar: '🐱' });
});

socket.on('player:joined', (data) => {
  console.log('Successfully joined room!', data);
});

socket.on('player:question-started', (data) => {
  console.log('\n--- QUESTION STARTED ---');
  console.log(JSON.stringify(data, null, 2));
});

socket.on('player:error', (msg) => {
  console.error('Error:', msg);
});
