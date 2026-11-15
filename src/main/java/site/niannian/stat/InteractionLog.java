package site.niannian.stat;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

/**
 * 互动明细：每次 touch/feed/play 落一条，带时间戳。
 * 与 pets 表上的累计计数（stat_*）互补 —— 累计回答「几次」，明细回答「什么时候」。
 */
@TableName("interactions")
public class InteractionLog {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String action;
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

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
