package main

import (
	"fmt"
	"perler-game-server/global"
	"perler-game-server/initialize"
)

func main() {
	// 初始化 Viper 配置
	global.GVA_VP = initialize.Viper()

	// 初始化 Zap 日志
	global.GVA_LOG = initialize.Zap()

	// 初始化数据库
	global.GVA_DB = initialize.Gorm()

	// 初始化 Redis（非关键，失败不影响启动）
	global.GVA_REDIS = initialize.Redis()

	// 初始化路由
	router := initialize.Routers()

	// 启动服务
	address := fmt.Sprintf(":%d", global.GVA_CONFIG.System.Addr)
	global.GVA_LOG.Info("Server running on " + address)

	err := router.Run(address)
	if err != nil {
		global.GVA_LOG.Error("Server startup failed: " + err.Error())
	}
}
