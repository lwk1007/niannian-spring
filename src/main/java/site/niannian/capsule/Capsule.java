package site.niannian.capsule;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

/**
 * 时光胶囊。未到 openAt 之前，服务端连内容都不返回 —— 不是前端藏起来，
 * 是接口层面就拿不到，避免"看一眼源码就提前读到"。
 */
@TableName("capsules")
public class Capsule {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String content;
    private LocalDateTime openAt;
    private Integer opened;
    private LocalDateTime openedAt;
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

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getOpenAt() {
        return openAt;
    }

    public void setOpenAt(LocalDateTime openAt) {
        this.openAt = openAt;
    }

    public Integer getOpened() {
        return opened == null ? 0 : opened;
    }

    public void setOpened(Integer opened) {
        this.opened = opened;
    }

    public LocalDateTime getOpenedAt() {
        return openedAt;
    }

    public void setOpenedAt(LocalDateTime openedAt) {
        this.openedAt = openedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
