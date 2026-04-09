package service

import (
    "bytes"
    "compress/gzip"
    "encoding/base64"
    "encoding/json"
    "errors"
    "io"
    "strings"

    "perler-beads-server/global"
    "perler-beads-server/model/entity"
    "perler-beads-server/model/request"
    "perler-beads-server/model/response"
)

type ProjectService struct{}

var ProjectServiceApp = new(ProjectService)

const compressedProjectBeadDataEncoding = "gzip-base64-json"

func normalizeProjectBeadData(raw map[string]interface{}) entity.JSON {
    if len(raw) == 0 {
        return nil
    }

    encoding, _ := raw["encoding"].(string)
    payload, _ := raw["payload"].(string)
    if encoding == compressedProjectBeadDataEncoding && payload != "" {
        return entity.JSON(raw)
    }

    return compressProjectBeadData(raw)
}

// Create 创建方案
func (s *ProjectService) Create(req *request.CreateProjectReq, userID uint) (uint, error) {
	project := entity.Project{
		UserID:        userID,
		DeviceID:      req.DeviceID,
		Name:          req.Name,
		ThumbnailURL:  req.ThumbnailURL,
		OriginalImage: req.OriginalImage,
		BeadData:      normalizeProjectBeadData(req.BeadData),
		Settings:      entity.JSON(req.Settings),
		Progress:      nil,
		Status:        0,
	}

    if err := global.GVA_DB.Create(&project).Error; err != nil {
        if isBadConnectionError(err) {
            global.GVA_LOG.Warn("Project create hit bad DB connection, retrying once")
            sqlDB, dbErr := global.GVA_DB.DB()
            if dbErr == nil {
                _ = sqlDB.Ping()
            }
            if retryErr := global.GVA_DB.Create(&project).Error; retryErr == nil {
                return project.ID, nil
            } else {
                return 0, retryErr
            }
        }
        return 0, err
    }

    return project.ID, nil
}

// GetList 获取方案列表
func (s *ProjectService) GetList(req *request.ProjectListReq, userID uint) ([]response.ProjectInfo, int64, error) {
    var projects []entity.Project
    var total int64

    db := global.GVA_DB.Model(&entity.Project{})

    if userID > 0 {
        db = db.Where("user_id = ?", userID)
    } else if req.DeviceID != "" {
        db = db.Where("device_id = ?", req.DeviceID)
    } else {
        return nil, 0, errors.New("需要用户ID或设备ID")
    }

    if req.Status != nil {
        db = db.Where("status = ?", *req.Status)
    }

    if err := db.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    offset := (req.Page - 1) * req.PageSize
    if err := db.Order("updated_at DESC").Offset(offset).Limit(req.PageSize).Find(&projects).Error; err != nil {
        return nil, 0, err
    }

    list := make([]response.ProjectInfo, len(projects))
    for i, p := range projects {
        list[i] = response.ProjectInfo{
            ID:           p.ID,
            Name:         p.Name,
            ThumbnailURL: p.ThumbnailURL,
            Settings:     p.Settings,
            Progress:     p.Progress,
            Status:       p.Status,
            CreatedAt:    p.CreatedAt.Format("2006-01-02 15:04:05"),
            UpdatedAt:    p.UpdatedAt.Format("2006-01-02 15:04:05"),
        }
    }

    return list, total, nil
}

// GetByID 获取方案详情
func (s *ProjectService) GetByID(id uint, userID uint, deviceID string) (*response.ProjectDetail, error) {
    var project entity.Project

    db := global.GVA_DB.Where("id = ?", id)
    if userID > 0 {
        db = db.Where("user_id = ?", userID)
    } else if deviceID != "" {
        db = db.Where("device_id = ?", deviceID)
    } else {
        return nil, errors.New("无权访问")
    }

    if err := db.First(&project).Error; err != nil {
        return nil, err
    }

    detail := &response.ProjectDetail{
        ID:            project.ID,
        Name:          project.Name,
        ThumbnailURL:  project.ThumbnailURL,
        OriginalImage: project.OriginalImage,
        BeadData:      expandProjectBeadData(project.BeadData),
        Settings:      project.Settings,
        Progress:      project.Progress,
        Status:        project.Status,
        CreatedAt:     project.CreatedAt.Format("2006-01-02 15:04:05"),
        UpdatedAt:     project.UpdatedAt.Format("2006-01-02 15:04:05"),
    }

    return detail, nil
}

// Update 更新方案
func (s *ProjectService) Update(id uint, req *request.UpdateProjectReq, userID uint, deviceID string) error {
    var project entity.Project

    db := global.GVA_DB.Where("id = ?", id)
    if userID > 0 {
        db = db.Where("user_id = ?", userID)
    } else if deviceID != "" {
        db = db.Where("device_id = ?", deviceID)
    } else {
        return errors.New("无权访问")
    }

    if err := db.First(&project).Error; err != nil {
        return err
    }

    updates := make(map[string]interface{})
    if req.Name != "" {
        updates["name"] = req.Name
    }
	if req.BeadData != nil {
		updates["bead_data"] = normalizeProjectBeadData(req.BeadData)
	}
    if req.Settings != nil {
        updates["settings"] = entity.JSON(req.Settings)
    }
    if req.Status != nil {
        updates["status"] = *req.Status
    }

    if len(updates) == 0 {
        return nil
    }

    return global.GVA_DB.Model(&project).Updates(updates).Error
}

// UpdateProgress 更新制作进度
func (s *ProjectService) UpdateProgress(id uint, req *request.UpdateProgressReq, userID uint, deviceID string) error {
    var project entity.Project

    db := global.GVA_DB.Where("id = ?", id)
    if userID > 0 {
        db = db.Where("user_id = ?", userID)
    } else if deviceID != "" {
        db = db.Where("device_id = ?", deviceID)
    } else {
        return errors.New("无权访问")
    }

    if err := db.First(&project).Error; err != nil {
        return err
    }

    return global.GVA_DB.Model(&project).Update("progress", entity.JSON(req.Progress)).Error
}

// Delete 删除方案
func (s *ProjectService) Delete(id uint, userID uint, deviceID string) error {
    db := global.GVA_DB.Where("id = ?", id)
    if userID > 0 {
        db = db.Where("user_id = ?", userID)
    } else if deviceID != "" {
        db = db.Where("device_id = ?", deviceID)
    } else {
        return errors.New("无权访问")
    }

    result := db.Delete(&entity.Project{})
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return errors.New("方案不存在或无权删除")
    }

    return nil
}

func isBadConnectionError(err error) bool {
    if err == nil {
        return false
    }
    return strings.Contains(strings.ToLower(err.Error()), "bad connection")
}

func compressProjectBeadData(raw map[string]interface{}) entity.JSON {
    if len(raw) == 0 {
        return nil
    }

    jsonBytes, err := json.Marshal(raw)
    if err != nil {
        global.GVA_LOG.Warn("Compress project bead_data skipped: " + err.Error())
        return entity.JSON(raw)
    }

    var buf bytes.Buffer
    gz := gzip.NewWriter(&buf)
    if _, err := gz.Write(jsonBytes); err != nil {
        global.GVA_LOG.Warn("Compress project bead_data write failed: " + err.Error())
        _ = gz.Close()
        return entity.JSON(raw)
    }
    if err := gz.Close(); err != nil {
        global.GVA_LOG.Warn("Compress project bead_data close failed: " + err.Error())
        return entity.JSON(raw)
    }

    return entity.JSON{
        "encoding": compressedProjectBeadDataEncoding,
        "payload":  base64.StdEncoding.EncodeToString(buf.Bytes()),
    }
}

func expandProjectBeadData(raw map[string]interface{}) map[string]interface{} {
    if len(raw) == 0 {
        return raw
    }

    encoding, _ := raw["encoding"].(string)
    payload, _ := raw["payload"].(string)
    if encoding != compressedProjectBeadDataEncoding || payload == "" {
        return raw
    }

    compressedBytes, err := base64.StdEncoding.DecodeString(payload)
    if err != nil {
        global.GVA_LOG.Warn("Decode compressed project bead_data failed: " + err.Error())
        return raw
    }

    reader, err := gzip.NewReader(bytes.NewReader(compressedBytes))
    if err != nil {
        global.GVA_LOG.Warn("Open gzip project bead_data failed: " + err.Error())
        return raw
    }
    defer reader.Close()

    jsonBytes, err := io.ReadAll(reader)
    if err != nil {
        global.GVA_LOG.Warn("Read gzip project bead_data failed: " + err.Error())
        return raw
    }

    var expanded map[string]interface{}
    if err := json.Unmarshal(jsonBytes, &expanded); err != nil {
        global.GVA_LOG.Warn("Unmarshal compressed project bead_data failed: " + err.Error())
        return raw
    }

    if len(expanded) == 0 {
        return raw
    }

    return expanded
}
