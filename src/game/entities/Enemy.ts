import Phaser from 'phaser';

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private frozen = false;
  private readonly patrolLeft: number;
  private readonly patrolRight: number;
  private readonly speed = 90;
  private direction: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, patrolRange = 140) {
    this.sprite = scene.physics.add.sprite(x, y, 'enemy');
    this.sprite.setCollideWorldBounds(true);
    this.patrolLeft = x - patrolRange;
    this.patrolRight = x + patrolRange;
  }

  update() {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.frozen) {
      body.setVelocityX(0);
      return;
    }
    body.setVelocityX(this.speed * this.direction);
    if (this.sprite.x <= this.patrolLeft) this.direction = 1;
    else if (this.sprite.x >= this.patrolRight) this.direction = -1;
  }

  freeze(ms: number, scene: Phaser.Scene) {
    this.frozen = true;
    this.sprite.setTint(0x7ad8ff);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    scene.time.delayedCall(ms, () => {
      this.frozen = false;
      this.sprite.clearTint();
    });
  }

  get isFrozen(): boolean {
    return this.frozen;
  }
}
