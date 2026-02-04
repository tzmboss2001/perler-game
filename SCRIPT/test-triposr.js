/**
 * TripoSR API 测试脚本
 * 功能：上传一张图片，生成 3D 模型
 */

// 从环境变量获取 API Token，或在此处填入你的 Token
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "YOUR_API_TOKEN_HERE";

// 测试用的图片（一个玩具熊的图片）
const TEST_IMAGE_URL = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=512";

async function testTripoSR() {
  console.log("🚀 开始测试 TripoSR API...\n");
  console.log("📷 测试图片:", TEST_IMAGE_URL);
  console.log("");

  try {
    // 1. 创建预测任务
    console.log("⏳ 正在调用 API 生成 3D 模型...");

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // TripoSR 模型版本 (camenduru/tripo-sr)
        version: "e0d3fe8abce3ba86497ea3530d9eae59af7b2231b6c82bedfc32b0732d35ec3a",
        input: {
          image_path: TEST_IMAGE_URL
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

    // 2. 轮询等待结果
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 最多等待 60 秒

    while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
      await sleep(1000);
      attempts++;

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
        }
      });

      result = await statusResponse.json();
      process.stdout.write(`\r⏳ 等待中... ${attempts}秒 (状态: ${result.status})`);
    }

    console.log("\n");

    // 3. 检查结果
    if (result.status === "succeeded") {
      console.log("🎉 3D 模型生成成功！\n");
      console.log("📦 输出文件:");

      if (typeof result.output === "string") {
        console.log("   - 模型文件:", result.output);
      } else if (result.output) {
        Object.entries(result.output).forEach(([key, value]) => {
          console.log(`   - ${key}:`, value);
        });
      }

      console.log("\n💰 本次调用耗时:", result.metrics?.predict_time?.toFixed(2), "秒");
      console.log("✅ 测试通过！API 可正常使用");

    } else if (result.status === "failed") {
      console.log("❌ 生成失败:", result.error);
    } else {
      console.log("⚠️ 超时，任务仍在处理中");
      console.log("   可以稍后查看:", `https://replicate.com/p/${prediction.id}`);
    }

  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
testTripoSR();
