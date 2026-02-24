package initialize

import (
	"fmt"
	"perler-game-server/global"

	"github.com/spf13/viper"
)

// Viper 初始化配置
func Viper() *viper.Viper {
	v := viper.New()
	v.SetConfigFile("config.yaml")
	v.SetConfigType("yaml")

	err := v.ReadInConfig()
	if err != nil {
		panic(fmt.Errorf("Fatal error config file: %s \n", err))
	}

	if err := v.Unmarshal(&global.GVA_CONFIG); err != nil {
		panic(fmt.Errorf("Unable to decode config: %s \n", err))
	}

	return v
}
