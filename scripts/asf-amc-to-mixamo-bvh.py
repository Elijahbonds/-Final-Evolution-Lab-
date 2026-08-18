#!/usr/bin/env python3
"""Convert a CMU ASF/AMC take to a Mixamo-named, rest-relative BVH.

FEL-unity (basketball_dunk__elijah.bvh) was not readable from this environment.
CMU 124_06 is a real basketball aerial mocap (lay-up). Runtime prefers Elijah's
BVH when that file is present under public/assets/.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from transforms3d.euler import euler2mat, mat2euler

CMU_TO_MIXAMO = {
    "root": "Hips",
    "lowerback": "Spine",
    "upperback": "Spine1",
    "thorax": "Spine2",
    "lowerneck": "Neck",
    "head": "Head",
    "lclavicle": "LeftShoulder",
    "lhumerus": "LeftArm",
    "lradius": "LeftForeArm",
    "lwrist": "LeftHand",
    "rclavicle": "RightShoulder",
    "rhumerus": "RightArm",
    "rradius": "RightForeArm",
    "rwrist": "RightHand",
    "lfemur": "LeftUpLeg",
    "ltibia": "LeftLeg",
    "lfoot": "LeftFoot",
    "ltoes": "LeftToeBase",
    "rfemur": "RightUpLeg",
    "rtibia": "RightLeg",
    "rfoot": "RightFoot",
    "rtoes": "RightToeBase",
}

MIXAMO_TREE = [
    ("Hips", None, (0, 100, 0)),
    ("Spine", "Hips", (0, 10, 0)),
    ("Spine1", "Spine", (0, 10, 0)),
    ("Spine2", "Spine1", (0, 10, 0)),
    ("Neck", "Spine2", (0, 12, 0)),
    ("Head", "Neck", (0, 10, 0)),
    ("LeftShoulder", "Spine2", (6, 8, 0)),
    ("LeftArm", "LeftShoulder", (12, 0, 0)),
    ("LeftForeArm", "LeftArm", (25, 0, 0)),
    ("LeftHand", "LeftForeArm", (22, 0, 0)),
    ("RightShoulder", "Spine2", (-6, 8, 0)),
    ("RightArm", "RightShoulder", (-12, 0, 0)),
    ("RightForeArm", "RightArm", (-25, 0, 0)),
    ("RightHand", "RightForeArm", (-22, 0, 0)),
    ("LeftUpLeg", "Hips", (8, -10, 0)),
    ("LeftLeg", "LeftUpLeg", (0, -40, 0)),
    ("LeftFoot", "LeftLeg", (0, -40, 0)),
    ("LeftToeBase", "LeftFoot", (0, -5, 12)),
    ("RightUpLeg", "Hips", (-8, -10, 0)),
    ("RightLeg", "RightUpLeg", (0, -40, 0)),
    ("RightFoot", "RightLeg", (0, -40, 0)),
    ("RightToeBase", "RightFoot", (0, -5, 12)),
]


class Joint:
    def __init__(self, name, direction, length, axis, dof, limits):
        self.name = name
        self.direction = np.reshape(direction, [3, 1])
        self.length = length
        axis = np.deg2rad(axis)
        self.C = euler2mat(*axis)
        self.Cinv = np.linalg.inv(self.C)
        self.limits = np.zeros([3, 2])
        for lm, nm in zip(limits, dof):
            if nm == "rx":
                self.limits[0] = lm
            elif nm == "ry":
                self.limits[1] = lm
            else:
                self.limits[2] = lm
        self.parent = None
        self.children = []
        self.coordinate = None
        self.matrix = None

    def set_motion(self, motion):
        if self.name == "root":
            self.coordinate = np.reshape(np.array(motion["root"][:3]), [3, 1])
            rotation = np.deg2rad(motion["root"][3:])
            self.matrix = self.C.dot(euler2mat(*rotation)).dot(self.Cinv)
        else:
            idx = 0
            rotation = np.zeros(3)
            for axis, lm in enumerate(self.limits):
                if not np.array_equal(lm, np.zeros(2)):
                    rotation[axis] = motion[self.name][idx]
                    idx += 1
            rotation = np.deg2rad(rotation)
            self.matrix = self.parent.matrix.dot(self.C).dot(euler2mat(*rotation)).dot(self.Cinv)
            self.coordinate = self.parent.coordinate + self.length * self.matrix.dot(self.direction)
        for child in self.children:
            child.set_motion(motion)


def read_line(stream, idx):
    if idx >= len(stream):
        return None, idx
    line = stream[idx].strip().split()
    idx += 1
    return line, idx


def parse_asf(file_path):
    with open(file_path) as f:
        content = f.read().splitlines()
    for idx, line in enumerate(content):
        if line == ":bonedata":
            content = content[idx + 1 :]
            break
    joints = {"root": Joint("root", np.zeros(3), 0, np.zeros(3), [], [])}
    idx = 0
    while True:
        line, idx = read_line(content, idx)
        if line[0] == ":hierarchy":
            break
        assert line[0] == "begin"
        line, idx = read_line(content, idx)
        assert line[0] == "id"
        line, idx = read_line(content, idx)
        assert line[0] == "name"
        name = line[1]
        line, idx = read_line(content, idx)
        assert line[0] == "direction"
        direction = np.array([float(axis) for axis in line[1:]])
        line, idx = read_line(content, idx)
        assert line[0] == "length"
        length = float(line[1])
        line, idx = read_line(content, idx)
        assert line[0] == "axis"
        axis = np.array([float(v) for v in line[1:-1]])
        dof = []
        limits = []
        line, idx = read_line(content, idx)
        if line[0] == "dof":
            dof = line[1:]
            for i in range(len(dof)):
                line, idx = read_line(content, idx)
                if i == 0:
                    assert line[0] == "limits"
                    line = line[1:]
                mini = float(line[0][1:])
                maxi = float(line[1][:-1])
                limits.append((mini, maxi))
            line, idx = read_line(content, idx)
        assert line[0] == "end"
        joints[name] = Joint(name, direction, length, axis, dof, limits)
    line, idx = read_line(content, idx)
    assert line[0] == "begin"
    while True:
        line, idx = read_line(content, idx)
        if line[0] == "end":
            break
        for joint_name in line[1:]:
            joints[line[0]].children.append(joints[joint_name])
        for nm in line[1:]:
            joints[nm].parent = joints[line[0]]
    return joints


def parse_amc(file_path):
    with open(file_path) as f:
        content = f.read().splitlines()
    for idx, line in enumerate(content):
        if line == ":DEGREES":
            content = content[idx + 1 :]
            break
    frames = []
    idx = 0
    line, idx = read_line(content, idx)
    eof = False
    while not eof:
        joint_degree = {}
        while True:
            line, idx = read_line(content, idx)
            if line is None:
                eof = True
                break
            if line[0].isnumeric():
                break
            joint_degree[line[0]] = [float(deg) for deg in line[1:]]
        frames.append(joint_degree)
    return frames


def zero_motion(sample: dict) -> dict:
    return {name: [0.0] * len(vals) for name, vals in sample.items()}


def mat_to_xyz_deg(m: np.ndarray) -> tuple[float, float, float]:
    ai, aj, ak = mat2euler(m, axes="sxyz")
    return tuple(np.rad2deg([ai, aj, ak]))


def write_hierarchy(fp) -> list[str]:
    children: dict[str | None, list[tuple]] = {}
    for name, parent, offset in MIXAMO_TREE:
        children.setdefault(parent, []).append((name, offset))
    order: list[str] = []

    def walk(name: str, offset, indent: int) -> None:
        pad = "  " * indent
        kind = "ROOT" if name == "Hips" else "JOINT"
        fp.write(f"{pad}{kind} {name}\n{pad}{{\n")
        fp.write(f"{pad}  OFFSET {offset[0]:.4f} {offset[1]:.4f} {offset[2]:.4f}\n")
        if name == "Hips":
            fp.write(f"{pad}  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation\n")
        else:
            fp.write(f"{pad}  CHANNELS 3 Zrotation Xrotation Yrotation\n")
        order.append(name)
        for child, child_off in children.get(name, []):
            walk(child, child_off, indent + 1)
        if not children.get(name):
            fp.write(f"{pad}  End Site\n{pad}  {{\n{pad}    OFFSET 0 5 0\n{pad}  }}\n")
        fp.write(f"{pad}}}\n")

    fp.write("HIERARCHY\n")
    hips = children[None][0]
    walk(hips[0], hips[1], 0)
    return order


def convert(asf_path: Path, amc_path: Path, out_path: Path, clip_name: str, source: str) -> None:
    joints = parse_asf(str(asf_path))
    frames = parse_amc(str(amc_path))
    rest = zero_motion(frames[0])
    joints["root"].set_motion(rest)
    rest_mats = {name: j.matrix.copy() for name, j in joints.items() if j.matrix is not None}

    wrist_y = []
    root_y = []
    deltas: list[dict[str, tuple[float, float, float]]] = []
    hip_pos: list[tuple[float, float, float]] = []

    for motion in frames:
        joints["root"].set_motion(motion)
        frame_delta = {}
        for cmu_name, mixamo in CMU_TO_MIXAMO.items():
            joint = joints.get(cmu_name)
            if joint is None or joint.matrix is None or cmu_name not in rest_mats:
                continue
            delta = rest_mats[cmu_name].T @ joint.matrix
            frame_delta[mixamo] = mat_to_xyz_deg(delta)
        deltas.append(frame_delta)
        root = joints["root"]
        hip_pos.append(
            (float(root.coordinate[0, 0]), float(root.coordinate[1, 0]), float(root.coordinate[2, 0]))
        )
        wy = 0.0
        n = 0
        for wn in ("lwrist", "rwrist"):
            w = joints.get(wn)
            if w is not None and w.coordinate is not None:
                wy += float(w.coordinate[1, 0])
                n += 1
        wrist_y.append(wy / max(1, n))
        root_y.append(float(root.coordinate[1, 0]))

    peak = int(np.argmax(np.array(wrist_y) + 0.35 * np.array(root_y)))
    hang_start = max(0, peak - 24)
    hang_end = min(len(frames) - 1, peak + 36)
    fps = 60
    step = 2
    sampled = list(range(0, len(frames), step))
    hang_start_s = min(range(len(sampled)), key=lambda i: abs(sampled[i] - hang_start))
    hang_end_s = min(range(len(sampled)), key=lambda i: abs(sampled[i] - hang_end))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as fp:
        fp.write(f"# clip_name {clip_name}\n")
        fp.write(f"# source {source}\n")
        fp.write("# rest_relative 1\n")
        fp.write(f"# hang_start {hang_start_s}\n")
        fp.write(f"# hang_end {hang_end_s}\n")
        fp.write(f"# peak_frame {peak} src_frames {len(frames)}\n")
        order = write_hierarchy(fp)
        fp.write(f"MOTION\nFrames: {len(sampled)}\nFrame Time: {1 / fps:.6f}\n")
        for src_i in sampled:
            d = deltas[src_i]
            hx, hy, hz = hip_pos[src_i]
            parts = [f"{hx:.4f}", f"{hy:.4f}", f"{hz:.4f}"]
            hx_e, hy_e, hz_e = d.get("Hips", (0, 0, 0))
            parts.extend([f"{hz_e:.4f}", f"{hx_e:.4f}", f"{hy_e:.4f}"])
            for name in order[1:]:
                x, y, z = d.get(name, (0, 0, 0))
                parts.extend([f"{z:.4f}", f"{x:.4f}", f"{y:.4f}"])
            fp.write(" ".join(parts) + "\n")

    print(
        f"wrote {out_path} frames={len(sampled)} peak={peak} "
        f"hang={hang_start_s}-{hang_end_s} wristY={wrist_y[peak]:.2f} rootY={root_y[peak]:.2f}"
    )


if __name__ == "__main__":
    convert(
        Path("/tmp/cmu/124.asf"),
        Path("/tmp/cmu/124_06.amc"),
        Path("/workspace/public/assets/cmu_124_06_basketball_layup.bvh"),
        "cmu_124_06_basketball_layup",
        "CMU_Graphics_Lab_124_06_Basketball_Lay_Up",
    )
