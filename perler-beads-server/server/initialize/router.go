package initialize

import (
	"os"
	"path/filepath"
	"perler-beads-server/middleware"
	"perler-beads-server/router"

	"github.com/gin-gonic/gin"
)

// Routers initializes all HTTP routes.
func Routers() *gin.Engine {
	r := gin.Default()

	r.Use(middleware.Cors())

	publicGroup := r.Group("/api/v1")
	privateGroup := r.Group("/api/v1")
	privateGroup.Use(middleware.JWTAuth())

	// Public APIs
	router.InitAuthRouter(publicGroup)
	router.InitBeadRouter(publicGroup)
	router.InitTemplatePublicRouter(publicGroup)
	router.InitCommunityPublicRouter(publicGroup)
	router.InitFinishedWorkPublicRouter(publicGroup)
	router.InitUserPublicRouter(publicGroup)
	router.InitProjectRouter(publicGroup)
	router.InitUploadRouter(publicGroup)
	router.InitFeedbackRouter(publicGroup)
	router.InitDepthRouter(publicGroup)
	router.InitAiRouter(publicGroup)

	// Private APIs
	router.InitAuthPrivateRouter(privateGroup)
	router.InitUserRouter(privateGroup)
	router.InitTemplateRouter(privateGroup)
	router.InitTemplateAdminRouter(privateGroup)
	router.InitCommunityRouter(privateGroup)
	router.InitFinishedWorkRouter(privateGroup)
	router.InitPaymentRouter(privateGroup)
	router.InitProjectPrivateRouter(privateGroup)

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "perler-beads-server",
		})
	})

	// Static media for community thumbnails and finished-work images.
	thumbnailDir := resolveStaticDir("THUMBNAIL_DIR", "thumbnails")
	_ = os.MkdirAll(thumbnailDir, 0755)
	r.Static("/thumbnails", thumbnailDir)

	finishedDir := resolveStaticDir("FINISHED_WORK_DIR", "finished-works")
	_ = os.MkdirAll(finishedDir, 0755)
	r.Static("/finished-works", finishedDir)

	return r
}

func resolveStaticDir(envKey string, subDir string) string {
	if v := os.Getenv(envKey); v != "" {
		return v
	}

	wd, _ := os.Getwd()
	candidates := []string{
		filepath.Join("/www", "wwwroot", "perler-beads", subDir),
		filepath.Join("/www", "wwwroot", "perler-beads", "public", subDir),
		filepath.Join(wd, "..", "..", "perler-beads", "public", subDir),
		filepath.Join(wd, "..", "perler-beads", "public", subDir),
		filepath.Join(wd, "perler-beads", "public", subDir),
		filepath.Join(wd, subDir),
	}

	for _, dir := range candidates {
		if st, err := os.Stat(dir); err == nil && st.IsDir() {
			return dir
		}
	}

	for _, dir := range candidates {
		parent := filepath.Dir(dir)
		if st, err := os.Stat(parent); err == nil && st.IsDir() {
			return dir
		}
	}

	return filepath.Join(wd, subDir)
}
