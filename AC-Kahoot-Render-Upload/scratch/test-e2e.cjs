const { io } = require('socket.io-client');
const host = io('http://localhost:3333');
const p1 = io('http://localhost:3333');
const p2 = io('http://localhost:3333');

let pin = null;

host.on('connect', () => {
  console.log('[HOST] Connected');
  const mockQuiz = {
    title: 'E2E Test Quiz',
    questions: [
      { question: 'Q1: 1+1?', options: ['1', '2', '3', '4'], correctIndex: 1, timeLimit: 10 },
      { question: 'Q2: Sky color?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctIndex: 1, timeLimit: 10 }
    ]
  };
  host.emit('host:create-room', { quiz: mockQuiz, level: 'test', hostLicense: 'PRO' });
});

host.on('host:room-created', (data) => {
  pin = data.pin;
  console.log('[HOST] Room created:', pin);
  p1.emit('player:join', { pin, nickname: 'Alice', avatar: '🐱' });
  p2.emit('player:join', { pin, nickname: 'Bob', avatar: '🐶' });
});

host.on('host:players-updated', (playerList) => {
  console.log(`[HOST] Player Joined. Total players: ${playerList.length}`);
  if (playerList.length === 2) {
    console.log('\n[HOST] All players joined. Starting first question...');
    host.emit('host:next-question', { pin });
  }
});

let answeredCount = 0;
host.on('host:player-answered', (data) => {
  answeredCount++;
  console.log(`[HOST] Received answer. Total answers: ${answeredCount}/2`);
  if (answeredCount === 2) {
    console.log('\n[HOST] All answered! Showing results...');
    host.emit('host:show-results', { pin });
  }
});

p1.on('player:question-started', (data) => {
  console.log(`[P1] Received Q${data.questionIndex + 1}. Submitting Correct Answer (idx 1).`);
  p1.emit('player:submit-answer', { pin, choiceIndex: 1 });
});

p2.on('player:question-started', (data) => {
  console.log(`[P2] Received Q${data.questionIndex + 1}. Submitting Wrong Answer (idx 0).`);
  p2.emit('player:submit-answer', { pin, choiceIndex: 0 });
});

p1.on('player:answer-result', (data) => {
  console.log(`[P1] Result: ${data.isCorrect ? 'Correct!' : 'Wrong!'} Score: ${data.totalScore}`);
});

p2.on('player:answer-result', (data) => {
  console.log(`[P2] Result: ${data.isCorrect ? 'Correct!' : 'Wrong!'} Score: ${data.totalScore}`);
  console.log('\n[HOST] Showing Leaderboard...');
  host.emit('host:show-leaderboard', { pin });
});

p1.on('game:leaderboard', () => {
  console.log('[P1] Leaderboard view triggered.');
});

host.on('host:results-shown', (data) => {
    // Expected when results are shown
});

let leaderboardShownCount = 0;
p2.on('game:leaderboard', () => {
  console.log('[P2] Leaderboard view triggered.');
  leaderboardShownCount++;
  if (leaderboardShownCount === 1) {
    console.log('\n[HOST] Starting Next Question...');
    answeredCount = 0; // reset
    host.emit('host:next-question', { pin });
  }
});

p1.on('game:podium', (data) => {
  console.log('\n[P1] PODIUM TRIGGERED! Game Over.');
  console.log('[P1] 1st Place:', data.podium[0].nickname, 'Score:', data.podium[0].score);
  process.exit(0);
});

p1.on('player:error', (msg) => { console.error('[P1] Error:', msg); process.exit(1); });
p2.on('player:error', (msg) => { console.error('[P2] Error:', msg); process.exit(1); });

setTimeout(() => {
  console.error('[SYSTEM] Timeout reached. E2E Test failed.');
  process.exit(1);
}, 10000);
