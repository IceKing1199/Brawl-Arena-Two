import { io, Socket } from 'socket.io-client';
import { FireState, PlayerState } from '../game/types';

type Events = {
  welcome: (payload: { id: string; players: PlayerState[] }) => void;
  playerJoined: (state: PlayerState) => void;
  playerLeft: (id: string) => void;
  state: (state: PlayerState) => void;
  fire: (state: FireState) => void;
};

export class NetClient {
  id = `local_${Math.random().toString(16).slice(2)}`;
  private socket: Socket | null = null;
  private handlers: Partial<Events> = {};

  connect() {
    const url = `${location.protocol}//${location.hostname}:3001`;
    this.socket = io(url, { transports: ['websocket'], timeout: 1500, reconnectionAttempts: 4 });

    this.socket.on('connect', () => {
      this.socket?.emit('hello', { name: this.makeName() });
    });
    this.socket.on('welcome', (payload) => {
      this.id = payload.id;
      this.handlers.welcome?.(payload);
    });
    this.socket.on('playerJoined', (state) => this.handlers.playerJoined?.(state));
    this.socket.on('playerLeft', (id) => this.handlers.playerLeft?.(id));
    this.socket.on('state', (state) => this.handlers.state?.(state));
    this.socket.on('fire', (state) => this.handlers.fire?.(state));
    this.socket.on('connect_error', () => {
      console.info('Socket.IO server is offline. The game keeps running in solo mode.');
    });
  }

  on<K extends keyof Events>(event: K, handler: Events[K]) {
    this.handlers[event] = handler;
  }

  sendState(state: PlayerState) {
    this.socket?.emit('state', state);
  }

  sendFire(state: FireState) {
    this.socket?.emit('fire', state);
  }

  private makeName() {
    const tag = Math.floor(100 + Math.random() * 899);
    return `Brawler ${tag}`;
  }
}
