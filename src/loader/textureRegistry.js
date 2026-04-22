import { LEVEL_LIST } from './levelList.js';

/**
 * Maps logical texture names (used by level XMLs and game code) to asset file paths.
 * Direct port of texture_files[] in GameEngine.cs.
 *
 * The original uses Windows-style backslash paths like "Images\\Blocks\\orange".
 * Here we use forward-slash paths relative to /public/.
 *
 * Level preview entries (Title, Title_small, Title_bw, Title_bw_check,
 * Title_small_check, Title_text) are generated from LEVEL_LIST at the bottom.
 */
const _reg = {
  // Backgrounds
  lvlselbkg: 'images/Backgrounds/LevelSelect.png',
  bkgTexture: 'images/Backgrounds/BlueToast.png',
  bkgTexture_toast: 'images/Backgrounds/BlueToast.png',
  bkgTexture_happyheart: 'images/Backgrounds/HappyHeart.png',
  bkgTexture_toaster: 'images/Backgrounds/FlyingToasters.png',
  bkgTexture_gray: 'images/Backgrounds/GraySimple.png',
  bkgTexture_yellow: 'images/Backgrounds/YellowSimple.png',
  bkgTexture_soap: 'images/Backgrounds/Soap.png',
  bkgTexture_greendrops: 'images/Backgrounds/GreenDrops.png',
  Back: 'images/background_small.png',

  // Achievement icons
  ach_noob: 'images/Achievements/noob_img.png',
  ach_joey: 'images/Achievements/still_just_a_joey.png',
  ach_mirror: 'images/Achievements/mirror_master.png',
  ach_umbrella: 'images/Achievements/umbrella_wizard.png',
  ach_master: 'images/Achievements/master_reflecter.png',
  ach_bear: 'images/Achievements/what_a_bear.png',
  ach_tunnel: 'images/Achievements/carpal_tunnel.png',
  ach_endurance: 'images/Achievements/endurance_img.png',
  ach_stubbornness: 'images/Achievements/stubbornness_img.png',
  ach_aplus: 'images/Achievements/aplus_img.png',
  ach_eureka: 'images/Achievements/eureka_img.png',
  ach_speed: 'images/Achievements/speed_run.png',
  ach_failure: 'images/Achievements/failure_is_an_option.png',
  ach_locked: 'images/Achievements/locked.png',
  ach_left_arrow: 'images/Achievements/left_arrow.png',
  ach_right_arrow: 'images/Achievements/right_arrow.png',
  n00b_desc: 'images/Achievements/noob.png',
  joey_desc: 'images/Achievements/joey.png',
  mirror_desc: 'images/Achievements/mirror.png',
  umbrella_desc: 'images/Achievements/umbrella.png',
  master_desc: 'images/Achievements/master.png',
  bear_desc: 'images/Achievements/bear.png',
  tunnel_desc: 'images/Achievements/tunnel.png',
  endurance_desc: 'images/Achievements/endurance.png',
  stubbornness_desc: 'images/Achievements/stubbornness.png',
  failure_desc: 'images/Achievements/failure.png',
  aplus_desc: 'images/Achievements/aplus.png',
  eureka_desc: 'images/Achievements/eureka.png',
  speed_desc: 'images/Achievements/speed.png',

  // Blocks (walls)
  block_green: 'images/Blocks/green.png',
  block_orange: 'images/Blocks/orange.png',
  block_purple: 'images/Blocks/purple.png',
  block_red: 'images/Blocks/red.png',
  block_yellow: 'images/Blocks/yellow.png',
  block_blue: 'images/Blocks/blue.png',
  groundTexture: 'images/Blocks/blue.png',

  // Menu buttons
  startOn: 'images/Menu/startON.png',
  startOff: 'images/Menu/startOFF.png',
  continueOn: 'images/Menu/continueOn.png',
  continueOff: 'images/Menu/continueOff.png',
  exitOn: 'images/Menu/exitON.png',
  exitOff: 'images/Menu/exitOFF.png',
  controlsOn: 'images/Menu/controlsOn.png',
  controlsOff: 'images/Menu/controlsOff.png',
  levelselectOn: 'images/Menu/levelselectON.png',
  levelselectOff: 'images/Menu/levelselectOFF.png',
  creditsOn: 'images/Menu/creditsON.png',
  creditsOff: 'images/Menu/creditsOFF.png',
  mainmenuOn: 'images/Menu/mainmenuON.png',
  mainmenuOff: 'images/Menu/mainmenuOFF.png',
  achievementsOff: 'images/Menu/achievementsOFF.png',
  achievementsOn: 'images/Menu/achievementsON.png',
  keyboardOn: 'images/Menu/keyboardON.png',
  keyboardOff: 'images/Menu/keyboardOFF.png',
  xboxOn: 'images/Menu/xboxON.png',
  xboxOff: 'images/Menu/xboxOFF.png',
  backOn: 'images/Menu/backON.png',
  backOff: 'images/Menu/backOFF.png',
  world1On: 'images/Menu/world1ON.png',
  world1Off: 'images/Menu/world1OFF.png',
  world2On: 'images/Menu/world2ON.png',
  world2OnLocked: 'images/Menu/world2ON_LOCKED.png',
  world2Off: 'images/Menu/world2OFF.png',
  world2OffLocked: 'images/Menu/world2OFF_LOCKED.png',
  world3On: 'images/Menu/world3ON.png',
  world3OnLocked: 'images/Menu/world3ON_LOCKED.png',
  world3Off: 'images/Menu/world3OFF.png',
  world3OffLocked: 'images/Menu/world3OFF_LOCKED.png',
  world4On: 'images/Menu/world4ON.png',
  world4OnLocked: 'images/Menu/world4ON_LOCKED.png',
  world4Off: 'images/Menu/world4OFF.png',
  world4OffLocked: 'images/Menu/world4OFF_LOCKED.png',
  world5On: 'images/Menu/world5ON.png',
  world5OnLocked: 'images/Menu/world5ON_LOCKED.png',
  world5Off: 'images/Menu/world5OFF.png',
  world5OffLocked: 'images/Menu/world5OFF_LOCKED.png',
  world6On: 'images/Menu/world6ON.png',
  world6OnLocked: 'images/Menu/world6ON_LOCKED.png',
  world6Off: 'images/Menu/world6OFF.png',
  world6OffLocked: 'images/Menu/world6OFF_LOCKED.png',
  world7On: 'images/Menu/world7ON.png',
  world7OnLocked: 'images/Menu/world7ON_LOCKED.png',
  world7Off: 'images/Menu/world7OFF.png',
  world7OffLocked: 'images/Menu/world7OFF_LOCKED.png',
  mainbkg: 'images/Menu/MainMenuStrip.png',
  resumeOn: 'images/PauseMenu/resumeON.png',
  resumeOff: 'images/PauseMenu/resumeOFF.png',
  quitOn: 'images/PauseMenu/quitON.png',
  quitOff: 'images/PauseMenu/quitOFF.png',
  restartOn: 'images/PauseMenu/restartON.png',
  restartOff: 'images/PauseMenu/restartOFF.png',

  // Level resources
  box_jellyfish: 'images/boxjellyfish.png',
  bkg_movement: 'images/background_movement.png',
  bkg_diagonal: 'images/background_diagonal.png',
  bkg_vertical: 'images/background_vertical.png',
  bkg_horizontal: 'images/background_horizontal.png',
  bkg_hor_mult: 'images/background_hor_mult.png',
  bkg_vert_mult: 'images/background_vert_mult.png',
  bkgKeyboardControls: 'images/KeyboardControls.png',
  bkg_credits: 'images/credits.png',
  bkgXboxControls: 'images/xbox360screen.png',
  bkg_block: 'images/background_block.png',
  lineTexture: 'images/line.png',
  playerTexture: 'images/koala.png',
  jumpUp: 'images/smallJumpUp.png',
  jumpDown: 'images/smallJumpDown.png',
  deathStrip: 'images/smallDeathStrip.png',
  keyTexture: 'images/key.png',
  openDoorTexture: 'images/opendoor.png',
  openDoorStrip: 'images/doorOpen.png',
  closeDoorTexture: 'images/door.png',
  spikesUpTexture: 'images/spikesUp.png',
  spikesRightTexture: 'images/spikesRight.png',
  spikesDownTexture: 'images/spikesDown.png',
  spikesLeftTexture: 'images/spikesLeft.png',
  idleStrip: 'images/koala_idle.png',
  reflectionStrip: 'images/reflectionStrip.png',
  buddyBlock: 'images/smallbuddyblock.png',
  buddyBlockFlinch: 'images/BuddyBlockFlinch.png',
  buddyBlockFall: 'images/BuddyBlockFall.png',
  reflectionCircle: 'images/smallUmbrella.png',
  reflectionCircleSwitch: 'images/smallUmbrellaSwitch.png',
  switchTexture: 'images/switch.png',
  switchOnTexture: 'images/switchOn.png',
  zip: 'images/zipfilmstrip.png',
  unzip: 'images/unzipfilmstrip.png',
  zippedbkg: 'images/zipped.png',
  doorEat: 'images/doorEat.png'
};

// Generate level preview/title entries from LEVEL_LIST.
for (const { title, preview, titleKey } of LEVEL_LIST) {
  const tk = titleKey ?? title;
  _reg[title]                    = `images/LevelPreviews/LargePreview/${preview}.png`;
  _reg[`${title}_small`]         = `images/LevelPreviews/Selected/${preview}_small.png`;
  _reg[`${title}_bw`]            = `images/LevelPreviews/BlackWhite/${preview}_bw.png`;
  _reg[`${title}_bw_check`]      = `images/LevelPreviews/BlackWhiteCheck/${preview}_bw_check.png`;
  _reg[`${title}_small_check`]   = `images/LevelPreviews/SelectedCheck/${preview}_small_check.png`;
  _reg[`${title}_text`]          = `images/LevelTitles/${tk}.png`;
}

export const TEXTURE_REGISTRY = _reg;
