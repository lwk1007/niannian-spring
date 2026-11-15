package site.niannian.pet;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("pets")
public class Pet {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String name;
    private String type;
    private String personality;
    private String ownerTitle;
    private String traits;
    private LocalDate sinceDate;
    private String photo;
    /** 抠图贴纸：主体已从背景里分离的透明 PNG（base64），用于场景舞台叠加。 */
    private String cutout;
    private String storageMode;

    /** 三种互动各自的累计次数，分开存以便直接回答"摸过几次"。 */
    private Integer statTouch;
    private Integer statFeed;
    private Integer statPlay;
    /** 为它点亮的灯数，独立成一个计数器，避免每次点灯都去 count 寄托表。 */
    private Integer lit;

    /** 纪念植物浇水次数（成长阶段由此派生，不另存阶段）。 */
    private Integer plantWatered;
    /** 上次浇水日期，用于「一天最多浇一次」的克制限制。 */
    private LocalDate plantLastWatered;

    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getPersonality() {
        return personality;
    }

    public void setPersonality(String personality) {
        this.personality = personality;
    }

    public String getOwnerTitle() {
        return ownerTitle;
    }

    public void setOwnerTitle(String ownerTitle) {
        this.ownerTitle = ownerTitle;
    }

    public String getTraits() {
        return traits;
    }

    public void setTraits(String traits) {
        this.traits = traits;
    }

    public LocalDate getSinceDate() {
        return sinceDate;
    }

    public void setSinceDate(LocalDate sinceDate) {
        this.sinceDate = sinceDate;
    }

    public String getPhoto() {
        return photo;
    }

    public void setPhoto(String photo) {
        this.photo = photo;
    }

    public String getCutout() {
        return cutout;
    }

    public void setCutout(String cutout) {
        this.cutout = cutout;
    }

    public String getStorageMode() {
        return storageMode;
    }

    public void setStorageMode(String storageMode) {
        this.storageMode = storageMode;
    }

    public Integer getStatTouch() {
        return statTouch == null ? 0 : statTouch;
    }

    public void setStatTouch(Integer statTouch) {
        this.statTouch = statTouch;
    }

    public Integer getStatFeed() {
        return statFeed == null ? 0 : statFeed;
    }

    public void setStatFeed(Integer statFeed) {
        this.statFeed = statFeed;
    }

    public Integer getStatPlay() {
        return statPlay == null ? 0 : statPlay;
    }

    public void setStatPlay(Integer statPlay) {
        this.statPlay = statPlay;
    }

    public Integer getLit() {
        return lit == null ? 0 : lit;
    }

    public void setLit(Integer lit) {
        this.lit = lit;
    }

    public Integer getPlantWatered() {
        return plantWatered == null ? 0 : plantWatered;
    }

    public void setPlantWatered(Integer plantWatered) {
        this.plantWatered = plantWatered;
    }

    public LocalDate getPlantLastWatered() {
        return plantLastWatered;
    }

    public void setPlantLastWatered(LocalDate plantLastWatered) {
        this.plantLastWatered = plantLastWatered;
    }

    public LocalDateTime getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(LocalDateTime lastSeen) {
        this.lastSeen = lastSeen;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
