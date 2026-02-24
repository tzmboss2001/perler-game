/**
 * 生成一个带不同面颜色的立方体 GLB 模型（手动构建 glTF binary）
 * 用法: node SCRIPT/generateBoxModel.mjs
 */

import { writeFileSync } from 'fs';

// 立方体 6 面，每面 4 顶点 2 三角形
// 每面不同颜色: 前(橙) 后(蓝) 上(绿) 下(黄) 右(红) 左(紫)

const faceColors = [
  [1.0, 0.53, 0.0],   // front +Z  橙
  [0.27, 0.53, 1.0],  // back  -Z  蓝
  [0.27, 0.8, 0.27],  // top   +Y  绿
  [1.0, 0.8, 0.0],    // bottom-Y  黄
  [1.0, 0.27, 0.27],  // right +X  红
  [0.6, 0.27, 1.0],   // left  -X  紫
];

// 每面 4 顶点 (position, normal, color)
const positions = [];
const normals = [];
const colors = [];
const indices = [];

function addFace(v0, v1, v2, v3, normal, color, baseIdx) {
  positions.push(...v0, ...v1, ...v2, ...v3);
  for (let i = 0; i < 4; i++) {
    normals.push(...normal);
    colors.push(...color);
  }
  indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
}

let vi = 0;
// Front +Z
addFace([-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1], [0,0,1], faceColors[0], vi); vi += 4;
// Back -Z
addFace([1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1], [0,0,-1], faceColors[1], vi); vi += 4;
// Top +Y
addFace([-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1], [0,1,0], faceColors[2], vi); vi += 4;
// Bottom -Y
addFace([-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1], [0,-1,0], faceColors[3], vi); vi += 4;
// Right +X
addFace([1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1], [1,0,0], faceColors[4], vi); vi += 4;
// Left -X
addFace([-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1], [-1,0,0], faceColors[5], vi); vi += 4;

// 构建 buffer 数据
const posArray = new Float32Array(positions);
const normArray = new Float32Array(normals);
const colorArray = new Float32Array(colors);
const idxArray = new Uint16Array(indices);

// 计算 buffer 大小（需要4字节对齐）
function align4(n) { return Math.ceil(n / 4) * 4; }

const posByteLen = posArray.byteLength;
const normByteLen = normArray.byteLength;
const colorByteLen = colorArray.byteLength;
const idxByteLen = idxArray.byteLength;

const posOffset = 0;
const normOffset = align4(posOffset + posByteLen);
const colorOffset = align4(normOffset + normByteLen);
const idxOffset = align4(colorOffset + colorByteLen);
const totalBufferLen = align4(idxOffset + idxByteLen);

// 创建合并 buffer
const binBuffer = new ArrayBuffer(totalBufferLen);
const binView = new DataView(binBuffer);
const binUint8 = new Uint8Array(binBuffer);

// 写入数据
binUint8.set(new Uint8Array(posArray.buffer), posOffset);
binUint8.set(new Uint8Array(normArray.buffer), normOffset);
binUint8.set(new Uint8Array(colorArray.buffer), colorOffset);
binUint8.set(new Uint8Array(idxArray.buffer), idxOffset);

// 计算 bounding box
const posMin = [-1, -1, -1];
const posMax = [1, 1, 1];

// 构建 glTF JSON
const gltf = {
  asset: { version: "2.0", generator: "perler-beads-box-generator" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "ColorBox" }],
  meshes: [{
    primitives: [{
      attributes: {
        POSITION: 0,
        NORMAL: 1,
        COLOR_0: 2
      },
      indices: 3,
      mode: 4 // TRIANGLES
    }]
  }],
  accessors: [
    { // 0: POSITION
      bufferView: 0,
      componentType: 5126, // FLOAT
      count: 24,
      type: "VEC3",
      min: posMin,
      max: posMax
    },
    { // 1: NORMAL
      bufferView: 1,
      componentType: 5126,
      count: 24,
      type: "VEC3"
    },
    { // 2: COLOR_0
      bufferView: 2,
      componentType: 5126,
      count: 24,
      type: "VEC3"
    },
    { // 3: INDICES
      bufferView: 3,
      componentType: 5123, // UNSIGNED_SHORT
      count: 36,
      type: "SCALAR"
    }
  ],
  bufferViews: [
    { buffer: 0, byteOffset: posOffset, byteLength: posByteLen, target: 34962 },
    { buffer: 0, byteOffset: normOffset, byteLength: normByteLen, target: 34962 },
    { buffer: 0, byteOffset: colorOffset, byteLength: colorByteLen, target: 34962 },
    { buffer: 0, byteOffset: idxOffset, byteLength: idxByteLen, target: 34963 }
  ],
  buffers: [{ byteLength: totalBufferLen }]
};

const jsonStr = JSON.stringify(gltf);
// JSON chunk 需要 4 字节对齐，用空格填充
const jsonPadded = jsonStr + ' '.repeat(align4(jsonStr.length) - jsonStr.length);
const jsonBytes = new TextEncoder().encode(jsonPadded);

// 构建 GLB 文件
// Header: magic(4) + version(4) + length(4) = 12
// JSON chunk: length(4) + type(4) + data
// BIN chunk: length(4) + type(4) + data
const glbLength = 12 + 8 + jsonBytes.byteLength + 8 + totalBufferLen;
const glbBuffer = new ArrayBuffer(glbLength);
const glbView = new DataView(glbBuffer);
const glbUint8 = new Uint8Array(glbBuffer);

let offset = 0;

// GLB Header
glbView.setUint32(offset, 0x46546C67, true); offset += 4; // magic "glTF"
glbView.setUint32(offset, 2, true); offset += 4;           // version
glbView.setUint32(offset, glbLength, true); offset += 4;   // total length

// JSON Chunk
glbView.setUint32(offset, jsonBytes.byteLength, true); offset += 4; // chunk length
glbView.setUint32(offset, 0x4E4F534A, true); offset += 4;          // type "JSON"
glbUint8.set(jsonBytes, offset); offset += jsonBytes.byteLength;

// BIN Chunk
glbView.setUint32(offset, totalBufferLen, true); offset += 4; // chunk length
glbView.setUint32(offset, 0x004E4942, true); offset += 4;    // type "BIN\0"
glbUint8.set(binUint8, offset);

// 写入文件
const outputPath = 'public/models/ColorBox.glb';
writeFileSync(outputPath, Buffer.from(glbBuffer));
console.log(`✅ 生成完成: ${outputPath} (${(glbBuffer.byteLength / 1024).toFixed(1)} KB)`);
console.log(`   24 顶点, 36 索引, 6 面不同颜色`);
