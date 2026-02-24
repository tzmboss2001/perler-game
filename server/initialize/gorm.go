package initialize

import (
	"fmt"
	"perler-game-server/global"
	"perler-game-server/model/entity"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Gorm 初始化数据库
func Gorm() *gorm.DB {
	m := global.GVA_CONFIG.Mysql

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?%s",
		m.Username,
		m.Password,
		m.Path,
		m.Port,
		m.Dbname,
		m.Config,
	)

	var logLevel logger.LogLevel
	switch m.LogMode {
	case "silent":
		logLevel = logger.Silent
	case "error":
		logLevel = logger.Error
	case "warn":
		logLevel = logger.Warn
	case "info":
		logLevel = logger.Info
	default:
		logLevel = logger.Info
	}

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		global.GVA_LOG.Error("MySQL connection failed: " + err.Error())
		return nil
	}

	sqlDB, _ := db.DB()
	sqlDB.SetMaxIdleConns(m.MaxIdleConns)
	sqlDB.SetMaxOpenConns(m.MaxOpenConns)

	global.GVA_LOG.Info("MySQL connected successfully")

	// 自动迁移数据库表
	if err := db.AutoMigrate(
		&entity.User{},
		&entity.Work{},
		&entity.Like{},
		&entity.Comment{},
		&entity.UserAchievement{},
		&entity.UserStats{},
		&entity.Challenge{},
		&entity.UserChallenge{},
	); err != nil {
		global.GVA_LOG.Error("AutoMigrate failed: " + err.Error())
	} else {
		global.GVA_LOG.Info("AutoMigrate completed successfully")
	}

	return db
}
