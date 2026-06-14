import './style.css';
import { Game } from './game/Game';
import { UI } from './ui/ui';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');

if (!canvas) {
  throw new Error('Canvas element was not found');
}

const ui = new UI();
const game = new Game(canvas, ui);
game.init();
