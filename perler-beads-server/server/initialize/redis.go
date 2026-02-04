package initialize

import (
	"context"
	"perler-beads-server/global"

	"github.com/go-redis/redis/v8"
)

// Redis 初始化 Redis 连接
func Redis() *redis.Client {
	r := global.GVA_CONFIG.Redis

	client := redis.NewClient(&redis.Options{
		Addr:     r.Addr,
		Password: r.Password,
		DB:       r.DB,
	})

	// 测试连接
	ctx := context.Background()
	_, err := client.Ping(ctx).Result()
	if err != nil {
		global.GVA_LOG.Error("Redis connection failed: " + err.Error())
		return nil
	}

	global.GVA_LOG.Info("Redis connected successfully")

	return client
}
