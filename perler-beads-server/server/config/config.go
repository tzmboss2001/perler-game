package config

// Server 服务器配置
type Server struct {
	System     System     `mapstructure:"system" json:"system" yaml:"system"`
	JWT        JWT        `mapstructure:"jwt" json:"jwt" yaml:"jwt"`
	Mysql      Mysql      `mapstructure:"mysql" json:"mysql" yaml:"mysql"`
	Redis      Redis      `mapstructure:"redis" json:"redis" yaml:"redis"`
	Zap        Zap        `mapstructure:"zap" json:"zap" yaml:"zap"`
	TencentCOS TencentCOS `mapstructure:"tencent-cos" json:"tencent-cos" yaml:"tencent-cos"`
	Wechat     Wechat     `mapstructure:"wechat" json:"wechat" yaml:"wechat"`
	Replicate  Replicate  `mapstructure:"replicate" json:"replicate" yaml:"replicate"`
}

// System 系统配置
type System struct {
	Env    string `mapstructure:"env" json:"env" yaml:"env"`
	Addr   int    `mapstructure:"addr" json:"addr" yaml:"addr"`
	DbType string `mapstructure:"db-type" json:"db-type" yaml:"db-type"`
}

// JWT 配置
type JWT struct {
	SigningKey  string `mapstructure:"signing-key" json:"signing-key" yaml:"signing-key"`
	ExpiresTime string `mapstructure:"expires-time" json:"expires-time" yaml:"expires-time"`
	BufferTime  string `mapstructure:"buffer-time" json:"buffer-time" yaml:"buffer-time"`
	Issuer      string `mapstructure:"issuer" json:"issuer" yaml:"issuer"`
}

// Mysql 数据库配置
type Mysql struct {
	Path         string `mapstructure:"path" json:"path" yaml:"path"`
	Port         string `mapstructure:"port" json:"port" yaml:"port"`
	Config       string `mapstructure:"config" json:"config" yaml:"config"`
	Dbname       string `mapstructure:"db-name" json:"db-name" yaml:"db-name"`
	Username     string `mapstructure:"username" json:"username" yaml:"username"`
	Password     string `mapstructure:"password" json:"password" yaml:"password"`
	MaxIdleConns int    `mapstructure:"max-idle-conns" json:"max-idle-conns" yaml:"max-idle-conns"`
	MaxOpenConns int    `mapstructure:"max-open-conns" json:"max-open-conns" yaml:"max-open-conns"`
	LogMode      string `mapstructure:"log-mode" json:"log-mode" yaml:"log-mode"`
	LogZap       bool   `mapstructure:"log-zap" json:"log-zap" yaml:"log-zap"`
}

// Redis 配置
type Redis struct {
	Addr     string `mapstructure:"addr" json:"addr" yaml:"addr"`
	Password string `mapstructure:"password" json:"password" yaml:"password"`
	DB       int    `mapstructure:"db" json:"db" yaml:"db"`
}

// Zap 日志配置
type Zap struct {
	Level         string `mapstructure:"level" json:"level" yaml:"level"`
	Format        string `mapstructure:"format" json:"format" yaml:"format"`
	Prefix        string `mapstructure:"prefix" json:"prefix" yaml:"prefix"`
	Director      string `mapstructure:"director" json:"director" yaml:"director"`
	ShowLine      bool   `mapstructure:"show-line" json:"show-line" yaml:"show-line"`
	EncodeLevel   string `mapstructure:"encode-level" json:"encode-level" yaml:"encode-level"`
	StacktraceKey string `mapstructure:"stacktrace-key" json:"stacktrace-key" yaml:"stacktrace-key"`
	LogInConsole  bool   `mapstructure:"log-in-console" json:"log-in-console" yaml:"log-in-console"`
}

// TencentCOS 腾讯云对象存储配置
type TencentCOS struct {
	Bucket    string `mapstructure:"bucket" json:"bucket" yaml:"bucket"`
	Region    string `mapstructure:"region" json:"region" yaml:"region"`
	SecretID  string `mapstructure:"secret-id" json:"secret-id" yaml:"secret-id"`
	SecretKey string `mapstructure:"secret-key" json:"secret-key" yaml:"secret-key"`
	BaseURL   string `mapstructure:"base-url" json:"base-url" yaml:"base-url"`
}

// Wechat 微信配置
type Wechat struct {
	AppID     string `mapstructure:"app-id" json:"app-id" yaml:"app-id"`
	AppSecret string `mapstructure:"app-secret" json:"app-secret" yaml:"app-secret"`
	MchID     string `mapstructure:"mch-id" json:"mch-id" yaml:"mch-id"`
	APIKey    string `mapstructure:"api-key" json:"api-key" yaml:"api-key"`
}

// Replicate AI 配置
type Replicate struct {
	APIToken        string `mapstructure:"api-token" json:"api-token" yaml:"api-token"`
	MarigoldVersion string `mapstructure:"marigold-version" json:"marigold-version" yaml:"marigold-version"`
}
