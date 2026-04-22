/**
 * Maps logical audio names (used in level XMLs and sound manager calls)
 * to file paths. Port of music_files[] in GameEngine.cs.
 *
 * Several logical names resolve to the same file (e.g. cityA/cityC/cityB
 * are aliases for existing tracks).
 */
export const AUDIO_REGISTRY = {
  box_jellyfish_music: 'audio/box_jellyfish_music.mp3',
  PolkaPanda: 'audio/Polka_Panda.mp3',
  Sleuth: 'audio/Sleuth.mp3',
  ToyBlocks: 'audio/Toy Blocks.mp3',
  PlayAllDay: 'audio/Play_all_day.mp3',
  cityA: 'audio/Polka_Panda.mp3',
  cityC: 'audio/Sleuth.mp3',
  cityB: 'audio/Toy Blocks.mp3',
  meadows: 'audio/Play_all_day.mp3',
  teardrop: 'audio/Sleuth.mp3',
  winter: 'audio/Toy Blocks.mp3',
  jumpMusic: 'audio/Jump - SoundBible.com.mp3',
  reflectMusic: 'audio/swoosh_by_qubodup.mp3',
  switchActive: 'audio/womph_by_junggle.mp3',
  zipperSlow: 'audio/zipper_unzip_slowly_by_rutgermuller.mp3',
  zipperFast: 'audio/zipper_by_anton.mp3',
  dunDunDun: 'audio/dun-dun-dun_by_simon-lacelle.mp3',
  destroy: 'audio/crumple_by_j1987.mp3',
  click: 'audio/click_by_tictacshutup.mp3'
};
