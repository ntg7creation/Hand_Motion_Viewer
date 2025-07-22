# Hand Motion Viewer

A web-based 3D visualizer built with React and Three.js for exploring hand motion data from the [GigaHands](https://github.com/guiggh/GigaHands) dataset.

This viewer loads 3D hand keypoints (left and right) from `.jsonl` files and plays them as animated sequences. It also reads gesture annotations and allows interactive selection and inspection of gesture metadata.

## 🚀 Features

- 3D point cloud visualization of hand joints
- Colored bones drawn between finger joints
- Dropdown selector to choose gestures from annotations
- Scene and sequence navigation from `annotations_v2.jsonl`
- Frame-by-frame animation with playback

## 🖐️ Dataset Assumptions

The app expects the following dataset structure:

```
public/
├── annotations_v2.jsonl
└── hand_poses/
    ├── p001-folder/
    │   └── keypoints_3d/
    │       └── 000/
    │           ├── left.jsonl
    │           └── right.jsonl
    ├── p002-folder/
    │   └── ...
```


## 🛠 Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/ntg7creation/Hand_Motion_Viewer.git
cd Hand_Motion_Viewer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Link the dataset (optional)

To avoid copying large files, create a symbolic link to your dataset:

#### Windows CMD (run as Administrator):

```bash
mklink /D public\hand_poses D:\repos\GigaHands\dataset\GigaHands\hand_poses
```

#### Linux/macOS:

```bash
ln -s /absolute/path/to/GigaHands/hand_poses public/hand_poses
```

### 4. Start the app

```bash
npm run dev
```

Then visit: [http://localhost:5173](http://localhost:5173)

## 📦 Notes

- Large files like `results.json` are excluded from Git using `.gitignore`
- This project does **not use Git LFS** — large files should remain locally linked
- GitHub Pages is not supported for this viewer (requires local file access)

## 📄 License

MIT

## 👤 Author

Created by [ntg7creation](https://github.com/ntg7creation)