import Phaser from 'phaser';

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private frozen = false;
  private readonly patrolLeft: number;
  private readonly patrolRight: number;
  private readonly speed = 90;
  private direction: 1 | -1 = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    patrolRange = 140,
    textureKey = 'enemy',
  ) {
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
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

  // Bumped on every freeze() so a re-cast supersedes the previous cast's pending
  // un-freeze (mirrors Planet's phaseToken guard) — otherwise the FIRST cast's
  // timer would fire mid-way through the new window and un-freeze early (F-03).
  private freezeToken = 0;

  freeze(ms: number, scene: Phaser.Scene) {
    this.frozen = true;
    this.sprite.setTint(0x7ad8ff);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    const token = ++this.freezeToken;
    scene.time.delayedCall(ms, () => {
      if (token !== this.freezeToken) return; // superseded by a newer cast
      this.frozen = false;
      this.sprite.clearTint();
    });
  }

  get isFrozen(): boolean {
    return this.frozen;
  }
}
