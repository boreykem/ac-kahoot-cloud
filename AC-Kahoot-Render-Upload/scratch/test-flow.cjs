const { io } = require('socket.io-client');
const hostSocket = io('http://localhost:3333');
const playerSocket = io('http://localhost:3333');

hostSocket.on('connect', () => {
  console.log('Host connected!');
  const mockQuiz = {
    title: 'Test Quiz',
    questions: [
      {
        question: 'What is 1+1?',
        options: ['1', '2', '3', '4'],
        correctIndex: 1,
        timeLimit: 20
      }
    ]
  };
  hostSocket.emit('host:create-room', { quiz: mockQuiz, level: 'test', hostLicense: 'PRO' });
});

hostSocket.on('host:room-created', (data) => {
  console.log('Room created with PIN:', data.pin);
  playerSocket.emit('player:join', { pin: data.pin, nickname: 'TestBot', avatar: '🐱' });
});

playerSocket.on('player:joined', (data) => {
  console.log('Player joined successfully:', data);
  console.log('Host starting question in 2 seconds...');
  setTimeout(() => {
    hostSocket.emit('host:next-question', { pin: data.pin });
  }, 2000);
});

playerSocket.on('player:question-started', (data) => {
  console.log('\n--- PLAYER RECEIVED QUESTION ---');
  console.log(JSON.stringify(data, null, 2));
  setTimeout(() => process.exit(0), 1000);
});

playerSocket.on('player:error', (msg) => {
  console.error('Player error:', msg);
  process.exit(1);
});
