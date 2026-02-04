/**
 * 深度估计测试脚本
 * 用 MiDaS 模型从图片生成深度图
 */

const fs = require('fs');

// 从环境变量获取 API Token，或在此处填入你的 Token
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "YOUR_API_TOKEN_HERE";
const LOCAL_IMAGE_PATH = "D:\\work\\web\\perler-beads-creator\\TEMP\\teddy.webp";

async function testDepthEstimation() {
  console.log("🚀 开始测试深度估计 API（MiDaS）...\n");
  console.log("📷 输入图片:", LOCAL_IMAGE_PATH);
  console.log("");

  try {
    // 读取图片并转换为 base64
    const imageBuffer = fs.readFileSync(LOCAL_IMAGE_PATH);
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:image/webp;base64,${base64Image}`;

    console.log("📦 图片大小:", (imageBuffer.length / 1024).toFixed(2), "KB");
    console.log("⏳ 正在生成深度图...\n");

    // 调用 Depth Anything V2 API
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Depth Anything V2 模型
        version: "b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4",
        input: {
          image: dataUri
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
      console.log("🎉 深度图生成成功！\n");

      const outputUrl = result.output;
      console.log("📦 深度图下载链接:");
      console.log("   ", outputUrl);

      // 下载深度图
      if (outputUrl) {
        console.log("\n⬇️ 正在下载深度图...");
        const depthResponse = await fetch(outputUrl);
        const depthBuffer = Buffer.from(await depthResponse.arrayBuffer());
        const outputPath = "D:\\work\\web\\perler-beads-creator\\TEMP\\teddy_depth.png";
        fs.writeFileSync(outputPath, depthBuffer);
        console.log("✅ 已保存到:", outputPath);
        console.log("   文件大小:", (depthBuffer.length / 1024).toFixed(2), "KB");
      }

      console.log("\n💰 本次调用耗时:", result.metrics?.predict_time?.toFixed(2), "秒");
      console.log("✅ 测试通过！");

    } else if (result.status === "failed") {
      console.log("❌ 生成失败:", result.error);
    } else {
      console.log("⚠️ 超时");
    }

  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testDepthEstimation();
