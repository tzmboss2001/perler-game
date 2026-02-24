package utils

import (
	"errors"
	"perler-game-server/global"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	TokenExpired     = errors.New("token is expired")
	TokenNotValidYet = errors.New("token not active yet")
	TokenMalformed   = errors.New("that's not even a token")
	TokenInvalid     = errors.New("couldn't handle this token")
)

// CustomClaims 自定义声明
type CustomClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// JWT 结构体
type JWT struct {
	SigningKey []byte
}

// NewJWT 创建 JWT 实例
func NewJWT() *JWT {
	return &JWT{
		SigningKey: []byte(global.GVA_CONFIG.JWT.SigningKey),
	}
}

// CreateToken 创建 Token
func (j *JWT) CreateToken(claims CustomClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.SigningKey)
}

// ParseToken 解析 Token
func (j *JWT) ParseToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		return j.SigningKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, TokenExpired
		}
		return nil, err
	}

	if token != nil {
		if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
			return claims, nil
		}
	}

	return nil, TokenInvalid
}

// CreateClaims 创建 Claims
func (j *JWT) CreateClaims(userID uint, username string) CustomClaims {
	return CustomClaims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			NotBefore: jwt.NewNumericDate(time.Now().Add(-1000)),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			Issuer:    global.GVA_CONFIG.JWT.Issuer,
		},
	}
}
