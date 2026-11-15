package site.niannian.pet;

import java.time.LocalDate;

/**
 * 对外返回的宠物视图。派生值（陪伴天数、分享码、是否公开私密内容）一律由服务端算好，
 * 前端不再自己拿 sinceDate 做减法 —— 这是从 CSUFT 评审系统学到的做法。
 */
public record PetView(
        Long id,
        String name,
        String type,
        String personality,
        String ownerTitle,
        String traits,
        LocalDate sinceDate,
        String photo,
        String cutout,
        String storageMode,
        int days,
        Stats stats,
        Intimacy intimacy,
        String shareId,
        boolean shareIncludePrivate,
        boolean shareAllowGuest,
        boolean shareModerate,
        Plant plant
) {

    public record Stats(int touch, int feed, int play) {
    }
}
