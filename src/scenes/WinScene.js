import Phaser from 'phaser';

export class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene');
  }

  create() {
    const { width: sw, height: sh } = this.scale;

    this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000022).setOrigin(0.5);

    const fontSize = Math.round(Math.min(sw, sh) / 20);
    const smallSize = Math.round(fontSize * 0.6);

    this.add.text(sw / 2, sh / 2 - fontSize * 2, 'Congratulations!', {
      color: '#ffdd44', fontFamily: 'monospace', fontSize: `${fontSize}px`
    }).setOrigin(0.5);

    this.add.text(sw / 2, sh / 2, 'You Saved Joey from his kidnappers,', {
      color: '#eeeeee', fontFamily: 'monospace', fontSize: `${smallSize}px`
    }).setOrigin(0.5);

    this.add.text(sw / 2, sh / 2 + fontSize, 'the evil Jelly Aliens', {
      color: '#eeeeee', fontFamily: 'monospace', fontSize: `${smallSize}px`
    }).setOrigin(0.5);

    this.add.text(sw / 2, sh / 2 + fontSize * 3, 'Press Enter to return to main menu', {
      color: '#aaaaaa', fontFamily: 'monospace', fontSize: `${smallSize * 0.8}px`
    }).setOrigin(0.5);

    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    this.input.once('pointerdown', () => this.scene.start('MainMenuScene'));
  }

  update() {
    const { JustDown } = Phaser.Input.Keyboard;
    if (JustDown(this.enterKey) || JustDown(this.spaceKey)) {
      this.scene.start('MainMenuScene');
    }
  }
}
