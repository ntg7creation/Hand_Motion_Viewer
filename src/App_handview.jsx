import React, { useEffect, useState } from "react";

export default function App_handview() {
    const [motions, setMotions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/generated_motion/results.json")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch");
                return res.json();
            })
            .then((data) => {
                console.log("[INFO] Motion data loaded");
                setMotions(data.motion || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error loading motion data:", err);
                setLoading(false);
            });
    }, []);

    // Safely unwrap the first frame from unexpected nested arrays
    let flatFrame = [];
    if (motions?.[0]?.[0]) {
        const first = motions[0][0];
        if (Array.isArray(first) && Array.isArray(first[0])) {
            // Shape is [[60]]
            flatFrame = first[0];
        } else {
            // Shape is [60]
            flatFrame = first;
        }
    }

    console.log("Flat frame (first 10 values):", flatFrame.slice(0, 10));

    return (
        <div style={{ padding: "20px" }}>
            <h2>Hand Motion Viewer Debug</h2>

            {loading && <p>Loading motion data...</p>}

            {!loading && motions.length === 0 && (
                <p style={{ color: "red" }}>No motion data found.</p>
            )}

            {!loading && motions.length > 0 && flatFrame.length === 60 && (
                <>
                    <p><b>Loaded motions:</b> {motions.length}</p>
                    <h3>Frame 0 Breakdown</h3>
                    <p><b>Frame Length:</b> {flatFrame.length}</p>
                    <p>
                        <b>Root Position (0–2):</b>{" "}
                        [{flatFrame.slice(0, 3).map(n => n.toFixed(3)).join(", ")}]
                    </p>
                    <p>
                        <b>Velocity Slice (3–9):</b>{" "}
                        [{flatFrame.slice(3, 10).map(n => n.toFixed(3)).join(", ")}]
                    </p>
                </>
            )}
        </div>
    );
}
