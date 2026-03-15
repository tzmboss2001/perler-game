package response

import "time"

type UserPublicProfile struct {
	ID                uint      `json:"id"`
	Nickname          string    `json:"nickname"`
	Avatar            string    `json:"avatar"`
	Bio               string    `json:"bio"`
	CommunityPostCount int64    `json:"community_post_count"`
	FinishedWorkCount int64     `json:"finished_work_count"`
	TotalLikeCount    int64     `json:"total_like_count"`
	TotalMakeCount    int64     `json:"total_make_count"`
	JoinedAt          time.Time `json:"joined_at"`
}
