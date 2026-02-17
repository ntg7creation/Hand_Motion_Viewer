import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

import { HandColorSchemes } from "./hand/HandModel";
import { TwoHandsModel } from "./hand/TwoHandsModel";

import { GUI } from "lil-gui";
import { createFingerGui } from "./hand/createFingerGui";

const gui = new GUI();
gui.add({ test: 1 }, "test", 0, 10);

import { applyFrameMiddleFingerOnly, applyFrameToTwoHands } from "./motion/applyMotionToHands";
import { loadMotionJsonl } from "./motion/motionLoader";

import { useFrame } from "@react-three/fiber";
import { loadOneMotionRaw } from "./debug/loadOneMotionRaw";


// ------------------------------
// Visible fallback pose (static)
// ------------------------------
function makeHandRestPose({ side = "left" } = {}) {
    const wrist = new THREE.Vector3(0, 0, 0);
    const sgn = side === "left" ? 1 : -1;

    const bases = {
        thumb: new THREE.Vector3(0.40 * sgn, 0.05, 0.05),
        index: new THREE.Vector3(0.20 * sgn, 0.10, 0.00),
        middle: new THREE.Vector3(0.00 * sgn, 0.11, 0.00),
        ring: new THREE.Vector3(-0.18 * sgn, 0.10, 0.00),
        pinky: new THREE.Vector3(-0.35 * sgn, 0.08, 0.00),
    };

    const L = {
        thumb: [0.20, 0.18, 0.16, 0.14],
        index: [0.22, 0.20, 0.18, 0.16],
        middle: [0.24, 0.22, 0.20, 0.18],
        ring: [0.23, 0.21, 0.19, 0.17],
        pinky: [0.20, 0.18, 0.16, 0.14],
    };

    const pts = Array.from({ length: 21 }, () => new THREE.Vector3());
    pts[0].copy(wrist);

    function buildFinger(startIdx, base, lens, dir) {
        pts[startIdx].copy(wrist).add(base);
        for (let k = 1; k <= 3; k++) {
            pts[startIdx + k]
                .copy(pts[startIdx + k - 1])
                .addScaledVector(dir, lens[k]);
        }
    }

    const up = new THREE.Vector3(0, 1, 0);
    const thumbDir = new THREE.Vector3(0.6 * sgn, 0.8, 0.0).normalize();
    const indexDir = new THREE.Vector3(0.15 * sgn, 1.0, 0.0).normalize();
    const middleDir = up.clone();
    const ringDir = new THREE.Vector3(-0.10 * sgn, 1.0, 0.0).normalize();
    const pinkyDir = new THREE.Vector3(-0.18 * sgn, 1.0, 0.0).normalize();

    buildFinger(1, bases.thumb, L.thumb, thumbDir);
    buildFinger(5, bases.index, L.index, indexDir);
    buildFinger(9, bases.middle, L.middle, middleDir);
    buildFinger(13, bases.ring, L.ring, ringDir);
    buildFinger(17, bases.pinky, L.pinky, pinkyDir);

    return pts.map((v) => [v.x, v.y, v.z]);
}

function applyFallbackPose(twoHandsModel) {
    const left21 = makeHandRestPose({ side: "left" });
    const right21 = makeHandRestPose({ side: "right" });
    twoHandsModel.setFromPoints42([...left21, ...right21]);
}

// ------------------------------
// Hands + (optional) single-motion test
// ------------------------------
const DEFAULT_MOTION_META = {
    id: "test_p002-firstaid_003",
    filename:
        // "converted_angles_phi_theta/json/p002-firstaid/keypoints_3d/003/angles_both.jsonl",
        // "Synthetic_motions/angles_both_synth_middle_mip_pip_phi.jsonl",
        "Synthetic_motions/real_motion_from_annotation_world.jsonl",
    scene: "p002-firstaid",
    sequence: "003",
    text: "single motion test",
};

function TwoHandsOneMotionTest({ enabled = true, motionMeta }) {
    const model = useMemo(() => {
        const m = new TwoHandsModel({
            name: "twoHands",
            rootAtOrigin: true,
            leftOffset: [2, 0, 0],
            rightOffset: [-2, 0, 0],
            leftScheme: HandColorSchemes.byFinger(),
            rightScheme: HandColorSchemes.byFinger(),
        });
        return m;
    }, []);

    const [status, setStatus] = useState("init");
    const [clip, setClip] = useState(null);
    const playRef = React.useRef({
        t0: 0,
        lastIdx: -1,
    });


    const guiRef = React.useRef(null);

    // ✅ Create GUI once (and destroy on unmount)
    useEffect(() => {
        if (guiRef.current) return;

        guiRef.current = createFingerGui({
            leftHand: model.left,
            rightHand: model.right,
            degrees: true,
            phiMin: -180,
            phiMax: 180,
            thetaMin: -180,
            thetaMax: 180,
        });

        return () => {
            guiRef.current?.dispose?.();
            guiRef.current = null;
        };
    }, [model]);

    // Always start visible
    useEffect(() => {
        // applyFallbackPose(model);
        setStatus("[OneMotionTest] model initialized (fallback)");
    }, [model]);

    // Pick effective motion meta (NO object default in signature)
    const effectiveMeta = motionMeta ?? DEFAULT_MOTION_META;
    const filename = effectiveMeta?.filename; // primitive dependency

    // Load motion (logs + timing)
    useEffect(() => {
        if (!enabled) {
            setStatus("[OneMotionTest] disabled");
            setClip(null);
            return;
        }
        if (!filename) {
            setStatus("[OneMotionTest] missing filename");
            setClip(null);
            return;
        }

        const ac = new AbortController();
        const t0 = performance.now();

        console.log("[OneMotionTest] START load:", filename);
        setStatus(`[OneMotionTest] loading: ${effectiveMeta.scene}/${effectiveMeta.sequence}`);

        (async () => {
            const loaded = await loadMotionJsonl(
                {
                    ...effectiveMeta, // keep scene/sequence/text
                    filename,         // ensure consistent
                },
                { signal: ac.signal }
            );

            const t1 = performance.now();
            console.log(
                "[OneMotionTest] DONE load:",
                loaded.url,
                "frames:",
                loaded.numFrames,
                "time:",
                (t1 - t0).toFixed(1),
                "ms"
            );

            setClip(loaded);
            setStatus(`[OneMotionTest] loaded: ${effectiveMeta.scene}/${effectiveMeta.sequence} (${loaded.numFrames}f)`);
        })().catch((e) => {
            if (e?.name === "AbortError") {
                console.log("[OneMotionTest] ABORT load:", filename);
                return;
            }
            console.error("[OneMotionTest] load error:", e);
            setStatus(`[OneMotionTest] error loading: ${effectiveMeta.scene}/${effectiveMeta.sequence}`);
            setClip(null);
        });

        return () => ac.abort();
    }, [enabled, filename]); // <-- only primitives

    // Optional: keep this log
    useEffect(() => {
        console.log(status);
    }, [status]);

    useFrame((state) => {
        if (!enabled) return;
        if (!clip || !clip.frames || clip.frames.length === 0) return;

        const fps = 30; // change if your dataset uses a different fps
        const elapsed = state.clock.getElapsedTime();

        // start time anchor once clip is ready
        if (playRef.current.t0 === 0) playRef.current.t0 = elapsed;

        const local = elapsed - playRef.current.t0;
        const idx = Math.floor(local * fps) % clip.frames.length;

        // avoid re-applying same frame every render tick
        if (idx === playRef.current.lastIdx) return;
        playRef.current.lastIdx = idx;

        const frame = clip.frames[idx];
        // const ok = applyFrameToTwoHands(model, frame, { degreesOverride: true });
        const ok = applyFrameToTwoHands(model, frame);


        // If adapter fails mid-playback, don't spam logs every frame
        if (!ok && playRef.current.lastIdx !== -999) {
            playRef.current.lastIdx = -999;
            console.warn("[OneMotionTest] applyFrameToTwoHands failed (adapter mismatch).");
        }
    });


    return <primitive object={model.group} />;
}


// ------------------------------
// Full modular scene
// ------------------------------
export default function Modular_scene() {
    return (
        <Canvas camera={{ position: [0, 2.5, 7], fov: 50 }}>
            {/* lights */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 8, 5]} intensity={1.0} />

            {/* helpers */}
            <axesHelper args={[3]} />
            <gridHelper args={[12, 12]} />

            {/* hands */}
            <TwoHandsOneMotionTest enabled={true} />

            {/* controls */}
            <OrbitControls makeDefault />
        </Canvas>
    );
}
