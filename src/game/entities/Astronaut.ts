import Phaser from 'phaser';

type InputKeys = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
};

export class Astronaut {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: InputKeys;
  private readonly speed = 240;
  private readonly jumpVelocity = -460;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'astronaut');
    this.sprite.setCollideWorldBounds(true);

    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard plugin not available');
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys('W,A,D') as InputKeys;
  }

  update() {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left?.isDown || this.keys.A.isDown;
    const right = this.cursors.right?.isDown || this.keys.D.isDown;
    const jumpPressed =
      this.cursors.up?.isDown || this.keys.W.isDown || this.cursors.space?.isDown;

    if (left) body.setVelocityX(-this.speed);
    else if (right) body.setVelocityX(this.speed);
    else body.setVelocityX(0);

    if (jumpPressed && body.blocked.down) {
      body.setVelocityY(this.jumpVelocity);
    }
  }
}
