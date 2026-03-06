package service

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"gorm.io/gorm"
)

type CommunityService struct{}

// GetPosts 闂傚倸鍊风粈渚€宕ョ€ｎ喖纾块柟鎯版鎼村﹪鏌ら懝鎵牚濞存粌缍婇弻娑㈠Ψ閵忊剝鐝栭梺娲诲幖濡繈寮婚悢纰辨晬闁糕剝顨呴弳锝嗙箾閸偄澧紒缁樼⊕濞煎繘宕滆钃辩紓鍌欑贰閸犳牠鎯岄崒鐐靛祦闁哄稁鍓﹀Ο鍕倵鐟欏嫭绀冮柤瑙勫礃閻忓啴姊洪崨濠冪５闁哄倷绶氬畷鎴﹀箻鐠囪尙顦ㄥ銈嗘婵倕鈻嶉弽顓熲拺闁告挻褰冩禍婵堢磼椤斿ジ鍙勯柟顔煎槻閳规垹鈧綆鍋嗛崢?bead_data闂?
func (s *CommunityService) GetPosts(req *request.CommunityPostListRequest) ([]response.CommunityPostListItem, int64, error) {
	db := global.GVA_DB.Model(&entity.CommunityPost{}).Where("community_posts.status = ? AND community_posts.review_status = ?", 1, 1)

	// 闂傚倸鍊风粈渚€骞栭銈囩煋闁哄鍤氬ú顏勎╅柍鍝勶攻閺呫垺淇婇悙宸剰婵炴挳鏀遍妵娆撴惞椤愩倗顔曢梺鐟扮摠濮婂綊宕虫导瀛樼厱?
	if req.Tag != "" {
		db = db.Where("community_posts.tags LIKE ?", "%"+req.Tag+"%")
	}
	if req.Category != "" && req.Category != "all" {
		db = db.Where("community_posts.category = ?", normalizeCommunityCategory(req.Category))
	}

	// 闂傚倸鍊峰ù鍥敋閺嶎厼绀堟繛鎴炶壘閸ㄦ繃銇勯弽顐粶婵?
	var total int64
	db.Count(&total)

	// 闂傚倸鍊风粈渚€骞夐敍鍕殰闁圭儤鍤﹀☉妯锋斀閻庯綆鈧?
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	// 闂傚倸鍊风粈浣革耿闁秴纾块柕鍫濇处閺嗘粓鏌熼悜妯活梿濠?
	orderClause := "community_posts.created_at DESC"
	switch req.Sort {
	case "popular":
		orderClause = "community_posts.like_count DESC, community_posts.created_at DESC"
	case "most_made":
		orderClause = "community_posts.make_count DESC, community_posts.created_at DESC"
	}

	var posts []entity.CommunityPost
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order(orderClause).Offset(offset).Limit(req.PageSize).Find(&posts).Error; err != nil {
		return nil, 0, err
	}

	// 闂傚倸鍊峰ù鍥Υ閳ь剟鏌涚€ｎ偅宕岄柡灞剧洴椤㈡洟鏁愰崱娆樻О闂?userID闂傚倸鍊烽悞锔锯偓绗涘懐鐭欓柟杈剧畱鐎氬銇勯幒宥堝厡闁绘繂鐖奸弻鐔兼倻濮楀棙鐣烽梺缁樻尭閸婂潡鎮￠锕€鐐婇柕濠忚吂閹峰姊洪崨濠勬喛闁稿鎹囧娲嚒閵堝憛銏＄箾鐏炲倸鐏茬€规洝顫夌换婵嗩潩椤掍胶鈧剟姊洪棃娑氬妞わ富鍨崇划濠氭晲婢跺鍙勫┑顔斤供閸撴瑩鍩€椤掑嫷妫戦柟骞垮灲瀹曞崬鈽夊▎鎴濆箥?
	userIDs := make([]uint, 0, len(posts))
	for _, p := range posts {
		userIDs = append(userIDs, p.UserID)
	}
	userMap := s.getUserMap(userIDs)

	result := make([]response.CommunityPostListItem, len(posts))
	for i, p := range posts {
		if s.ensurePostCategory(&p) {
			posts[i].Category = p.Category
		}
		if s.ensurePostBeadHex(&p) {
			posts[i].BeadData = p.BeadData
		}
		if fixedURL, fixed := s.ensurePostThumbnail(&p); fixed {
			p.ThumbnailURL = fixedURL
			posts[i].ThumbnailURL = fixedURL
		}
		result[i] = response.CommunityPostListItem{
			ID:           p.ID,
			Title:        p.Title,
			Category:     p.Category,
			Tags:         p.Tags,
			ThumbnailURL: p.ThumbnailURL,
			PreviewURL:   p.PreviewURL,
			GridWidth:    p.GridWidth,
			GridHeight:   p.GridHeight,
			ColorCount:   p.ColorCount,
			Difficulty:   p.Difficulty,
			PaletteBrand: p.PaletteBrand,
			PaletteVer:   p.PaletteVer,
			PaletteName:  p.PaletteName,
			LikeCount:    p.LikeCount,
			ViewCount:    p.ViewCount,
			MakeCount:    p.MakeCount,
			User:         userMap[p.UserID],
			CreatedAt:    p.CreatedAt,
		}
	}

	return result, total, nil
}

// GetMyPosts returns current user's community posts with review status.
func (s *CommunityService) GetMyPosts(userID uint, req *request.CommunityMyPostListRequest) ([]response.CommunityPostListItem, int64, error) {
	db := global.GVA_DB.Model(&entity.CommunityPost{}).Where("user_id = ?", userID)
	if req.ReviewStatus >= 0 {
		db = db.Where("review_status = ?", req.ReviewStatus)
	}

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	var total int64
	db.Count(&total)

	var posts []entity.CommunityPost
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&posts).Error; err != nil {
		return nil, 0, err
	}

	userMap := s.getUserMap([]uint{userID})
	result := make([]response.CommunityPostListItem, len(posts))
	for i, p := range posts {
		if s.ensurePostCategory(&p) {
			posts[i].Category = p.Category
		}
		if fixedURL, fixed := s.ensurePostThumbnail(&p); fixed {
			p.ThumbnailURL = fixedURL
			posts[i].ThumbnailURL = fixedURL
		}
		if previewURL, fixed := s.ensurePostPreview(&p); fixed {
			p.PreviewURL = previewURL
			posts[i].PreviewURL = previewURL
		}
		result[i] = response.CommunityPostListItem{
			ID:           p.ID,
			Title:        p.Title,
			Category:     p.Category,
			Tags:         p.Tags,
			ThumbnailURL: p.ThumbnailURL,
			PreviewURL:   p.PreviewURL,
			GridWidth:    p.GridWidth,
			GridHeight:   p.GridHeight,
			ColorCount:   p.ColorCount,
			Difficulty:   p.Difficulty,
			PaletteBrand: p.PaletteBrand,
			PaletteVer:   p.PaletteVer,
			PaletteName:  p.PaletteName,
			LikeCount:    p.LikeCount,
			ViewCount:    p.ViewCount,
			MakeCount:    p.MakeCount,
			ReviewStatus: p.ReviewStatus,
			ReviewReason: p.ReviewReason,
			User:         userMap[p.UserID],
			CreatedAt:    p.CreatedAt,
		}
	}
	return result, total, nil
}

// GetPostByID 闂傚倸鍊风粈渚€宕ョ€ｎ喖纾块柟鎯版鎼村﹪鏌ら懝鎵牚濞存粌缍婇弻娑㈠Ψ閿濆懎顬夋繝娈垮灠閻°劎鎹㈠┑鍥╃瘈闁稿本纰嶅▓鏌ユ⒑鐠団€崇仩闁稿﹤娼￠獮鍐亹閹烘垹鍊為梺缁樺灱婵倝顢撳澶嬧拺缂佸娼￠妤冪磼缂佹﹫鑰跨€殿噮鍋勯鍏煎緞婵犲洤鏁规繝鐢靛█濞佳兠洪妶澶婄?bead_data闂傚倸鍊烽悞锔锯偓绗涘懐鐭欓柟娆″眰鍔戦崺鈧い鎺戝€荤壕濂稿级閸稑濡跨紒鐘靛仧閳ь剝顫夊ú蹇涘磿閾忣偆顩烽柨鏇炲€归崐閿嬨亜閹烘埈妲圭悮?view_count + 1
func (s *CommunityService) GetPostByID(id uint) (*response.CommunityPostDetail, error) {
	var post entity.CommunityPost
	if err := global.GVA_DB.First(&post, id).Error; err != nil {
		return nil, err
	}

	// 闂傚倸鍊风粈渚€骞夐敓鐘冲仭妞ゆ牗绋撻々鏌ユ煥濠靛棙澶勭€规洘鐓￠弻鐔告綇閸撗呮殸闂?status=1 闂傚倸鍊烽悞锕傛儑瑜版帒绀夌€光偓閳ь剟鍩€椤掍礁鍤ù婊呭仧濡叉劙鎮欓崫鍕潉闂佸壊鍋呯换鈧紒?
	if post.Status != 1 || post.ReviewStatus != 1 {
		return nil, nil
	}

	s.ensurePostCategory(&post)
	s.ensurePostBeadHex(&post)

	if fixedURL, fixed := s.ensurePostThumbnail(&post); fixed {
		post.ThumbnailURL = fixedURL
	}
	if previewURL, fixed := s.ensurePostPreview(&post); fixed {
		post.PreviewURL = previewURL
	}

	// view_count + 1
	go func() {
		global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", id).
			UpdateColumn("view_count", global.GVA_DB.Raw("view_count + 1"))
	}()

	// 闂傚倸鍊风粈渚€宕ョ€ｎ喖纾块柟鎯版鎼村﹪鏌ら懝鎵牚濞存粌缍婇弻娑㈠Ψ閿濆懎顬夋繝娈垮灠閻°劎鎹㈠┑鍥╃瘈闁稿本渚楀Λ蹇涙⒑缁嬫鍎愰柟鐟版搐閻ｇ兘濡搁埡濠冩櫈闁荤姵浜介崝搴ㄦ偩妤ｅ啯鈷?
	userMap := s.getUserMap([]uint{post.UserID})

	// 闂傚倷娴囧畷鐢稿窗閹扮増鍋￠弶鍫氭櫅缁躲倕螖閿濆懎鏆為柛?image_urls闂傚倸鍊烽悞锔锯偓绗涘懐鐭欓柟鐑橆殕閸嬨倝鏌ｉ鍛亞ity.JSON 闂?map[string]interface{}闂傚倸鍊烽悞锔锯偓绗涘懐鐭欓柟杈鹃檮閸庢鏌涚仦鎯ф惛闁逞屽墯鐢€崇暦濠婂嫭濯撮柣鐔哄濮ｅ洤鈹戦悙鑸靛涧缂佹彃娼￠垾锕傚醇閵忊剝娈?marshal 闂?unmarshal 濠?[]string
	var imageURLs []string
	if post.ImageURLs != nil {
		if raw, err := json.Marshal(post.ImageURLs); err == nil {
			_ = json.Unmarshal(raw, &imageURLs)
		}
	}

	// bead_data 闂傚倸鍊烽懗鍫曞磿閻㈢鐤炬繛鎴欏灪閸嬨倝鏌曟繛褍瀚▓浼存煟鎼淬垻鈯曢拑鍗炩攽椤栨稒灏﹂柟顔肩秺楠炰線骞掗幋婵愮€撮梻浣告惈濡鎹㈠鈧濠氬Ω閵夈垺顫嶅┑鈽嗗灠閸氬鈻撶徊顧篿ty.JSON 闂傚倸鍊风粈渚€骞栭锔藉亱婵犲﹤鐗嗙粈鍫熺節闂堟侗鍎愭い銉ワ躬閺屽秹宕崟顐ｆ闂佺粯甯掗敃顏勵嚕閸洖閱囨繛鎴灻‖澶岀磼?map[string]interface{}
	beadData := map[string]interface{}(post.BeadData)

	return &response.CommunityPostDetail{
		ID:           post.ID,
		Title:        post.Title,
		Category:     post.Category,
		Tags:         post.Tags,
		Description:  post.Description,
		ThumbnailURL: post.ThumbnailURL,
		PreviewURL:   post.PreviewURL,
		ImageURLs:    imageURLs,
		BeadData:     beadData,
		GridWidth:    post.GridWidth,
		GridHeight:   post.GridHeight,
		BeadCount:    post.BeadCount,
		ColorCount:   post.ColorCount,
		Difficulty:   post.Difficulty,
		PaletteBrand: post.PaletteBrand,
		PaletteVer:   post.PaletteVer,
		PaletteName:  post.PaletteName,
		LikeCount:    post.LikeCount,
		ViewCount:    post.ViewCount + 1, // 闂傚倷绀侀幖顐λ囬锕€鐤炬繝濠傜墕閽冪喖鏌曟繛鍨壄?+1 闂傚倸鍊风粈渚€骞夐敓鐘冲殞闁诡垼鐏愰悷鎵殝闁逛絻娅曢悘渚€姊虹涵鍛涧缂佺姵鍨规竟?
		MakeCount:    post.MakeCount,
		User:         userMap[post.UserID],
		CreatedAt:    post.CreatedAt,
	}, nil
}

// CreatePost 闂傚倸鍊风粈渚€骞夐敓鐘冲仭闁挎洖鍊搁崹鍌炴煟閵忋垺鏆╅柛妤佽壘椤啰鈧綆浜濋幑锝夋煟椤撶偞顥㈤柡宀€鍠栭、娑㈠幢濡も偓閺嗭絾绻涢崼顐㈠缂佺粯绋掑蹇涘礈瑜忚摫缂傚倷绶￠崰鏍儗閸岀偟宓?
func (s *CommunityService) CreatePost(req *request.CreateCommunityPostRequest, userID uint) (*entity.CommunityPost, error) {
	if looksLikeGarbledTitle(req.Title) {
		return nil, fmt.Errorf("title encoding invalid, please re-enter title")
	}
	if err := validateCreatePostPayload(req); err != nil {
		return nil, err
	}
	if err := checkDailyPostLimit(userID); err != nil {
		return nil, err
	}
	if blockedWord := containsBlockedWords(req.Title + " " + req.Description + " " + req.Tags); blockedWord != "" {
		return nil, fmt.Errorf("contains blocked content: %s", blockedWord)
	}

	// 闂傚倸鍊风粈渚€骞栭锔绘晞闁告侗鍨崑鎾愁潩閻撳骸顫紓?beadData 濠?entity.JSON
	beadData := entity.JSON(req.BeadData)

	// 闂傚倸鍊搁崐鎼佸磹閹间礁绠犻煫鍥ㄧ☉绾捐法鈧娲栧ú鐘诲磻閹捐埖鍏滈柛娑卞枤瑜把冾渻閵堝簼绨撮柛瀣尭閳规垿鍩ラ崱妤冧画濡炪倖鍨堕悷鈺佺暦閵夆晛鐐婃い鎺嶈兌閸?
	difficulty := req.Difficulty
	if difficulty == "" {
		difficulty = "medium"
	}

	paletteBrand := strings.TrimSpace(req.PaletteBrand)
	paletteVer := strings.TrimSpace(req.PaletteVersion)
	paletteName := strings.TrimSpace(req.PaletteName)
	if paletteBrand == "" || paletteVer == "" || paletteName == "" {
		inferredBrand, inferredVer, inferredName := inferPaletteMetaFromBeadData(req.BeadData)
		if paletteBrand == "" {
			paletteBrand = inferredBrand
		}
		if paletteVer == "" {
			paletteVer = inferredVer
		}
		if paletteName == "" {
			paletteName = inferredName
		}
	}

	post := entity.CommunityPost{
		UserID:       userID,
		ProjectID:    req.ProjectID,
		Title:        req.Title,
		Description:  req.Description,
		Category:     resolveCommunityCategory(req.Category, req.Title, req.Tags),
		Tags:         req.Tags,
		BeadData:     beadData,
		GridWidth:    req.GridWidth,
		GridHeight:   req.GridHeight,
		BeadCount:    req.BeadCount,
		ColorCount:   req.ColorCount,
		Difficulty:   difficulty,
		PaletteBrand: paletteBrand,
		PaletteVer:   paletteVer,
		PaletteName:  paletteName,
		Status:       1,
		ReviewStatus: 1,
	}
	if !communityAutoApproveEnabled() {
		post.Status = 0
		post.ReviewStatus = 0
	}

	// 闂傚倸鍊烽懗鍫曗€﹂崼銏″床闁规壆澧楅崑瀣煕閳╁啰鈽夐柛銊ュ€块弻娑樜旈崘銊ュ闂佹悶鍊曢悧鍡氱亙闂佹寧姊婚悺鏃堝磿閵夆晜鐓曢柣鎰絻椤ｆ娊鏌熼崣澶嬪€愰柟顔ㄥ洤閱囬柣鏃囥€€閺佸秶绱撻崒娆愮グ濡炴潙鎽滈幑銏ゅ醇閵夈儳鐤囬梺闈涚箳婵兘寮崇€ｎ喗鐓欐繛鍫濈仢閺嬨倗绱?ID
	if err := global.GVA_DB.Create(&post).Error; err != nil {
		return nil, err
	}

	// 濠电姷鏁告慨浼村垂閻撳簶鏋栨繛鎴炲焹閸嬫挸顫濋悡搴㈢彎濡ょ姷鍋涢崯顖滄崲濠靛绀嬫い鎾跺缁辨娊姊绘担绋挎毐闁圭⒈鍋婂畷顖烆敍濮橈絾鐏侀梺鎸庣箓椤︿即鎮?base64
	if req.ThumbnailBase64 != "" {
		thumbnailURL, err := s.saveThumbnail(post.ID, req.ThumbnailBase64)
		if err != nil {
			global.GVA_LOG.Error("save thumbnail failed: " + err.Error())
		} else {
			post.ThumbnailURL = thumbnailURL
			global.GVA_DB.Model(&post).UpdateColumn("thumbnail_url", thumbnailURL)
		}
	}
	if len(post.BeadData) > 0 {
		if previewData, err := buildDetailPreviewFromBeadData(map[string]interface{}(post.BeadData)); err == nil {
			if previewURL, saveErr := s.savePreviewBytes(post.ID, previewData); saveErr == nil {
				post.PreviewURL = previewURL
				global.GVA_DB.Model(&post).UpdateColumn("preview_url", previewURL)
			}
		}
	}

	return &post, nil
}

func communityAutoApproveEnabled() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv("COMMUNITY_AUTO_APPROVE")))
	switch raw {
	case "", "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func containsBlockedWords(text string) string {
	raw := strings.TrimSpace(os.Getenv("COMMUNITY_BLOCKED_WORDS"))
	if raw == "" {
		return ""
	}
	lower := strings.ToLower(text)
	for _, token := range strings.Split(raw, ",") {
		w := strings.TrimSpace(strings.ToLower(token))
		if w == "" {
			continue
		}
		if strings.Contains(lower, w) {
			return w
		}
	}
	return ""
}

func normalizeCommunityCategory(raw string) string {
	category := strings.TrimSpace(strings.ToLower(raw))
	switch category {
	case "all", "":
		return "all"
	case "anime", "game", "animal", "scenery", "holiday", "character", "food", "other":
		return category
	default:
		return "other"
	}
}

func resolveCommunityCategory(rawCategory string, title string, tags string) string {
	if normalized := normalizeCommunityCategory(rawCategory); normalized != "all" {
		return normalized
	}

	text := strings.ToLower(strings.TrimSpace(title + " " + tags))
	if text == "" {
		return "other"
	}

	keywordMap := []struct {
		Category string
		Words    []string
	}{
		{Category: "animal", Words: []string{"cat", "dog", "animal", "panda", "bear", "rabbit"}},
		{Category: "food", Words: []string{"cake", "coffee", "burger", "food", "dessert", "drink"}},
		{Category: "holiday", Words: []string{"christmas", "halloween", "festival", "newyear", "holiday"}},
		{Category: "scenery", Words: []string{"mountain", "sea", "flower", "sunset", "sky", "landscape"}},
		{Category: "game", Words: []string{"game", "pixel", "minecraft", "pokemon", "zelda", "mario"}},
		{Category: "anime", Words: []string{"anime", "cartoon", "comic", "manga"}},
		{Category: "character", Words: []string{"character", "portrait", "girl", "boy", "hero"}},
	}

	for _, item := range keywordMap {
		for _, word := range item.Words {
			if strings.Contains(text, strings.ToLower(word)) {
				return item.Category
			}
		}
	}
	return "other"
}
func validateCreatePostPayload(req *request.CreateCommunityPostRequest) error {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return fmt.Errorf("title is required")
	}
	if len([]rune(title)) > 100 {
		return fmt.Errorf("title too long")
	}
	if len([]rune(strings.TrimSpace(req.Description))) > 500 {
		return fmt.Errorf("description too long")
	}
	if len([]rune(strings.TrimSpace(req.Tags))) > 200 {
		return fmt.Errorf("tags too long")
	}
	if req.GridWidth <= 0 || req.GridHeight <= 0 || req.GridWidth > 256 || req.GridHeight > 256 {
		return fmt.Errorf("invalid grid size")
	}
	if req.GridWidth*req.GridHeight > 65536 {
		return fmt.Errorf("grid too large")
	}
	if req.ThumbnailBase64 != "" && len(req.ThumbnailBase64) > 12*1024*1024 {
		return fmt.Errorf("thumbnail too large")
	}
	if rawBeads, ok := req.BeadData["beads"].([]interface{}); ok && len(rawBeads) > req.GridWidth*req.GridHeight {
		return fmt.Errorf("invalid bead_data length")
	}
	return nil
}

func communityDailyPostLimit() int64 {
	raw := strings.TrimSpace(os.Getenv("COMMUNITY_DAILY_POST_LIMIT"))
	if raw == "" {
		return 30
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 30
	}
	return int64(v)
}

func checkDailyPostLimit(userID uint) error {
	limit := communityDailyPostLimit()
	if limit <= 0 {
		return nil
	}
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	var count int64
	if err := global.GVA_DB.Model(&entity.CommunityPost{}).
		Where("user_id = ? AND created_at >= ?", userID, startOfDay).
		Count(&count).Error; err != nil {
		return err
	}
	if count >= limit {
		return fmt.Errorf("daily publish limit reached")
	}
	return nil
}

func communityDailyReportLimit() int64 {
	raw := strings.TrimSpace(os.Getenv("COMMUNITY_DAILY_REPORT_LIMIT"))
	if raw == "" {
		return 50
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 50
	}
	return int64(v)
}

func checkDailyReportLimit(userID uint) error {
	limit := communityDailyReportLimit()
	if limit <= 0 {
		return nil
	}
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	var count int64
	if err := global.GVA_DB.Model(&entity.CommunityReport{}).
		Where("reporter_id = ? AND created_at >= ?", userID, startOfDay).
		Count(&count).Error; err != nil {
		return err
	}
	if count >= limit {
		return fmt.Errorf("daily report limit reached")
	}
	return nil
}

func communityReportEscalateThreshold() int64 {
	raw := strings.TrimSpace(os.Getenv("COMMUNITY_REPORT_ESCALATE_THRESHOLD"))
	if raw == "" {
		return 3
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 3
	}
	return int64(v)
}

func communityReportEscalateWindowHours() int64 {
	raw := strings.TrimSpace(os.Getenv("COMMUNITY_REPORT_ESCALATE_WINDOW_HOURS"))
	if raw == "" {
		return 24
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return 24
	}
	return int64(v)
}

func detectReportPriority(postID uint) (int, string, int64, error) {
	threshold := communityReportEscalateThreshold()
	if threshold <= 1 {
		return 1, "auto_escalate_config", 1, nil
	}
	hours := communityReportEscalateWindowHours()
	if hours <= 0 {
		hours = 24
	}
	start := time.Now().Add(-time.Duration(hours) * time.Hour)
	var recentCount int64
	if err := global.GVA_DB.Model(&entity.CommunityReport{}).
		Where("post_id = ? AND created_at >= ?", postID, start).
		Count(&recentCount).Error; err != nil {
		return 0, "", 0, err
	}
	afterSubmit := recentCount + 1
	if afterSubmit >= threshold {
		return 1, fmt.Sprintf("auto_escalate_%d_in_%dh", afterSubmit, hours), afterSubmit, nil
	}
	return 0, "", afterSubmit, nil
}

func communityReportSLAHours() int64 {
	raw := strings.TrimSpace(os.Getenv("COMMUNITY_REPORT_SLA_HOURS"))
	if raw == "" {
		return 24
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return 24
	}
	return int64(v)
}

// saveThumbnail 濠电姷鏁搁崕鎴犲緤閽樺娲晜閻愵剙搴婇梺绋跨灱閸嬬偤宕戦妶澶嬬厪濠电倯鍐╁櫧闁挎稒绻堝娲礃閸欏鍎撻梺鍝ュ櫏閸ㄤ即鍩㈤幘缁樻櫜濠㈣泛顑囬崢?base64 濠?PNG 闂傚倸鍊风粈渚€骞栭锕€纾圭紒瀣紩濞差亝鏅查柛娑变簼閻?
func (s *CommunityService) saveThumbnail(postID uint, base64Str string) (string, error) {
	// 闂傚倸鍊风粈渚€骞夐敓鐘偓锕傚炊閳轰礁鐏婂銈嗙墬缁秹寮冲鍫熺厓?data:image/png;base64, 闂傚倸鍊风粈渚€骞夐敓鐘茬闁告縿鍎抽惌鎾绘煕閹捐尙鍔嶆い?
	if idx := strings.Index(base64Str, ","); idx != -1 {
		base64Str = base64Str[idx+1:]
	}

	// 闂傚倷娴囧畷鐢稿窗閹扮増鍋￠弶鍫氭櫅缁躲倝鏌涜椤ㄥ棝宕?
	data, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil {
		return "", fmt.Errorf("base64 decode failed: %w", err)
	}

	// 缂傚倸鍊烽懗鍫曟惞鎼淬劌鐭楅幖娣妼缁愭鏌￠崶鈺佇ｇ€规洖寮堕幈銊ノ熼崹顔惧帿闂佺楠哥€涒晠濡甸崟顖氱睄闁搞儜鍌涚潖缂傚倷绀侀ˇ顖氼焽閿熺姴绠栨俊銈傚亾闁宠棄顦埢宥夘敇瑜岀花濠氭煥?
	dir, err := resolveThumbnailDir()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("mkdir failed: %w", err)
	}

	filename := fmt.Sprintf("post_%d.png", postID)
	filePath := filepath.Join(dir, filename)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("write file failed: %w", err)
	}

	return "/thumbnails/" + filename, nil
}

func (s *CommunityService) saveThumbnailBytes(postID uint, data []byte) (string, error) {
	dir, err := resolveThumbnailDir()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("mkdir failed: %w", err)
	}

	filename := fmt.Sprintf("post_%d.png", postID)
	filePath := filepath.Join(dir, filename)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("write file failed: %w", err)
	}

	return "/thumbnails/" + filename, nil
}

func (s *CommunityService) savePreviewBytes(postID uint, data []byte) (string, error) {
	dir, err := resolveThumbnailDir()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("mkdir failed: %w", err)
	}

	filename := fmt.Sprintf("post_%d_detail.png", postID)
	filePath := filepath.Join(dir, filename)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("write file failed: %w", err)
	}

	return "/thumbnails/" + filename, nil
}

// resolveThumbnailDir 闂傚倷娴囧畷鐢稿窗閹扮増鍋￠弶鍫氭櫅缁躲倕螖閿濆懎鏆為柛濠勬暬閺岋綁鏁愰崨顖滀紘缂佹儳褰炵划娆撳蓟瀹ュ浼犻柛鏇ㄥ亝濞堟彃鈹戦悙鑼⒊缂傚秳绶氬璇测槈閵忕姈銊╂煏婢跺牆鍔楅柟绋垮暙閳规垿鎮欓幓鎺旈獓婵犳鍨划娆愪繆?// 濠电姷鏁搁崑鐐差焽濞嗘挸瑙﹂悗锝庡枟閺咁亪姊绘担鍛婂暈閽冭京绱掔€ｎ偅宕岄柟顖楀亾濡炪倕绻愬ù鍌氼瀶椤忓棛纾?// 1. 闂傚倸鍊烽懗鍓佸垝椤栨粌鍨濋柣妯款嚙閸ㄥ倸霉閸忚偐鏆橀柍褜鍓欓崐鎸庝繆閹间礁鐓涘ù锝堟閸橆剚绻濆▓鍨灍闁靛洦鐩畷鎴﹀箻缂佹鍘?THUMBNAIL_DIR
// 2. 濠电姷顣槐鏇㈠磻閹达箑纾归柡鍥╁剳閼板潡鏌涘Δ鍐х闯闁绘垶锚椤曢亶鏌℃径瀣仼妞?perler-beads/public/thumbnails闂傚倸鍊烽悞锔锯偓绗涘懐鐭欓柟杈鹃檮閸嬪鈹戦悩鎻掍喊闁兼澘鐏濋湁闁稿繐鍚嬬紞鎴︽煙閻熸壆鍩ｉ柡灞稿墲瀵板嫭鎯旈姀顫偓濠勭磼閻愵剙鍔ゆい顓犲厴瀵鈽夊Ο閿嬬€婚梺褰掑亰閸撴盯宕㈤幇顔剧＝?// 3. 闂傚倸鍊烽悞锕傛儑瑜版帒鍨傚┑鐘宠壘缁愭鈧箍鍎卞Λ顓炩枔娴犲鐓曢柕澶堝灪濞呭棛鈧娲栭ˇ浼村Φ閸曨垰鍐€闁靛濡囧▓銈囩磽?/www/wwwroot/perler-beads/thumbnails
func resolveThumbnailDir() (string, error) {
	if envDir := strings.TrimSpace(os.Getenv("THUMBNAIL_DIR")); envDir != "" {
		return envDir, nil
	}

	if wd, err := os.Getwd(); err == nil {
		if dir, ok := findFrontendThumbnailDirFrom(wd); ok {
			return dir, nil
		}
	}

	if exePath, err := os.Executable(); err == nil {
		if dir, ok := findFrontendThumbnailDirFrom(filepath.Dir(exePath)); ok {
			return dir, nil
		}
	}

	return "/www/wwwroot/perler-beads/thumbnails", nil
}

func findFrontendThumbnailDirFrom(base string) (string, bool) {
	base = filepath.Clean(base)
	current := base

	for i := 0; i < 10; i++ {
		candidate := filepath.Join(current, "perler-beads", "public")
		if st, err := os.Stat(candidate); err == nil && st.IsDir() {
			return filepath.Join(candidate, "thumbnails"), true
		}

		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}

	return "", false
}

func (s *CommunityService) ensurePostThumbnail(post *entity.CommunityPost) (string, bool) {
	if post == nil || post.ID == 0 {
		return "", false
	}

	if post.ThumbnailURL != "" {
		if thumbnailFileExists(post.ThumbnailURL) {
			return post.ThumbnailURL, false
		}
		if migratedURL, migrated := migrateLegacyThumbnail(post.ThumbnailURL); migrated {
			global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", post.ID).UpdateColumn("thumbnail_url", migratedURL)
			return migratedURL, true
		}
	}

	needBuild := post.ThumbnailURL == ""
	if !needBuild {
		// url 闂備浇顕ф绋匡耿闁秮鈧箓宕煎┑鎰闁荤姾娅ｇ亸銊╂嚀閸喓鈧帒顫濋敐鍛闁诲氦顫夊ú姗€宕濆▎蹇ｆ綎闁煎鍊愰崑鎾绘濞戞瑦鍠愰柦鍐憾濮婄粯鎷呴崨濠冨創闂佺粯顨嗙划鎾崇暦濠婂啠鏋庨煫鍥ュ劥閳ь剙娼￠幃妤€鈽夊▎妯煎姺闂佸磭绮濠氬焵椤掆偓缁犲秹宕曢柆宥呯疇闁圭増婢樼粻娲煟濡偐甯涢柣鎾存礋閺屻劑寮幐搴㈠創婵犲痉銈嗩仩缂佽鲸甯掕灃濞达絽鎼埛宀勬倵濞堝灝娅橀柛鐘崇洴钘濋悗娑欘焽缁犻箖鏌涘▎蹇ｆЦ妞ゅ孩绮撻弻鏇㈠炊閵娿儱顫掗悗娈垮枟濞兼瑩锝炲┑鍥ㄧ秶闁冲搫鍋嗗婵嬫⒒閸屾瑧顦︾紓宥咃工椤洩顦堕柕鍥ㄥ姍閹瑩鎮介悽鐢垫殽濠电姰鍨奸崺鏍礉閺囩姷鐭嗛柛鈩冪⊕閸嬨劍銇勯弽鐢靛埌闁哄鍊楃槐鎺楀焵椤掍礁绶為柟閭﹀幘閸橀亶姊洪崷顓炲妺闁规悂绠栭獮濠囧礃椤旂晫鍘介梺闈涱焾閸庨亶鍩涢弮鍫熺厵濡炲楠搁埢鍫⑩偓娈垮枟閹告娊骞冮姀鈽嗘Ч閹肩补鎳囬弸?bead_data 闂傚倸鍊搁崐鐑芥倿閿曚降浜归柛鎰典簽閻捇鎮楅棃娑欐喐缁?		needBuild = true
	}
	if len(post.BeadData) == 0 {
		return "", false
	}

	pngData, err := buildThumbnailFromBeadData(map[string]interface{}(post.BeadData))
	if err != nil {
		global.GVA_LOG.Error("save thumbnail failed: " + err.Error())
		return "", false
	}

	thumbnailURL, err := s.saveThumbnailBytes(post.ID, pngData)
	if err != nil {
		global.GVA_LOG.Error("save thumbnail failed: " + err.Error())
		return "", false
	}

	global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", post.ID).UpdateColumn("thumbnail_url", thumbnailURL)
	return thumbnailURL, true
}

func (s *CommunityService) ensurePostPreview(post *entity.CommunityPost) (string, bool) {
	if post == nil || post.ID == 0 || len(post.BeadData) == 0 {
		return "", false
	}
	if post.PreviewURL != "" && thumbnailFileExists(post.PreviewURL) {
		return post.PreviewURL, false
	}
	pngData, err := buildDetailPreviewFromBeadData(map[string]interface{}(post.BeadData))
	if err != nil {
		global.GVA_LOG.Error("save thumbnail failed: " + err.Error())
		return "", false
	}
	previewURL, err := s.savePreviewBytes(post.ID, pngData)
	if err != nil {
		global.GVA_LOG.Error("save thumbnail failed: " + err.Error())
		return "", false
	}
	global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", post.ID).UpdateColumn("preview_url", previewURL)
	return previewURL, true
}

// ensurePostBeadHex 濠电姷鏁搁崑鐐哄垂閸洖绠伴柟闂寸缁犺銇勯幇鈺佺労闁哥喎鎳庨埞鎴︽偐鐎圭姴顥濋梺娲诲幗椤ㄥ﹪寮诲☉妯锋瀻闊浄绲炬晥婵犵數鍋涢悧鍡涙偉婵傜钃熼柣鏃傚劋鐎氭岸鏌嶉妷銊︾彧闁诲繑娲熼弻锕€螣閻撳孩鐎诲?bead.hex闂傚倸鍊烽悞锔锯偓绗涘懐鐭欓柟杈鹃檮閸嬪鏌涘☉鍗炵仩闁搞劍绻堥弻锝呂熷▎鎯ф缂備讲鍋撻柛宀€鍋為崐鐢告煕閿旇骞栫亸蹇曠磽?project 闂?bead_data 闂傚倸鍊烽悞锕傚箖閸洖纾块柟鎯版绾剧粯绻涢幋娆忕仾闁哄懏鐓￠弻锝夊箛椤旂厧濡洪梺?
func (s *CommunityService) ensurePostBeadHex(post *entity.CommunityPost) bool {
	if post == nil || post.ID == 0 || len(post.BeadData) == 0 {
		return false
	}

	beadData := map[string]interface{}(post.BeadData)
	rawBeads, ok := beadData["beads"].([]interface{})
	if !ok || len(rawBeads) == 0 {
		return false
	}

	needPatch := false
	for _, item := range rawBeads {
		bead, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if hex, _ := bead["hex"].(string); !isHexColor(hex) {
			needPatch = true
			break
		}
	}
	if !needPatch {
		return false
	}

	if post.ProjectID == nil || *post.ProjectID == 0 {
		return false
	}

	var project entity.Project
	if err := global.GVA_DB.Select("id, bead_data").First(&project, *post.ProjectID).Error; err != nil {
		return false
	}
	if len(project.BeadData) == 0 {
		return false
	}

	projectData := map[string]interface{}(project.BeadData)
	updated := false
	for _, item := range rawBeads {
		bead, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if hex, _ := bead["hex"].(string); isHexColor(hex) {
			continue
		}

		x := toInt(bead["x"])
		y := toInt(bead["y"])
		if x < 0 || y < 0 {
			continue
		}

		if hex := lookupProjectHex(projectData, x, y); isHexColor(hex) {
			bead["hex"] = strings.ToUpper(hex)
			updated = true
		}
	}

	if !updated {
		return false
	}

	beadData["beads"] = rawBeads
	post.BeadData = entity.JSON(beadData)
	global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", post.ID).UpdateColumn("bead_data", post.BeadData)
	return true
}

func (s *CommunityService) ensurePostCategory(post *entity.CommunityPost) bool {
	if strings.TrimSpace(post.Category) != "" {
		return false
	}
	post.Category = resolveCommunityCategory("", post.Title, post.Tags)
	global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", post.ID).UpdateColumn("category", post.Category)
	return true
}

func lookupProjectHex(projectData map[string]interface{}, x, y int) string {
	rawBeads, ok := projectData["beads"].([]interface{})
	if !ok || len(rawBeads) == 0 {
		return ""
	}

	width := toInt(projectData["width"])
	height := toInt(projectData["height"])
	if width > 0 && height > 0 && len(rawBeads) >= width*height {
		idx := y*width + x
		if idx >= 0 && idx < len(rawBeads) {
			if bead, ok := rawBeads[idx].(map[string]interface{}); ok {
				if hex, _ := bead["hex"].(string); isHexColor(hex) {
					return hex
				}
			}
		}
	}

	for _, item := range rawBeads {
		bead, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if toInt(bead["x"]) == x && toInt(bead["y"]) == y {
			if hex, _ := bead["hex"].(string); isHexColor(hex) {
				return hex
			}
		}
	}

	return ""
}

func thumbnailFileExists(thumbnailURL string) bool {
	if strings.TrimSpace(thumbnailURL) == "" {
		return false
	}

	dir, err := resolveThumbnailDir()
	if err != nil {
		return false
	}
	filename := filepath.Base(thumbnailURL)
	if filename == "." || filename == "/" || filename == "" {
		return false
	}
	_, statErr := os.Stat(filepath.Join(dir, filename))
	return statErr == nil
}

func migrateLegacyThumbnail(thumbnailURL string) (string, bool) {
	filename := filepath.Base(thumbnailURL)
	if filename == "." || filename == "/" || filename == "" {
		return "", false
	}

	targetDir, err := resolveThumbnailDir()
	if err != nil {
		return "", false
	}
	targetPath := filepath.Join(targetDir, filename)

	for _, src := range legacyThumbnailCandidates(filename) {
		data, readErr := os.ReadFile(src)
		if readErr != nil || len(data) == 0 {
			continue
		}
		if mkErr := os.MkdirAll(targetDir, 0755); mkErr != nil {
			continue
		}
		if writeErr := os.WriteFile(targetPath, data, 0644); writeErr != nil {
			continue
		}
		return "/thumbnails/" + filename, true
	}

	return "", false
}

func legacyThumbnailCandidates(filename string) []string {
	return []string{
		filepath.Join("D:\\www\\wwwroot\\perler-beads\\thumbnails", filename),
		filepath.Join("C:\\www\\wwwroot\\perler-beads\\thumbnails", filename),
		filepath.Join("/www/wwwroot/perler-beads/thumbnails", filename),
	}
}

func buildThumbnailFromBeadData(beadData map[string]interface{}) ([]byte, error) {
	width := toInt(beadData["width"])
	height := toInt(beadData["height"])
	if width <= 0 || height <= 0 {
		return nil, fmt.Errorf("invalid bead_data size")
	}

	rawBeads, ok := beadData["beads"].([]interface{})
	if !ok || len(rawBeads) == 0 {
		return nil, fmt.Errorf("invalid bead_data beads")
	}

	const maxSide = 512
	cellSize := maxSide / width
	if height > width {
		cellSize = maxSide / height
	}
	if cellSize < 2 {
		cellSize = 2
	}
	if cellSize > 12 {
		cellSize = 12
	}

	imgW := width * cellSize
	imgH := height * cellSize
	canvas := image.NewRGBA(image.Rect(0, 0, imgW, imgH))

	bg := color.RGBA{R: 26, G: 26, B: 46, A: 255}
	for y := 0; y < imgH; y++ {
		for x := 0; x < imgW; x++ {
			canvas.Set(x, y, bg)
		}
	}

	for _, item := range rawBeads {
		bead, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		x := toInt(bead["x"])
		y := toInt(bead["y"])
		if x < 0 || x >= width || y < 0 || y >= height {
			continue
		}

		colorID, _ := bead["colorId"].(string)
		c := colorFromID(colorID)
		if hexStr, ok := bead["hex"].(string); ok {
			if parsed, valid := parseHexColor(hexStr); valid {
				c = parsed
			}
		}
		startX := x * cellSize
		startY := y * cellSize
		for py := startY; py < startY+cellSize; py++ {
			for px := startX; px < startX+cellSize; px++ {
				canvas.Set(px, py, c)
			}
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, canvas); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func buildDetailPreviewFromBeadData(beadData map[string]interface{}) ([]byte, error) {
	width := toInt(beadData["width"])
	height := toInt(beadData["height"])
	if width <= 0 || height <= 0 {
		return nil, fmt.Errorf("invalid bead_data size")
	}

	rawBeads, ok := beadData["beads"].([]interface{})
	if !ok || len(rawBeads) == 0 {
		return nil, fmt.Errorf("invalid bead_data beads")
	}

	const maxSide = 1024
	cellSize := maxSide / width
	if height > width {
		cellSize = maxSide / height
	}
	if cellSize < 3 {
		cellSize = 3
	}
	if cellSize > 24 {
		cellSize = 24
	}

	imgW := width * cellSize
	imgH := height * cellSize
	canvas := image.NewRGBA(image.Rect(0, 0, imgW, imgH))

	bg := color.RGBA{R: 26, G: 26, B: 46, A: 255}
	for y := 0; y < imgH; y++ {
		for x := 0; x < imgW; x++ {
			canvas.Set(x, y, bg)
		}
	}

	for _, item := range rawBeads {
		bead, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		x := toInt(bead["x"])
		y := toInt(bead["y"])
		if x < 0 || x >= width || y < 0 || y >= height {
			continue
		}
		colorID, _ := bead["colorId"].(string)
		c := colorFromID(colorID)
		if hexStr, ok := bead["hex"].(string); ok {
			if parsed, valid := parseHexColor(hexStr); valid {
				c = parsed
			}
		}
		startX := x * cellSize
		startY := y * cellSize
		for py := startY; py < startY+cellSize; py++ {
			for px := startX; px < startX+cellSize; px++ {
				canvas.Set(px, py, c)
			}
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, canvas); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func colorFromID(id string) color.RGBA {
	if id == "" {
		return color.RGBA{R: 230, G: 230, B: 230, A: 255}
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(id))
	v := h.Sum32()

	r := uint8(60 + (v & 0x7F))
	g := uint8(60 + ((v >> 8) & 0x7F))
	b := uint8(60 + ((v >> 16) & 0x7F))
	return color.RGBA{R: r, G: g, B: b, A: 255}
}

func parseHexColor(hex string) (color.RGBA, bool) {
	if len(hex) != 7 || hex[0] != '#' {
		return color.RGBA{}, false
	}

	var r, g, b uint8
	_, err := fmt.Sscanf(hex, "#%02x%02x%02x", &r, &g, &b)
	if err != nil {
		return color.RGBA{}, false
	}
	return color.RGBA{R: r, G: g, B: b, A: 255}, true
}

func isHexColor(hex string) bool {
	if len(hex) != 7 || hex[0] != '#' {
		return false
	}
	for i := 1; i < 7; i++ {
		ch := hex[i]
		if !((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) {
			return false
		}
	}
	return true
}

func toInt(v interface{}) int {
	switch t := v.(type) {
	case int:
		return t
	case int32:
		return int(t)
	case int64:
		return int(t)
	case float64:
		return int(t)
	case float32:
		return int(t)
	case json.Number:
		i, _ := t.Int64()
		return int(i)
	default:
		return 0
	}
}

func inferPaletteMetaFromBeadData(beadData map[string]interface{}) (brand, version, name string) {
	const defaultVersion = "2026-03"
	rawBeads, ok := beadData["beads"].([]interface{})
	if !ok || len(rawBeads) == 0 {
		return "unknown", defaultVersion, "UNKNOWN " + defaultVersion
	}

	counts := map[string]int{
		"mard":    0,
		"perler":  0,
		"hama":    0,
		"artkal":  0,
		"unknown": 0,
	}

	for _, item := range rawBeads {
		bead, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		value, _ := bead["brand"].(string)
		b := strings.ToLower(strings.TrimSpace(value))
		switch b {
		case "mard", "perler", "hama", "artkal":
			counts[b]++
		default:
			counts["unknown"]++
		}
	}

	topBrand := "unknown"
	topCount := -1
	for _, key := range []string{"mard", "perler", "hama", "artkal", "unknown"} {
		if counts[key] > topCount {
			topCount = counts[key]
			topBrand = key
		}
	}

	nonZeroBrands := 0
	for _, key := range []string{"mard", "perler", "hama", "artkal"} {
		if counts[key] > 0 {
			nonZeroBrands++
		}
	}
	if nonZeroBrands > 1 {
		topBrand = "mixed"
	}

	display := strings.ToUpper(topBrand)
	return topBrand, defaultVersion, display + " " + defaultVersion
}

func looksLikeGarbledTitle(title string) bool {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return false
	}

	if !utf8.ValidString(trimmed) || strings.ContainsRune(trimmed, '\uFFFD') {
		return true
	}

	runes := []rune(trimmed)
	if len(runes) < 3 {
		return false
	}

	questionCount := 0
	letterLikeCount := 0
	for _, r := range runes {
		if r == '?' {
			questionCount++
			continue
		}
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			letterLikeCount++
		}
	}

	if questionCount >= 3 && letterLikeCount == 0 {
		return true
	}

	return questionCount*100/len(runes) >= 40
}

// ToggleLike 闂傚倸鍊风粈渚€骞夐敍鍕殰闁圭儤鍤氬ú顏呮櫇闁逞屽墴閹箖鎮滈挊澶庢憰闂侀潧顧€缁犳垿鍩€椤掑嫷妫戦柣銉邯椤㈡﹢鎮欓弶鎴烆仱婵＄偑鍊愰弲婵嬪极婵犳艾钃熼柨婵嗘啒閻旂厧鍨傛い鏃€鍎崇敮鍧楁⒒?
func (s *CommunityService) ToggleLike(userID, postID uint) (*response.LikeResponse, error) {
	var like entity.CommunityLike
	result := global.GVA_DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&like)

	if result.Error == nil {
		// 闂備浇顕у锕傦綖婢舵劖鍋ら柡鍥╁С閻掑﹥绻涢崱妯诲碍缁炬儳顭烽弻銊モ攽閸℃ê顦╅柣?闂?闂傚倸鍊风粈渚€骞夐敓鐘冲仭闁挎洖鍊归崑瀣繆閵堝懎鏆熼柣?		global.GVA_DB.Delete(&like)
		global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ? AND like_count > 0", postID).
			UpdateColumn("like_count", global.GVA_DB.Raw("like_count - 1"))

		// 闂傚倸鍊风粈渚€骞栭銈嗗仏妞ゆ劧绠戠壕鍧楁煙缂併垹娅橀柡浣割儐娣囧﹪濡堕崨顔兼闁诲孩鑹鹃ˇ鐢稿蓟瀹ュ牜妾ㄩ梺鍛婃尵閸犲酣顢氶敐澶樻晢闁告洦鍋嗛鐓庮渻閵堝棙顥堟俊顐㈡健瀹曠娀寮介鐔哄幗闂佺粯蓱閻熴儵骞婃惔銏㈩浄闁挎洖鍊归悡?
		var post entity.CommunityPost
		global.GVA_DB.Select("like_count").First(&post, postID)

		return &response.LikeResponse{Liked: false, LikeCount: post.LikeCount}, nil
	}

	// 闂傚倸鍊风粈渚€骞栭锔藉亱婵犲﹤瀚々鏌ユ煟閹邦剚鎯堢痪鎯ь煼閺屻劌鈹戦崱妯侯槱闁?闂?婵犵數濮烽弫鎼佸磿閹寸姷绀婇柍褜鍓氶妵鍕即閸℃顏柛?
	like = entity.CommunityLike{UserID: userID, PostID: postID}
	if err := global.GVA_DB.Create(&like).Error; err != nil {
		return nil, err
	}
	global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", postID).
		UpdateColumn("like_count", global.GVA_DB.Raw("like_count + 1"))

	// 闂傚倸鍊风粈渚€骞栭銈嗗仏妞ゆ劧绠戠壕鍧楁煙缂併垹娅橀柡浣割儐娣囧﹪濡堕崨顔兼闁诲孩鑹鹃ˇ鐢稿蓟瀹ュ牜妾ㄩ梺鍛婃尵閸犲酣顢氶敐澶樻晢闁告洦鍋嗛鐓庮渻閵堝棙顥堟俊顐㈡健瀹曠娀寮介鐔哄幗闂佺粯蓱閻熴儵骞婃惔銏㈩浄闁挎洖鍊归悡?
	var post entity.CommunityPost
	global.GVA_DB.Select("like_count").First(&post, postID)

	return &response.LikeResponse{Liked: true, LikeCount: post.LikeCount}, nil
}

// IsLiked 闂傚倸鍊风粈渚€骞栭銈嗗仏妞ゆ劧绠戠壕鍧楁煙缂併垹娅橀柡浣割儐娣囧﹪濡堕崨顔兼闂佺顑冮崝鎴﹀蓟閺囩喓绡€闊洦娲滈弳鐘绘⒑缂佹ɑ灏版繛鑼枛瀵鏁撻悩鑼槹闂傚倸鐗婄粙鎾寸閳哄懏鈷戦悹鍥ｂ偓宕囦户缂備讲鍋撳〒姘ｅ亾妞ゃ垺鐟ㄧ粻娑樷槈濞嗗繑顓绘俊鐐€栧濠氬磻閹捐秮褰掓偑閳ь剟宕归崼鏇炵畺?
func (s *CommunityService) IsLiked(userID, postID uint) bool {
	var count int64
	global.GVA_DB.Model(&entity.CommunityLike{}).
		Where("user_id = ? AND post_id = ?", userID, postID).
		Count(&count)
	return count > 0
}

// IncrementMakeCount 濠电姷鏁告慨顓㈠箯閸愵喖宸濇い鎾寸箘閹规洖鈹戦悩鎰佸晱闁哥姵宀稿畷鎴﹀Χ閸涱垱娈惧┑顔筋焾濞夋稓鈧艾顦甸弻锝夊閵忊剝姣勯梺宕囩帛濞叉牠鍩為幋锔藉€烽柛娆忣樈濡繘姊洪崨濠冨鞍缂佽鐗嗛?
func (s *CommunityService) IncrementMakeCount(id uint) error {
	return global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", id).
		UpdateColumn("make_count", global.GVA_DB.Raw("make_count + 1")).Error
}

// getUserMap 闂傚倸鍊风粈浣虹礊婵犲偆鐒界憸蹇曟閻愬绡€闁搞儜鍥紬婵犵數鍋涘Ο濠冪濠靛鍚归柡鍐ㄥ€甸崑鎾绘偡閺夋浠惧┑鐘灪椤洤顕ユ繝鍥ч敜婵°倓鑳堕崢钘夘渻閵堝骸浜介柛鎾寸懄娣囧﹥绂掔€ｎ偆鍘遍梺鍐叉惈閸婂鍩婇弴鐘电＜鐎光偓閸曨亝鍠氶梺绯曟櫅鐎氭澘鐣峰Ο娆炬Ь缂備讲鍋撻柍褜鍓熷缁樻媴閸涘﹥鍎撻柣搴㈠嚬閸犳骞堥妸鈺佺妞ゆ棁妫勯崜?
func (s *CommunityService) getUserMap(userIDs []uint) map[uint]response.CommunityPostAuthor {
	m := make(map[uint]response.CommunityPostAuthor)
	if len(userIDs) == 0 {
		return m
	}

	var users []entity.User
	global.GVA_DB.Select("id, nickname, avatar").Where("id IN ?", userIDs).Find(&users)

	for _, u := range users {
		m[u.ID] = response.CommunityPostAuthor{
			ID:       u.ID,
			Nickname: u.Nickname,
			Avatar:   u.Avatar,
		}
	}
	return m
}

// GetModerationPosts 鑾峰彇瀹℃牳甯栧瓙鍒楄〃
func (s *CommunityService) GetModerationPosts(req *request.CommunityModerationListRequest) ([]response.CommunityPostListItem, int64, error) {
	db := global.GVA_DB.Model(&entity.CommunityPost{})
	if req.ReviewStatus >= 0 {
		db = db.Where("review_status = ?", req.ReviewStatus)
	}

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	var total int64
	db.Count(&total)

	var posts []entity.CommunityPost
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&posts).Error; err != nil {
		return nil, 0, err
	}

	userIDs := make([]uint, 0, len(posts))
	for _, p := range posts {
		userIDs = append(userIDs, p.UserID)
	}
	userMap := s.getUserMap(userIDs)

	result := make([]response.CommunityPostListItem, len(posts))
	for i, p := range posts {
		if s.ensurePostCategory(&p) {
			posts[i].Category = p.Category
		}
		result[i] = response.CommunityPostListItem{
			ID:           p.ID,
			Title:        p.Title,
			Category:     p.Category,
			Tags:         p.Tags,
			ThumbnailURL: p.ThumbnailURL,
			PreviewURL:   p.PreviewURL,
			GridWidth:    p.GridWidth,
			GridHeight:   p.GridHeight,
			ColorCount:   p.ColorCount,
			Difficulty:   p.Difficulty,
			PaletteBrand: p.PaletteBrand,
			PaletteVer:   p.PaletteVer,
			PaletteName:  p.PaletteName,
			LikeCount:    p.LikeCount,
			ViewCount:    p.ViewCount,
			MakeCount:    p.MakeCount,
			ReviewStatus: p.ReviewStatus,
			ReviewReason: p.ReviewReason,
			User:         userMap[p.UserID],
			CreatedAt:    p.CreatedAt,
		}
	}

	return result, total, nil
}

// GetModerationLogs 闁兼儳鍢茶ぐ鍥┾偓鍏夊墲閻楁娊寮妷銉х
func (s *CommunityService) GetModerationLogs(req *request.CommunityModerationLogListRequest) ([]response.CommunityReviewLogItem, int64, error) {
	db := global.GVA_DB.Model(&entity.CommunityReviewLog{})
	if req.PostID > 0 {
		db = db.Where("post_id = ?", req.PostID)
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	var total int64
	db.Count(&total)

	var logs []entity.CommunityReviewLog
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	reviewerIDs := make([]uint, 0, len(logs))
	for _, item := range logs {
		reviewerIDs = append(reviewerIDs, item.ReviewerID)
	}
	userMap := s.getUserMap(reviewerIDs)

	result := make([]response.CommunityReviewLogItem, len(logs))
	for i, item := range logs {
		result[i] = response.CommunityReviewLogItem{
			ID:               item.ID,
			PostID:           item.PostID,
			PostTitle:        item.SnapshotTitle,
			ReviewerID:       item.ReviewerID,
			ReviewerNickname: userMap[item.ReviewerID].Nickname,
			Action:           item.Action,
			FromReviewStatus: item.FromReviewStatus,
			ToReviewStatus:   item.ToReviewStatus,
			Reason:           item.Reason,
			CreatedAt:        item.CreatedAt,
		}
	}

	return result, total, nil
}

// GetModerationStats 鑾峰彇瀹℃牳缁熻
func (s *CommunityService) GetModerationStats() (map[string]int64, error) {
	stats := map[string]int64{
		"total_posts":           0,
		"pending_count":         0,
		"approved_count":        0,
		"rejected_count":        0,
		"hidden_count":          0,
		"pending_reports":       0,
		"high_priority_reports": 0,
		"overdue_reports":       0,
		"today_new_posts":       0,
		"today_reviews":         0,
		"today_reports":         0,
		"today_backfilled":      0,
	}

	var count int64
	if err := global.GVA_DB.Model(&entity.CommunityPost{}).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["total_posts"] = count
	if err := global.GVA_DB.Model(&entity.CommunityPost{}).Where("review_status = ?", 0).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["pending_count"] = count
	if err := global.GVA_DB.Model(&entity.CommunityPost{}).Where("review_status = ?", 1).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["approved_count"] = count
	if err := global.GVA_DB.Model(&entity.CommunityPost{}).Where("review_status = ?", 2).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["rejected_count"] = count
	if err := global.GVA_DB.Model(&entity.CommunityPost{}).Where("review_status = ?", 3).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["hidden_count"] = count

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if err := global.GVA_DB.Model(&entity.CommunityPost{}).Where("created_at >= ?", startOfDay).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["today_new_posts"] = count
	if err := global.GVA_DB.Model(&entity.CommunityReviewLog{}).Where("created_at >= ?", startOfDay).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["today_reviews"] = count
	if err := global.GVA_DB.Model(&entity.CommunityReport{}).Where("status = ?", 0).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["pending_reports"] = count
	if err := global.GVA_DB.Model(&entity.CommunityReport{}).Where("status = ? AND priority >= 1", 0).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["high_priority_reports"] = count
	slaCutoff := now.Add(-time.Duration(communityReportSLAHours()) * time.Hour)
	if err := global.GVA_DB.Model(&entity.CommunityReport{}).Where("status = ? AND created_at <= ?", 0, slaCutoff).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["overdue_reports"] = count
	if err := global.GVA_DB.Model(&entity.CommunityReport{}).Where("created_at >= ?", startOfDay).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["today_reports"] = count
	if err := global.GVA_DB.Model(&entity.CommunityPost{}).Where("preview_url LIKE ? AND updated_at >= ?", "%_detail.png", startOfDay).Count(&count).Error; err != nil {
		return nil, err
	}
	stats["today_backfilled"] = count

	return stats, nil
}

// BackfillMissingPreviews batch-fills missing preview_url for community posts.
func (s *CommunityService) BackfillMissingPreviews(limit int) (int, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}

	var posts []entity.CommunityPost
	if err := global.GVA_DB.
		Where("(preview_url = '' OR preview_url IS NULL) AND bead_data IS NOT NULL").
		Order("id ASC").
		Limit(limit).
		Find(&posts).Error; err != nil {
		return 0, err
	}

	updated := 0
	for i := range posts {
		if _, ok := s.ensurePostPreview(&posts[i]); ok {
			updated++
		}
	}
	return updated, nil
}

// normalizeEvidenceURLs validates and trims report evidence URLs.
func normalizeEvidenceURLs(urls []string) []string {
	if len(urls) == 0 {
		return nil
	}
	out := make([]string, 0, len(urls))
	for _, raw := range urls {
		v := strings.TrimSpace(raw)
		if v == "" {
			continue
		}
		if !strings.HasPrefix(v, "http://") && !strings.HasPrefix(v, "https://") {
			continue
		}
		if len(v) > 1024 {
			continue
		}
		out = append(out, v)
		if len(out) >= 5 {
			break
		}
	}
	return out
}

func (s *CommunityService) CreateReport(postID uint, reporterID uint, reason string, detail string, evidenceURLs []string) error {
	reason = strings.TrimSpace(reason)
	detail = strings.TrimSpace(detail)
	normalizedEvidence := normalizeEvidenceURLs(evidenceURLs)
	if reason == "" {
		return fmt.Errorf("reason is required")
	}
	if len([]rune(reason)) > 80 {
		return fmt.Errorf("reason too long")
	}
	if len([]rune(detail)) > 500 {
		return fmt.Errorf("detail too long")
	}
	if len(normalizedEvidence) > 5 {
		return fmt.Errorf("too many evidence urls")
	}
	if err := checkDailyReportLimit(reporterID); err != nil {
		return err
	}

	var post entity.CommunityPost
	if err := global.GVA_DB.First(&post, postID).Error; err != nil {
		return err
	}
	if post.UserID == reporterID {
		return fmt.Errorf("cannot report your own post")
	}

	var existCount int64
	if err := global.GVA_DB.Model(&entity.CommunityReport{}).
		Where("post_id = ? AND reporter_id = ? AND status = ?", postID, reporterID, 0).
		Count(&existCount).Error; err != nil {
		return err
	}
	if existCount > 0 {
		return fmt.Errorf("already reported and pending")
	}

	priority, riskReason, _, err := detectReportPriority(postID)
	if err != nil {
		return err
	}
	evidenceJSON := ""
	if len(normalizedEvidence) > 0 {
		raw, marshalErr := json.Marshal(normalizedEvidence)
		if marshalErr != nil {
			return marshalErr
		}
		evidenceJSON = string(raw)
	}

	report := entity.CommunityReport{
		PostID:        postID,
		PostUserID:    post.UserID,
		ReporterID:    reporterID,
		Reason:        reason,
		Detail:        detail,
		EvidenceURLs:  evidenceJSON,
		Priority:      priority,
		RiskReason:    riskReason,
		Status:        0,
		SnapshotTitle: post.Title,
	}
	return global.GVA_DB.Create(&report).Error
}

// GetModerationReports returns report list for moderators.
func (s *CommunityService) GetModerationReports(req *request.CommunityModerationReportListRequest) ([]response.CommunityReportItem, int64, error) {
	db := global.GVA_DB.Model(&entity.CommunityReport{})
	slaHours := communityReportSLAHours()
	overdueCutoff := time.Now().Add(-time.Duration(slaHours) * time.Hour)
	if req.Status >= 0 {
		db = db.Where("status = ?", req.Status)
	}
	if req.HighOnly {
		db = db.Where("priority >= 1")
	}
	if req.OverdueOnly {
		db = db.Where("status = ? AND created_at <= ?", 0, overdueCutoff)
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	var total int64
	db.Count(&total)

	var rows []entity.CommunityReport
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("status ASC, priority DESC, created_at DESC").Offset(offset).Limit(req.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	userIDs := make([]uint, 0, len(rows)*2)
	for _, item := range rows {
		userIDs = append(userIDs, item.ReporterID)
		if item.HandledBy != nil {
			userIDs = append(userIDs, *item.HandledBy)
		}
	}
	userMap := s.getUserMap(userIDs)

	result := make([]response.CommunityReportItem, len(rows))
	for i, item := range rows {
		handledBy := uint(0)
		handledByName := ""
		handledAt := time.Time{}
		if item.HandledBy != nil {
			handledBy = *item.HandledBy
			handledByName = userMap[handledBy].Nickname
		}
		if item.HandledAt != nil {
			handledAt = *item.HandledAt
		}
		evidenceURLs := make([]string, 0)
		if strings.TrimSpace(item.EvidenceURLs) != "" {
			_ = json.Unmarshal([]byte(item.EvidenceURLs), &evidenceURLs)
		}
		result[i] = response.CommunityReportItem{
			ID:               item.ID,
			PostID:           item.PostID,
			PostTitle:        item.SnapshotTitle,
			PostUserID:       item.PostUserID,
			ReporterID:       item.ReporterID,
			ReporterNickname: userMap[item.ReporterID].Nickname,
			Reason:           item.Reason,
			Detail:           item.Detail,
			EvidenceURLs:     evidenceURLs,
			Priority:         item.Priority,
			RiskReason:       item.RiskReason,
			Overdue:          item.Status == 0 && item.CreatedAt.Before(overdueCutoff),
			AgeHours:         int64(time.Since(item.CreatedAt).Hours()),
			Status:           item.Status,
			HandleNote:       item.HandleNote,
			HandledBy:        handledBy,
			HandledByName:    handledByName,
			HandledAt:        handledAt,
			CreatedAt:        item.CreatedAt,
		}
	}
	return result, total, nil
}

// GetReportAlerts 閼惧嘲褰囧鍛槱閻炲棔濡囬幎銉﹀絹闁辨帡妲﹂崚妤嬬礄娴兼ê鍘涚搾鍛閸滃矂鐝导姗堢礆
func (s *CommunityService) GetReportAlerts(limit int) ([]response.CommunityReportItem, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	slaHours := communityReportSLAHours()
	overdueCutoff := time.Now().Add(-time.Duration(slaHours) * time.Hour)

	var rows []entity.CommunityReport
	orderClause := fmt.Sprintf(
		"CASE WHEN created_at <= '%s' THEN 1 ELSE 0 END DESC, priority DESC, created_at ASC",
		overdueCutoff.Format("2006-01-02 15:04:05"),
	)
	if err := global.GVA_DB.Model(&entity.CommunityReport{}).
		Where("status = ?", 0).
		Order(orderClause).
		Limit(limit).
		Find(&rows).Error; err != nil {
		return nil, err
	}

	userIDs := make([]uint, 0, len(rows))
	for _, item := range rows {
		userIDs = append(userIDs, item.ReporterID)
	}
	userMap := s.getUserMap(userIDs)

	result := make([]response.CommunityReportItem, len(rows))
	for i, item := range rows {
		evidenceURLs := make([]string, 0)
		if strings.TrimSpace(item.EvidenceURLs) != "" {
			_ = json.Unmarshal([]byte(item.EvidenceURLs), &evidenceURLs)
		}
		result[i] = response.CommunityReportItem{
			ID:               item.ID,
			PostID:           item.PostID,
			PostTitle:        item.SnapshotTitle,
			PostUserID:       item.PostUserID,
			ReporterID:       item.ReporterID,
			ReporterNickname: userMap[item.ReporterID].Nickname,
			Reason:           item.Reason,
			Detail:           item.Detail,
			EvidenceURLs:     evidenceURLs,
			Priority:         item.Priority,
			RiskReason:       item.RiskReason,
			Overdue:          item.CreatedAt.Before(overdueCutoff),
			AgeHours:         int64(time.Since(item.CreatedAt).Hours()),
			Status:           item.Status,
			HandleNote:       item.HandleNote,
			CreatedAt:        item.CreatedAt,
		}
	}

	return result, nil
}

// HandleReport handles a single moderation report action.
func (s *CommunityService) HandleReport(reportID uint, adminID uint, action string, note string) error {
	var report entity.CommunityReport
	if err := global.GVA_DB.First(&report, reportID).Error; err != nil {
		return err
	}
	if report.Status != 0 {
		return fmt.Errorf("report already handled")
	}

	return global.GVA_DB.Transaction(func(tx *gorm.DB) error {
		return s.applyReportActionTx(tx, &report, adminID, action, note)
	})
}

func (s *CommunityService) BatchHandleReports(reportIDs []uint, adminID uint, action string, note string) (int, error) {
	if len(reportIDs) == 0 {
		return 0, fmt.Errorf("report_ids is empty")
	}
	if len(reportIDs) > 100 {
		return 0, fmt.Errorf("too many report_ids")
	}

	handled := 0
	err := global.GVA_DB.Transaction(func(tx *gorm.DB) error {
		var reports []entity.CommunityReport
		if err := tx.Where("id IN ? AND status = 0", reportIDs).Find(&reports).Error; err != nil {
			return err
		}
		for i := range reports {
			if err := s.applyReportActionTx(tx, &reports[i], adminID, action, note); err != nil {
				return err
			}
			handled++
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return handled, nil
}

func (s *CommunityService) applyReportActionTx(tx *gorm.DB, report *entity.CommunityReport, adminID uint, action string, note string) error {
	note = normalizeReportHandleNote(note)
	now := time.Now()
	newStatus := 2
	if action == "accept" {
		newStatus = 1
	}

	if err := tx.Model(&entity.CommunityReport{}).Where("id = ?", report.ID).Updates(map[string]interface{}{
		"status":      newStatus,
		"handle_note": note,
		"handled_by":  adminID,
		"handled_at":  &now,
	}).Error; err != nil {
		return err
	}

	if action != "accept" {
		return nil
	}

	var post entity.CommunityPost
	if err := tx.First(&post, report.PostID).Error; err != nil {
		return err
	}
	fromStatus := post.ReviewStatus
	reason := "report accepted"
	if note != "" {
		reason = "report accepted: " + note
	}
	if err := tx.Model(&entity.CommunityPost{}).Where("id = ?", post.ID).Updates(map[string]interface{}{
		"status":        0,
		"review_status": 3,
		"review_reason": reason,
		"reviewed_by":   adminID,
		"reviewed_at":   &now,
	}).Error; err != nil {
		return err
	}
	log := entity.CommunityReviewLog{
		PostID:           post.ID,
		ReviewerID:       adminID,
		Action:           "hide",
		FromReviewStatus: fromStatus,
		ToReviewStatus:   3,
		Reason:           reason,
		SnapshotTitle:    post.Title,
	}
	return tx.Create(&log).Error
}

func normalizeReportHandleNote(raw string) string {
	note := strings.TrimSpace(raw)
	if note == "" {
		return ""
	}
	templates := map[string]string{
		"spam_ad":       "疑似广告或引流",
		"abuse_hate":    "疑似辱骂/仇恨内容",
		"pornographic":  "疑似低俗不当内容",
		"copyright":     "疑似侵权内容",
		"illegal_other": "疑似违规内容",
		"misreport":     "举报不成立",
	}
	if mapped, ok := templates[note]; ok {
		return mapped
	}
	return note
}

// ReviewPost handles moderator actions: approve/reject/hide/restore.
func (s *CommunityService) ReviewPost(id uint, reviewerID uint, action string, reason string) error {
	var post entity.CommunityPost
	if err := global.GVA_DB.First(&post, id).Error; err != nil {
		return err
	}

	now := time.Now()
	fromStatus := post.ReviewStatus
	toStatus := fromStatus
	updates := map[string]interface{}{
		"review_reason": reason,
		"reviewed_by":   reviewerID,
		"reviewed_at":   &now,
	}

	switch action {
	case "approve":
		toStatus = 1
		updates["review_status"] = 1
		updates["status"] = 1
		updates["published_at"] = &now
	case "reject":
		toStatus = 2
		updates["review_status"] = 2
		updates["status"] = 0
	case "hide":
		toStatus = 3
		updates["review_status"] = 3
		updates["status"] = 0
	case "restore":
		toStatus = 1
		updates["review_status"] = 1
		updates["status"] = 1
		updates["published_at"] = &now
	default:
		return fmt.Errorf("invalid review action")
	}

	log := entity.CommunityReviewLog{
		PostID:           id,
		ReviewerID:       reviewerID,
		Action:           action,
		FromReviewStatus: fromStatus,
		ToReviewStatus:   toStatus,
		Reason:           reason,
		SnapshotTitle:    post.Title,
	}

	return global.GVA_DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entity.CommunityPost{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.Create(&log).Error; err != nil {
			return err
		}
		return nil
	})
}

