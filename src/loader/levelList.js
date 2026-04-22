/**
 * The ordered level list, in the order the game presents them.
 * Port of level_files[] in GameEngine.cs.
 *
 * Difficulty codes:
 *   t = tutorial
 *   e = easy
 *   m = medium
 *   h = hard
 *
 * preview: base filename (no ext/path) for LevelPreviews images.
 * titleKey: LevelTitles filename when it differs from title (only Best Buddies...).
 */
export const LEVEL_LIST = [
  { file: 'tutorial_movement.xml',            title: 'Movement',                   diff: 't', preview: 'tutorial_movement' },
  { file: 'easy_dna.xml',                     title: 'DNA',                        diff: 'e', preview: 'easy_dna' },
  { file: 'tutorial_vertical.xml',            title: 'Vert. Reflection',           diff: 't', preview: 'tutorial_vertical' },
  { file: 'tutorial_horizontal.xml',          title: 'Hor. Reflection',            diff: 't', preview: 'tutorial_horizontal' },
  { file: 'tutorial_jump_reflect.xml',        title: 'Jump & Reflect',             diff: 't', preview: 'tutorial_jump' },
  { file: 'flips.xml',                        title: 'Flips',                      diff: 'e', preview: 'easy_flips' },
  { file: 'tutorial_vertical_multiple.xml',   title: 'Vert. Reflection x2',        diff: 't', preview: 'tutorial_vertical2' },
  { file: 'tutorial_horizontal_multiple.xml', title: 'Hor. Reflection x2',         diff: 't', preview: 'tutorial_horizontal2' },
  { file: 'boxes.xml',                        title: 'Foursquare',                 diff: 'e', preview: 'easy_foursquare' },
  { file: 'easyfall.xml',                     title: 'Cliff',                      diff: 'e', preview: 'easy_cliff' },
  { file: 'easy_fish.xml',                    title: 'Fish',                       diff: 'e', preview: 'easy_fish' },
  { file: 'easy_2.xml',                       title: 'Block Over Troubled Spikes', diff: 'e', preview: 'easy_troubledspikes' },
  { file: 'tutorial_diagonal.xml',            title: 'Diag. Reflection',           diff: 't', preview: 'tutorial_diagonal' },
  { file: 'tutorial_nar_items.xml',           title: 'Non-Reflectable Objects',    diff: 't', preview: 'tutorial_nonreflectable' },
  { file: 'tutorial_destruction.xml',         title: 'Destruction',                diff: 't', preview: 'tutorial_destruction' },
  { file: 'block_intro.xml',                  title: 'Block Intro',                diff: 't', preview: 'tutorial_block' },
  { file: 'block_destruction.xml',            title: 'Block Warfare',              diff: 'e', preview: 'easy_blockwarfare' },
  { file: 'best_buddies.xml',                 title: 'Best Buddies...',            diff: 'e', preview: 'easy_bestbuddies', titleKey: 'Best Buddies' },
  { file: 'switch_intro.xml',                 title: 'Switch Intro',               diff: 't', preview: 'tutorial_switch' },
  { file: 'easy_switches.xml',               title: 'Switches',                   diff: 'e', preview: 'easy_switches' },
  { file: 'diagonal_spikes.xml',             title: 'Spiky Staircase',            diff: 'e', preview: 'easy_staircase' },
  { file: 'medium_1.xml',                    title: 'Ladder',                     diff: 'e', preview: 'easy_ladder' },
  { file: 'cliff.xml',                       title: 'Bigger Cliff',               diff: 'm', preview: 'medium_biggercliff' },
  { file: 'easy_wave.xml',                   title: 'Wave',                       diff: 'm', preview: 'medium_wave' },
  { file: 'easy_cube.xml',                   title: 'Cube',                       diff: 'm', preview: 'medium_cube' },
  { file: 'box_maze.xml',                    title: 'Box Maze',                   diff: 'm', preview: 'medium_boxmaze' },
  { file: 'medium_cat.xml',                  title: 'Cat',                        diff: 'm', preview: 'medium_cat' },
  { file: 'easy_x.xml',                      title: 'X',                          diff: 'm', preview: 'medium_x' },
  { file: 'temp.xml',                        title: 'Old School',                 diff: 'm', preview: 'medium_oldschool' },
  { file: 'timing.xml',                      title: 'Timing',                     diff: 'h', preview: 'medium_timing' },
  { file: 'block_pickup.xml',                title: 'Block Ladder',               diff: 'm', preview: 'medium_blockladder' },
  { file: 'sparse.xml',                      title: 'Sparse',                     diff: 'm', preview: 'medium_sparse' },
  { file: 'medium_crocodile.xml',            title: 'Crocodile',                  diff: 'm', preview: 'medium_crocodile' },
  { file: 'zigzag.xml',                      title: 'Zig-Zag',                    diff: 'm', preview: 'medium_zigzag' },
  { file: 'easy_crampedspaces.xml',          title: 'Cramped Spaces',             diff: 'm', preview: 'medium_cramped' },
  { file: 'broken_heart.xml',                title: 'Broken Heart',               diff: 'm', preview: 'medium_brokenheart' },
  { file: 'easy_butterfly.xml',              title: 'Butterfly',                  diff: 'h', preview: 'hard_butterfly' },
  { file: 'honeycomb.xml',                   title: 'Honeycomb',                  diff: 'h', preview: 'hard_honeycomb' },
  { file: 'lol.xml',                         title: 'LOL',                        diff: 'h', preview: 'hard_lol' },
  { file: 'multilevel.xml',                  title: 'Multi-Level',                diff: 'h', preview: 'hard_multilevel' },
  { file: 'toss.xml',                        title: 'Toss',                       diff: 'h', preview: 'hard_toss' },
  { file: 'dense.xml',                       title: 'Dense',                      diff: 'h', preview: 'hard_dense' },
  { file: 'boxes_2.xml',                     title: 'Boxes',                      diff: 'h', preview: 'hard_boxes' },
  { file: 'treacherous.xml',                 title: 'Treacherous',                diff: 'h', preview: 'hard_treacherous' },
  { file: 'hardcore.xml',                    title: 'Hardcore',                   diff: 'h', preview: 'hard_hardcore' },
  { file: 'cliffhanger.xml',                 title: 'Cliffhanger',                diff: 'h', preview: 'hard_cliffhanger' },
  { file: 'medium_mushroom.xml',             title: 'Mushroom',                   diff: 'h', preview: 'hard_mushroom' },
  { file: 'the_test.xml',                    title: 'The Test',                   diff: 'h', preview: 'hard_test' },
  { file: 'hard_spider.xml',                 title: 'Spider',                     diff: 'h', preview: 'hard_spider' },
  { file: 'medium_butterfly.xml',            title: 'Butterfly v2',               diff: 'h', preview: 'hard_butterfly2' },
  { file: 'hard_bear.xml',                   title: 'Bear',                       diff: 'h', preview: 'hard_bear' }
];

export const CREDITS_LEVEL_FILE = 'credits_level.xml';
