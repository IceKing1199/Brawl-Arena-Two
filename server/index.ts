import { createServer } from 'node:http';
import { Server } from 'socket.io';

type PlayerState = {
  id: string;
  name: string;
  x: number;
  z: number;
  aimX: number;
  aimZ: number;
  hp: number;
};

type FireState = {
  id: string;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
};

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST']
  }
});

const players = new Map<string, PlayerState>();
const spawns = [
  { x: 0, z: -27.5 },
  { x: -7, z: -27.5 },
  { x: 7, z: -27.5 },
  { x: 0, z: 27.5 }
];

io.on('connection', (socket) => {
  socket.on('hello', (payload: { id?: string; name?: string }) => {
    const id = payload.id || socket.id;
    const spawn = spawns[players.size % spawns.length];
    const state: PlayerState = {
      id,
      name: payload.name || 'Brawler',
      x: spawn.x,
      z: spawn.z,
      aimX: 1,
      aimZ: 0,
      hp: 100
    };
    players.set(id, state);
    socket.data.playerId = id;
    socket.emit('welcome', { id, players: [...players.values()] });
    socket.broadcast.emit('playerJoined', state);
  });

  socket.on('state', (state: PlayerState) => {
    if (!state?.id || socket.data.playerId !== state.id) return;
    players.set(state.id, sanitizeState(state));
    socket.broadcast.emit('state', sanitizeState(state));
  });

  socket.on('fire', (state: FireState) => {
    if (!state?.id || socket.data.playerId !== state.id) return;
    socket.broadcast.emit('fire', state);
  });

  socket.on('disconnect', () => {
    const id = socket.data.playerId;
    if (!id) return;
    players.delete(id);
    socket.broadcast.emit('playerLeft', id);
  });
});

httpServer.listen(3001, '0.0.0.0', () => {
  console.log('Brawl Arena Socket.IO server: http://localhost:3001');
});

function sanitizeState(state: PlayerState): PlayerState {
  return {
    id: state.id,
    name: String(state.name || 'Brawler').slice(0, 18),
    x: clamp(Number(state.x), -21, 21),
    z: clamp(Number(state.z), -35, 35),
    aimX: clamp(Number(state.aimX), -1, 1),
    aimZ: clamp(Number(state.aimZ), -1, 1),
    hp: clamp(Number(state.hp), 0, 100)
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
