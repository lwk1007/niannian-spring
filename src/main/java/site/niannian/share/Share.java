package site.niannian.share;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("shares")
public class Share {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String shareCode;

    /** 1 = 公开页也显示心情/信/思念信，默认 0（默认不公开）。 */
    private Integer includePrivate;

    /** 1 = 允许访客留言/献花/点灯，默认 1（默认允许）。 */
    private Integer allowGuest;

    /** 1 = 访客留言需主人审核后才显示，默认 0（默认即时可见）。 */
    private Integer moderate;

    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getShareCode() {
        return shareCode;
    }

    public void setShareCode(String shareCode) {
        this.shareCode = shareCode;
    }

    public Integer getIncludePrivate() {
        return includePrivate == null ? 0 : includePrivate;
    }

    public void setIncludePrivate(Integer includePrivate) {
        this.includePrivate = includePrivate;
    }

    public Integer getAllowGuest() {
        return allowGuest == null ? 1 : allowGuest;
    }

    public void setAllowGuest(Integer allowGuest) {
        this.allowGuest = allowGuest;
    }

    public Integer getModerate() {
        return moderate == null ? 0 : moderate;
    }

    public void setModerate(Integer moderate) {
        this.moderate = moderate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
