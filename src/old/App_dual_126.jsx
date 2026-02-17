import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// === Config =====================================================

// const FOLDER = "/gigahands_long_diez_blind";

// const FILE_LIST = [
//     "00_p002-dog_008_text_1_Toss_a_different_toy_into_the_play_area_for_the_puppy_to_chase_.jsonl",
//     "00_p002-dog_008_text_2_Fling_another_toy_into_the_play_zone_for_the_puppy_to_go_after.jsonl",
//     "01_p027-packing_010_text_1_Grasp_the_stain_removing_pen_securely_in_your_hand.jsonl",
//     "01_p027-packing_010_text_2_Clutch_the_stain_removing_pen_tightly_in_your_hand.jsonl",
// ];
const FOLDER = "/old/infer_trainset_blind_100";

// 🧩 Place your .jsonl filenames here:
const FILE_LIST = [
    "00_p007-salad_041_text_Toss_the_salad_in_the_bowl_to_coat_all_the_salad_ingredients_thoroughly_with_the_dressing.jsonl",
    "01_p014-tool_012_text_Drill_the_screw_into_the_hole_in_the_wood.jsonl",
    "02_p042-firstaid_019_text_Grip_the_gauze_swab_with_the_tweezer_to_prepare_for_further_cleaning.jsonl",
    "03_p035-instrument_087_text_Strum_the_strings_of_the_harp_with_your_fingers_or_a_pick_to_produce_a_continuous_sound.jsonl",
    "04_p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool_094_text_Decrescendo_by_gradually_decreasing_the_volume_of_your_plucking_on_the_strings.jsonl",
    "05_p048-sandwich_021_text_Detach_the_fork_from_the_last_slice_of_spam_on_the_cutting_board.jsonl",
    "06_p042-noodle_027_text_Slide_the_chopsticks_out_of_the_opened_wrapper_using_your_fingers.jsonl",
    "07_p017-phone_006_text_Double_click_the_lock_button_on_the_phone_to_open_the_Apple_Wallet.jsonl",
    "08_p040-monopoly_051_text_Stack_one_three-card_pile_on_top_of_the_other_three-card_pile_of_the_deck.jsonl",
    "09_p042-tea_006_text_Pick_up_the_tea_bag_box_from_the_table.jsonl",
    "10_p019-makeup_005_text_Spread_the_serum_evenly_over_your_face_using_gentle_upward_strokes_with_your_fingertips.jsonl",
    "11_p038-stone_022_text_Polish_the_surface_of_the_stone_with_the_sandpaper_in_your_hand.jsonl",
    "12_p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool_317_text_Grip_the_gauze_swab_with_the_newly_taken_tweezer_from_the_kit.jsonl",
    "13_p034-monopoly_052_text_Draw_a_card_from_the_main_deck_on_the_table_to_add_to_your_hand.jsonl",
    "14_p007-laptop_007_text_Adjust_the_angle_of_the_laptop_screen_for_better_viewing.jsonl",
    "15_p018-present_003_text_Peel_the_tape_off_the_wrapping_paper_of_the_gift_by_lifting_one_corner_and_pulling_gently_to_avoid_t.jsonl",
    "16_p005-instrument-makeup-dog-packing-massage-firstaid-cleaning-tool_274_text_Extend_your_right_arm_forward_in_front_of_you.jsonl",
    "17_p042-instrument_053_text_Put_down_the_Otamatone_on_a_stable_surface.jsonl",
    "18_p007-tablet-gopro_069_text_Tap_the__text__icon_on_the_screen_to_prepare_for_entering_text.jsonl",
    "19_p034-monopoly_053_text_Play_a_card_from_your_hand_by_placing_it_face-up_next_to_the_main_deck.jsonl",
];

// const FOLDER = "/gigahandsfull";

// // 🧩 Place your .jsonl filenames here:
// const FILE_LIST = [
//     "massage_your_hands.jsonl",
//     "Mop_the_table_surface_using_a_damp_cloth_or_mop_to_clean_it.jsonl",
//     "Play_a_piece_of_music_on_the_ukulele.jsonl",
//     "Rinse_off_the_dog's_shampoo_from_the_puppy's_fur_with_water_using_the_showerhead.jsonl",
//     "SLAM_THE_CAN.jsonl",
// ];
// ================================================================

async function loadJSONL(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    const text = await res.text();
    return text.trim().split("\n").map(line => JSON.parse(line));
}

function extractHands(frame) {
    const left = frame.slice(0, 21).map(([x, y, z]) => [x, y, z]);
    const right = frame.slice(21, 42).map(([x, y, z]) => [x, y, z]);
    return { left, right };
}

const JOINT_COLORS_LEFT = [
    "#ffffff", "#ff8c00", "#ff8c00", "#ff8c00", "#ff8c00",
    "#00bfff", "#00bfff", "#00bfff", "#00bfff",
    "#7fff00", "#7fff00", "#7fff00", "#7fff00",
    "#ff1493", "#ff1493", "#ff1493", "#ff1493",
    "#9932cc", "#9932cc", "#9932cc", "#9932cc",
];

const JOINT_COLORS_RIGHT = [
    "#aaaaaa", "#ffbb55", "#ffbb55", "#ffbb55", "#ffbb55",
    "#55ddff", "#55ddff", "#55ddff", "#55ddff",
    "#99ff55", "#99ff55", "#99ff55", "#99ff55",
    "#ff77bb", "#ff77bb", "#ff77bb", "#ff77bb",
    "#cc88ff", "#cc88ff", "#cc88ff", "#cc88ff",
];

const BONES = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
];

function DotCloud({ points, colors }) {
    return points.map((pos, i) => (
        <mesh key={i} position={pos}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color={colors?.[i] || "white"} />
        </mesh>
    ));
}

function BoneLines({ points, color = "white" }) {
    return BONES.map(([a, b], i) => {
        if (!points[a] || !points[b]) return null;
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...points[a]),
            new THREE.Vector3(...points[b])
        ]);
        const material = new THREE.LineBasicMaterial({ color });
        return <line key={i} geometry={geometry} material={material} />;
    });
}

function FrameAnimator({ frames, fps, paused = false }) {
    const [index, setIndex] = useState(0);
    const acc = useRef(0);
    const refIdx = useRef(0);
    const dt = 1 / fps;

    useFrame((_, delta) => {
        if (paused) return;
        acc.current += delta;
        if (acc.current > dt) {
            acc.current = 0;
            refIdx.current = (refIdx.current + 1) % frames.length;
            setIndex(refIdx.current);
        }
    });

    const { left, right } = frames[index] || { left: [], right: [] };

    return (
        <>
            <DotCloud points={left} colors={JOINT_COLORS_LEFT} />
            <BoneLines points={left} color="white" />
            <DotCloud points={right} colors={JOINT_COLORS_RIGHT} />
            <BoneLines points={right} color="cyan" />
        </>
    );
}

export default function App_dual_126() {
    const [frames, setFrames] = useState([]);
    const [fps, setFps] = useState(20);
    const [paused, setPaused] = useState(false);
    const [selectedFile, setSelectedFile] = useState("");

    useEffect(() => {
        if (!selectedFile) return;
        const path = `${FOLDER}/${selectedFile}`;
        loadJSONL(path)
            .then(rawFrames => {
                const parsed = rawFrames.map(extractHands);
                setFrames(parsed);
                console.log("✔ Loaded dual-hand frames:", rawFrames.length);
            })
            .catch(console.error);
    }, [selectedFile]);

    return (
        <>
            <Canvas camera={{ position: [0, 1, 3], fov: 50 }} style={{ height: "100vh", background: "#111" }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[1, 2, 1]} intensity={1} />
                <primitive object={new THREE.AxesHelper(1)} />
                <OrbitControls />
                {frames.length > 0 && <FrameAnimator frames={frames} fps={fps} paused={paused} />}
            </Canvas>

            <div style={{
                position: "absolute", top: 10, left: 10, color: "white",
                background: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 8
            }}>
                <div style={{ fontWeight: "bold" }}>App_dual_126 Viewer</div>

                <label style={{ display: "block", marginTop: 10 }}>
                    File:&nbsp;
                    <select
                        value={selectedFile}
                        onChange={e => setSelectedFile(e.target.value)}
                        style={{ padding: 4, borderRadius: 4 }}
                    >
                        <option value="">Select a motion...</option>
                        {FILE_LIST.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </label>

                <button
                    onClick={() => setPaused(p => !p)}
                    style={{
                        marginTop: 10, padding: "6px 12px",
                        background: "#444", color: "white",
                        border: "none", borderRadius: 4, cursor: "pointer"
                    }}
                >
                    {paused ? "▶ Play" : "⏸ Pause"}
                </button>

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <input
                        type="range"
                        min={1}
                        max={60}
                        value={fps}
                        onChange={e => setFps(parseInt(e.target.value))}
                        style={{ width: 160 }}
                    />
                    <span>FPS: {fps}</span>
                </label>
            </div>
        </>
    );
}
