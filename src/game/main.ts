import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { LobbyScene } from './scenes/Lobby';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#1a1b3a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 900 },
      debug: false,
    },
  },
  scene: [BootScene, LobbyScene],
};

new Phaser.Game(config);
