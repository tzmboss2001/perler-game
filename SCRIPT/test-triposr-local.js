/**
 * TripoSR API 测试脚本 - 本地图片版本
 * 功能：使用本地图片生成 3D 模型
 */

const fs = require('fs');
const path = require('path');

// 从环境变量获取 API Token，或在此处填入你的 Token
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "YOUR_API_TOKEN_HERE";

// 本地图片路径
const LOCAL_IMAGE_PATH = "D:\\work\\web\\perler-beads-creator\\TEMP\\teddy.webp";

async function testTripoSRWithLocalImage() {
  console.log("🚀 开始测试 TripoSR API（本地图片）...\n");
  console.log("📷 本地图片:", LOCAL_IMAGE_PATH);
  console.log("");

  try {
    // 读取图片并转换为 base64
    const imageBuffer = fs.readFileSync(LOCAL_IMAGE_PATH);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/webp';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    console.log("📦 图片大小:", (imageBuffer.length / 1024).toFixed(2), "KB");
    console.log("⏳ 正在调用 API 生成 3D 模型...\n");

    // 创建预测任务
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "e0d3fe8abce3ba86497ea3530d9eae59af7b2231b6c82bedfc32b0732d35ec3a",
        input: {
          image_path: dataUri
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${error}`);
    }

    const prediction = await response.json();
    console.log("✅ 任务已创建，ID:", prediction.id);
    console.log("📊 状态:", prediction.status);
    console.log("");

    // 轮询等待结果
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 120;

    while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
      await sleep(1000);
      attempts++;

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
        }
      });

      result = await statusResponse.json();
      process.stdout.write(`\r⏳ 等待中... ${attempts}秒 (状态: ${result.status})    `);
    }

    console.log("\n");

    // 检查结果
    if (result.status === "succeeded") {
      console.log("🎉 3D 模型生成成功！\n");

      const outputUrl = typeof result.output === "string" ? result.output : result.output?.mesh;
      console.log("📦 3D 模型下载链接:");
      console.log("   ", outputUrl || result.output);

      // 下载模型文件
      if (outputUrl) {
        console.log("\n⬇️ 正在下载模型文件...");
        const modelResponse = await fetch(outputUrl);
        const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());
        const outputPath = "D:\\work\\web\\perler-beads-creator\\TEMP\\teddy_3d_model.glb";
        fs.writeFileSync(outputPath, modelBuffer);
        console.log("✅ 已保存到:", outputPath);
        console.log("   文件大小:", (modelBuffer.length / 1024).toFixed(2), "KB");
      }

      console.log("\n💰 本次调用耗时:", result.metrics?.predict_time?.toFixed(2), "秒");
      console.log("✅ 测试通过！");

    } else if (result.status === "failed") {
      console.log("❌ 生成失败:", result.error);
    } else {
      console.log("⚠️ 超时，任务仍在处理中");
      console.log("   查看进度:", `https://replicate.com/p/${prediction.id}`);
    }

  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testTripoSRWithLocalImage();
