// src/hand/TwoHandsModel.js
import * as THREE from "three";
import { HandColorSchemes, HandModel } from "./HandModel";

export class TwoHandsModel {
  constructor({
    name = "twoHands",
    rootAtOrigin = false,
    leftOffset = [0, 0, 0],
    rightOffset = [0, 0, 0],
    leftScheme = HandColorSchemes.byFinger(),
    rightScheme = HandColorSchemes.byFinger(),
  } = {}) {
    this.group = new THREE.Group();
    this.group.name = name;

    this.left = new HandModel({
      name: `${name}_L`,
      rootAtOrigin,
      colorScheme: leftScheme,
      offset: leftOffset,
    });
    this.right = new HandModel({
      name: `${name}_R`,
      rootAtOrigin,
      colorScheme: rightScheme,
      offset: rightOffset,
    });

    this.leftOffset = leftOffset;
    this.rightOffset = rightOffset;

    this.group.add(this.left.group);
    this.group.add(this.right.group);
  }

  setVisible(v) {
    this.group.visible = !!v;
  }

  setRootAtOrigin(v) {
    this.left.setRootAtOrigin(v);
    this.right.setRootAtOrigin(v);
  }

  setOffsets(leftOffset, rightOffset) {
    this.leftOffset = leftOffset;
    this.rightOffset = rightOffset;
  }

  // points42: [42][3] => [0..20]=left, [21..41]=right (same split you already use):contentReference[oaicite:7]{index=7}
  setFromPoints42(points42) {
    if (!points42 || points42.length < 42) return;
    const leftPts = points42.slice(0, 21);
    const rightPts = points42.slice(21, 42);

    this.left.setPointsXYZ(leftPts, { offset: this.leftOffset });
    this.right.setPointsXYZ(rightPts, { offset: this.rightOffset });
  }

  // Optional: angles for each hand separately

  // TwoHandsModel.js
  setFromFrame(frame) {
    if (!frame || typeof frame !== "object") {
      console.error(
        "[TwoHandsModel.setFromFrame] frame is not an object:",
        frame,
      );
      return;
    }

    const an = frame.angles_nested;

    // Expect: [2][5][4][3]
    const valid =
      Array.isArray(an) &&
      an.length === 2 &&
      Array.isArray(an[0]) &&
      an[0].length === 5 &&
      Array.isArray(an[0][0]) &&
      an[0][0].length === 4 &&
      Array.isArray(an[0][0][0]) &&
      an[0][0][0].length === 3;

    if (!valid) {
      console.error(
        "[TwoHandsModel.setFromFrame] invalid angles_nested shape. Expected [2][5][4][3]. Got:",
        an,
      );
      return;
    }

    this.left.setFromPhiTheta(an[0]);
    this.right.setFromPhiTheta(an[1]);
  }

  //TODO not working use setfromframe
  setFromPhiTheta({
    leftAngles,
    rightAngles,
    leftLengths,
    rightLengths,
    leftOffset,
    rightOffset,
  } = {}) {
    const lo = leftOffset ?? this.leftOffset;
    const ro = rightOffset ?? this.rightOffset;
    // console.log(
    //   "TwoHandsModel setFromPhiTheta with leftAngles, rightAngles, leftLengths, rightLengths, degrees, leftOffset, rightOffset ",
    //   {
    //     leftAngles,
    //     rightAngles,
    //     leftLengths,
    //     rightLengths,
    //     degrees,
    //     leftOffset,
    //     rightOffset,
    //   },
    // );
    if (leftAngles) {
      this.left.setFromPhiTheta({
        angles: leftAngles,
        radius: leftLengths, // harmless even if HandModel ignores it
        offset: lo,
      });
    }

    if (rightAngles) {
      this.right.setFromPhiTheta({
        angles: rightAngles,
        radius: rightLengths,
        offset: ro,
      });
    }
  }
}
