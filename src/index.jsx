import React from "react";
import ReactDOM from "react-dom/client";

import "./styles.css";

/* ---------------------- visual for gigahands dataset ---------------------- */
// import App from "./App.jsx";
// ReactDOM.createRoot(document.getElementById("root")).render(
//     <React.StrictMode>
//         <App />
//     </React.StrictMode>
// );


/* ----------------- visual for our model inference results ----------------- */
// import App from "./App_test.jsx";
// ReactDOM.createRoot(document.getElementById("root")).render(
//     <React.StrictMode>
//         <App />
//     </React.StrictMode>
// );


/* ----------------- visual for our model inference 126 results ----------------- */
// import App_126 from "./App_126.jsx";
// ReactDOM.createRoot(document.getElementById("root")).render(
//     <React.StrictMode>
//         <App_126 />
//     </React.StrictMode>
// );

/* ----------------- visual for our model inference dual hand 126 results  ----------------- */
// import App_dual_126 from "./App_dual_126.jsx";
// ReactDOM.createRoot(document.getElementById("root")).render(
//     <React.StrictMode>
//         <App_dual_126 />
//     </React.StrictMode>
// );

/* ----------------- visual for our model inference dual hand infrence from a file train set  ----------------- */
// import App_render_infrance from "./App_render_file.jsx";
// ReactDOM.createRoot(document.getElementById("root")).render(
//     <React.StrictMode>
//         <App_render_infrance />
//     </React.StrictMode>
// );

// render for velocity set
// import App_render_infer_3sets from "./App_render_infer_3sets.jsx";
// ReactDOM.createRoot(document.getElementById("root")).render(
//     <React.StrictMode>
//         <App_render_infer_3sets />
//     </React.StrictMode>
// );

import Modular_Scene from "./Modular_Scene.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <Modular_Scene />
    </React.StrictMode>
);

// import Viewer from "./viewer.jsx"; // Or the correct path

// ReactDOM.createRoot(document.getElementById("root")).render(<Viewer />);


// import ViewerSpeed from './viewer_speed';

// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(<ViewerSpeed />);


// import App_handview from "./App_handview";
// ReactDOM.createRoot(document.getElementById("root")).render(
//     <React.StrictMode>
//         <App_handview />
//     </React.StrictMode>
// );
