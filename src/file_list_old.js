const FILE_LIST = [
  {
    filename:
      "p005-gopro_009_alt0_Capture_the_tree_marker_by_pressing_the_capture_button.jsonl",
    scene: "p005-gopro",
    sequence: "009",
    text: "Capture the tree marker by pressing the capture button",
  },
  {
    filename:
      "p005-gopro_009_alt1_Press_the_capture_button_on_the_GoPro_to_seize_the_tree_mark.jsonl",
    scene: "p005-gopro",
    sequence: "009",
    text: "Press the capture button on the GoPro to seize the tree marker.",
  },
  {
    filename:
      "p005-gopro_009_alt2_Hit_the_capture_button_on_the_GoPro_to_photograph_the_tree_m.jsonl",
    scene: "p005-gopro",
    sequence: "009",
    text: "Hit the capture button on the GoPro to photograph the tree marker.",
  },
  {
    filename:
      "p013-fastfood-sandwich_080_alt0_Slice_the_spam_into_even_pieces.jsonl",
    scene: "p013-fastfood-sandwich",
    sequence: "080",
    text: "Slice the spam into even pieces",
  },
  {
    filename:
      "p013-fastfood-sandwich_080_alt1_Cut_the_spam_into_equal_pieces_on_the_cutting_bo.jsonl",
    scene: "p013-fastfood-sandwich",
    sequence: "080",
    text: "Cut the spam into equal pieces on the cutting board.",
  },
  {
    filename:
      "p013-fastfood-sandwich_080_alt2_Chop_the_spam_into_uniform_slices_on_the_cutting.jsonl",
    scene: "p013-fastfood-sandwich",
    sequence: "080",
    text: "Chop the spam into uniform slices on the cutting board.",
  },
  {
    filename:
      "p025-firstaid_017_alt0_Wipe_the_wound_on_the_wrist_thoroughly_to_clean_it_with_t.jsonl",
    scene: "p025-firstaid",
    sequence: "017",
    text: "Wipe the wound on the wrist thoroughly to clean it with the tweezer",
  },
  {
    filename:
      "p025-firstaid_017_alt1_Cleanse_the_wrist_wound_completely_with_the_wipe_pad_held.jsonl",
    scene: "p025-firstaid",
    sequence: "017",
    text: "Cleanse the wrist wound completely with the wipe pad held in the tweezer.",
  },
  {
    filename:
      "p025-firstaid_017_alt2_Use_the_tweezer_to_hold_the_wipe_pad_and_properly_sanitiz.jsonl",
    scene: "p025-firstaid",
    sequence: "017",
    text: "Use the tweezer to hold the wipe pad and properly sanitize the wound on the wrist.",
  },
  {
    filename: "p017-baking_027_alt0_Shape_the_first_portion_into_a_roll.jsonl",
    scene: "p017-baking",
    sequence: "027",
    text: "Shape the first portion into a roll",
  },
  {
    filename:
      "p017-baking_027_alt1_Mold_the_initial_section_of_the_separated_dough_into_a_roll.jsonl",
    scene: "p017-baking",
    sequence: "027",
    text: "Mold the initial section of the separated dough into a roll shape.",
  },
  {
    filename:
      "p017-baking_027_alt2_Form_the_first_part_of_the_split_dough_into_a_roll.jsonl",
    scene: "p017-baking",
    sequence: "027",
    text: "Form the first part of the split dough into a roll.",
  },
  {
    filename:
      "p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool_198_alt0_Apply.jsonl",
    scene: "p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool",
    sequence: "198",
    text: "Apply a small amount of facial cleanser to your fingertips",
  },
  {
    filename:
      "p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool_198_alt1_Dab_a.jsonl",
    scene: "p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool",
    sequence: "198",
    text: "Dab a little facial cleanser onto your fingertips.",
  },
  {
    filename:
      "p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool_198_alt2_Sprea.jsonl",
    scene: "p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool",
    sequence: "198",
    text: "Spread a small amount of facial cleanser onto your fingertips.",
  },
  {
    filename:
      "p026-noodle_012_alt0_Throw_away_the_used_tissue_into_the_trash_can.jsonl",
    scene: "p026-noodle",
    sequence: "012",
    text: "Throw away the used tissue into the trash can",
  },
  {
    filename:
      "p026-noodle_012_alt1_Throw_the_used_tissue_in_the_trash_can.jsonl",
    scene: "p026-noodle",
    sequence: "012",
    text: "Throw the used tissue in the trash can.",
  },
  {
    filename:
      "p026-noodle_012_alt2_Discard_the_used_tissue_in_the_trash_can.jsonl",
    scene: "p026-noodle",
    sequence: "012",
    text: "Discard the used tissue in the trash can.",
  },
  {
    filename:
      "p005-present_002_alt0_Unwind_the_ribbon_from_around_the_gift.jsonl",
    scene: "p005-present",
    sequence: "002",
    text: "Unwind the ribbon from around the gift",
  },
  {
    filename:
      "p005-present_002_alt1_Detach_the_ribbon_from_around_the_gift_box.jsonl",
    scene: "p005-present",
    sequence: "002",
    text: "Detach the ribbon from around the gift box.",
  },
  {
    filename:
      "p005-present_002_alt2_Unravel_the_ribbon_encircling_the_gift_box.jsonl",
    scene: "p005-present",
    sequence: "002",
    text: "Unravel the ribbon encircling the gift box.",
  },
  {
    filename: "p014-tool_008_alt0_Hang_the_wrench_on_the_hook.jsonl",
    scene: "p014-tool",
    sequence: "008",
    text: "Hang the wrench on the hook",
  },
  {
    filename:
      "p014-tool_008_alt1_Suspend_the_wrench_from_the_hook_mounted_on_the_wall_or_tool_.jsonl",
    scene: "p014-tool",
    sequence: "008",
    text: "Suspend the wrench from the hook mounted on the wall or tool board.",
  },
  {
    filename:
      "p014-tool_008_alt2_Place_the_wrench_on_the_hook_that_is_attached_to_the_wall_or_.jsonl",
    scene: "p014-tool",
    sequence: "008",
    text: "Place the wrench on the hook that is attached to the wall or tool board.",
  },
  {
    filename:
      "p011-noodle_047_alt0_Tilt_the_container_to_sip_the_remaining_soup_directly.jsonl",
    scene: "p011-noodle",
    sequence: "047",
    text: "Tilt the container to sip the remaining soup directly",
  },
  {
    filename:
      "p011-noodle_047_alt1_Angle_the_ramen_container_to_drink_the_leftover_soup_straig.jsonl",
    scene: "p011-noodle",
    sequence: "047",
    text: "Angle the ramen container to drink the leftover soup straight.",
  },
  {
    filename:
      "p011-noodle_047_alt2_Tip_the_ramen_container_to_slurp_the_remaining_broth_direct.jsonl",
    scene: "p011-noodle",
    sequence: "047",
    text: "Tip the ramen container to slurp the remaining broth directly.",
  },
  {
    filename:
      "p036-sewing_014_alt0_Puncture_the_used_needle_into_the_futon.jsonl",
    scene: "p036-sewing",
    sequence: "014",
    text: "Puncture the used needle into the futon",
  },
  {
    filename:
      "p036-sewing_014_alt1_Insert_the_used_needle_into_the_futon_to_fasten_it.jsonl",
    scene: "p036-sewing",
    sequence: "014",
    text: "Insert the used needle into the futon to fasten it.",
  },
  {
    filename:
      "p036-sewing_014_alt2_Stick_the_used_needle_into_the_futon_to_hold_it_in_place.jsonl",
    scene: "p036-sewing",
    sequence: "014",
    text: "Stick the used needle into the futon to hold it in place.",
  },
  {
    filename: "p046-sandwich_001_alt0_Take_out_a_slice_of_bread.jsonl",
    scene: "p046-sandwich",
    sequence: "001",
    text: "Take out a slice of bread",
  },
  {
    filename:
      "p046-sandwich_001_alt1_Extract_a_slice_of_bread_from_the_bag.jsonl",
    scene: "p046-sandwich",
    sequence: "001",
    text: "Extract a slice of bread from the bag.",
  },
  {
    filename:
      "p046-sandwich_001_alt2_Take_a_slice_of_bread_out_of_the_bag.jsonl",
    scene: "p046-sandwich",
    sequence: "001",
    text: "Take a slice of bread out of the bag.",
  },
  {
    filename:
      "p042-tablet_047_alt0_Double_click_the_lock_button_to_open_the_Apple_Wallet.jsonl",
    scene: "p042-tablet",
    sequence: "047",
    text: "Double click the lock button to open the Apple Wallet",
  },
  {
    filename:
      "p042-tablet_047_alt1_Double_tap_the_lock_button_on_the_iPhone_to_activate_the_Ap.jsonl",
    scene: "p042-tablet",
    sequence: "047",
    text: "Double tap the lock button on the iPhone to activate the Apple Wallet.",
  },
  {
    filename:
      "p042-tablet_047_alt2_Press_the_lock_button_twice_on_the_iPhone_to_open_Apple_Wal.jsonl",
    scene: "p042-tablet",
    sequence: "047",
    text: "Press the lock button twice on the iPhone to open Apple Wallet.",
  },
  {
    filename: "p032-baking_008_alt0_Pour_the_water_into_the_mixing_bowl.jsonl",
    scene: "p032-baking",
    sequence: "008",
    text: "Pour the water into the mixing bowl",
  },
  {
    filename:
      "p032-baking_008_alt1_Empty_the_water_from_the_measuring_cup_into_the_mixing_bowl.jsonl",
    scene: "p032-baking",
    sequence: "008",
    text: "Empty the water from the measuring cup into the mixing bowl.",
  },
  {
    filename:
      "p032-baking_008_alt2_Transfer_the_water_from_the_measuring_cup_to_the_mixing_bow.jsonl",
    scene: "p032-baking",
    sequence: "008",
    text: "Transfer the water from the measuring cup to the mixing bowl.",
  },
  {
    filename:
      "p011-monopoly_003_alt0_Shuffle_the_chance_and_community_chest_decks_separately.jsonl",
    scene: "p011-monopoly",
    sequence: "003",
    text: "Shuffle the chance and community chest decks separately",
  },
  {
    filename:
      "p011-monopoly_003_alt1_Mix_up_the_chance_deck_and_the_community_chest_deck_indep.jsonl",
    scene: "p011-monopoly",
    sequence: "003",
    text: "Mix up the chance deck and the community chest deck independently.",
  },
  {
    filename:
      "p011-monopoly_003_alt2_Randomize_the_chance_deck_and_the_community_chest_deck_wi.jsonl",
    scene: "p011-monopoly",
    sequence: "003",
    text: "Randomize the chance deck and the community chest deck without combining them.",
  },
  {
    filename: "p037-fastfood_041_alt0_Scoop_a_piece_of_pudding.jsonl",
    scene: "p037-fastfood",
    sequence: "041",
    text: "Scoop a piece of pudding",
  },
  {
    filename:
      "p037-fastfood_041_alt1_Use_the_spoon_to_lift_a_portion_of_pudding_from_the_plate.jsonl",
    scene: "p037-fastfood",
    sequence: "041",
    text: "Use the spoon to lift a portion of pudding from the plate.",
  },
  {
    filename:
      "p037-fastfood_041_alt2_With_the_spoon_extract_a_piece_of_pudding_off_the_plate.jsonl",
    scene: "p037-fastfood",
    sequence: "041",
    text: "With the spoon, extract a piece of pudding off the plate.",
  },
  {
    filename: "p040-baking_034_alt0_Switch_on_the_oven.jsonl",
    scene: "p040-baking",
    sequence: "034",
    text: "Switch on the oven",
  },
  {
    filename: "p040-baking_034_alt1_Activate_the_oven_to_heat_it_up.jsonl",
    scene: "p040-baking",
    sequence: "034",
    text: "Activate the oven to heat it up.",
  },
  {
    filename: "p040-baking_034_alt2_Turn_on_the_oven_to_warm_it.jsonl",
    scene: "p040-baking",
    sequence: "034",
    text: "Turn on the oven to warm it.",
  },
  {
    filename:
      "p034-sandwich_005_alt0_Press_the_toaster_lever_to_start_toasting_the_bread.jsonl",
    scene: "p034-sandwich",
    sequence: "005",
    text: "Press the toaster lever to start toasting the bread",
  },
  {
    filename:
      "p034-sandwich_005_alt1_Push_down_the_toaster_lever_to_begin_toasting_the_bread_s.jsonl",
    scene: "p034-sandwich",
    sequence: "005",
    text: "Push down the toaster lever to begin toasting the bread slice.",
  },
  {
    filename:
      "p034-sandwich_005_alt2_Depress_the_toaster_lever_to_initiate_the_toasting_of_the.jsonl",
    scene: "p034-sandwich",
    sequence: "005",
    text: "Depress the toaster lever to initiate the toasting of the bread slice.",
  },
  {
    filename:
      "p054-tablet_036_alt0_Detach_the_phone_from_the_charging_station.jsonl",
    scene: "p054-tablet",
    sequence: "036",
    text: "Detach the phone from the charging station",
  },
  {
    filename:
      "p054-tablet_036_alt1_Disconnect_the_phone_from_the_charging_station_on_the_desk.jsonl",
    scene: "p054-tablet",
    sequence: "036",
    text: "Disconnect the phone from the charging station on the desk.",
  },
  {
    filename:
      "p054-tablet_036_alt2_Unplug_the_phone_from_the_charging_station_on_the_desk.jsonl",
    scene: "p054-tablet",
    sequence: "036",
    text: "Unplug the phone from the charging station on the desk.",
  },
  {
    filename: "p053-salad_085_alt0_Mash_the_nuts_with_a_pestle.jsonl",
    scene: "p053-salad",
    sequence: "085",
    text: "Mash the nuts with a pestle",
  },
  {
    filename:
      "p053-salad_085_alt1_Crush_the_nuts_with_the_pestle_in_the_mortar.jsonl",
    scene: "p053-salad",
    sequence: "085",
    text: "Crush the nuts with the pestle in the mortar.",
  },
  {
    filename:
      "p053-salad_085_alt2_Grind_the_nuts_using_the_pestle_in_the_mortar.jsonl",
    scene: "p053-salad",
    sequence: "085",
    text: "Grind the nuts using the pestle in the mortar.",
  },
  {
    filename: "p013-mindmap_009_alt0_Tear_off_a_sticky_note_from_the_pad.jsonl",
    scene: "p013-mindmap",
    sequence: "009",
    text: "Tear off a sticky note from the pad",
  },
  {
    filename:
      "p013-mindmap_009_alt1_Peel_away_a_sticky_note_from_the_pad_on_the_table.jsonl",
    scene: "p013-mindmap",
    sequence: "009",
    text: "Peel away a sticky note from the pad on the table.",
  },
  {
    filename:
      "p013-mindmap_009_alt2_Detach_a_sticky_note_from_the_pad_on_the_table.jsonl",
    scene: "p013-mindmap",
    sequence: "009",
    text: "Detach a sticky note from the pad on the table.",
  },
];
export default FILE_LIST;
