/**
 * IroningSystem - 熨烫模拟系统
 * 管理熨烫参数、执行熨烫、生成结果
 */

import type { IroningParams, IroningResult, Point } from '@/types/game';
import type { BeadBoard } from './BeadBoard';
import { calculateRisk, calcUniformity, calcCoverage } from './RiskCalculator';
import { determineFailure, generateReport, applyFailureToBoard } from './FailureEngine';
import { calculatePhysics } from './PhysicsCalculator';

export class IroningSystem {
  temperature: number = 5;  // 默认温度 (1-10)
  duration: number = 0;     // 当前已熨烫时间
  trajectory: Point[] = []; // 熨烫轨迹
  isIroning: boolean = false;
  startTime: number = 0;
  paperCoverage: number = 1;   // 烘焙纸覆盖率（1=完全覆盖）
  beadLossRate: number = 0;    // 前置步骤豆子损失率

  /** 设置温度 */
  setTemperature(temp: number): void {
    this.temperature = Math.max(1, Math.min(10, temp));
  }

  /** 开始熨烫 */
  start(): void {
    this.isIroning = true;
    this.startTime = Date.now();
    this.duration = 0;
    this.trajectory = [];
  }

  /** 添加轨迹点（归一化到网格坐标） */
  addTrajectoryPoint(x: number, y: number): void {
    if (!this.isIroning) return;
    this.trajectory.push({ x, y });
  }

  /** 更新时间 */
  updateTime(): number {
    if (!this.isIroning) return this.duration;
    this.duration = (Date.now() - this.startTime) / 1000;
    return this.duration;
  }

  /** 停止熨烫并计算结果 */
  finish(board: BeadBoard): IroningResult {
    this.isIroning = false;
    this.updateTime();

    const params: IroningParams = {
      temperature: this.temperature,
      duration: this.duration,
      trajectory: this.trajectory,
      pressure: 1,
    };

    // 计算风险值（含前置步骤风险因子）
    const riskScore = calculateRisk(
      params.temperature,
      params.duration,
      params.trajectory,
      board.width,
      board.height,
      this.paperCoverage,
      this.beadLossRate,
    );

    // 判定失败类型
    const failureType = determineFailure(riskScore, params);

    // 如果失败，应用效果到画板
    const affectedBeads = failureType
      ? applyFailureToBoard(board, failureType, params)
      : [];

    // 生成报告
    const success = !failureType;
    const report = generateReport(success, failureType, riskScore, params);

    // 计算连续物理参数
    const uniformity = calcUniformity(params.trajectory, board.width, board.height);
    const physics = calculatePhysics(
      params.temperature,
      params.duration,
      params.trajectory,
      board.width,
      board.height,
      uniformity,
      riskScore,
    );

    return {
      success,
      riskScore,
      failureType: failureType ?? undefined,
      affectedBeads,
      report,
      physics,
    };
  }

  /** 设置前置步骤数据 */
  setPreStepData(paperCoverage: number, beadLossRate: number): void {
    this.paperCoverage = paperCoverage;
    this.beadLossRate = beadLossRate;
  }

  /** 重置 */
  reset(): void {
    this.temperature = 5;
    this.duration = 0;
    this.trajectory = [];
    this.isIroning = false;
    this.startTime = 0;
    this.paperCoverage = 1;
    this.beadLossRate = 0;
  }
}
