package site.niannian.visitor;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

/**
 * 访客在公开纪念页留下的互动：留言 / 献花 / 点灯。
 * 与主人自己的「思念信」（tributes）分开，因为它是没有身份的、任何人都能留下的一笔。
 */
@TableName("visitor_tributes")
public class VisitorTribute {

    public static final String KIND_MESSAGE = "message";
    public static final String KIND_FLOWER = "flower";
    public static final String KIND_CANDLE = "candle";

    /** 待审核（主人开了「留言需审核」时默认进入此态） */
    public static final int STATUS_PENDING = 0;
    /** 已通过、公开可见 */
    public static final int STATUS_APPROVED = 1;
    /** 被主人隐藏（保留记录，不展示） */
    public static final int STATUS_HIDDEN = 2;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String kind;
    private String content;
    private String name;
    private Integer status;
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

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getStatus() {
        return status == null ? STATUS_PENDING : status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
