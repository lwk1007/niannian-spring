package site.niannian.share;

import site.niannian.timeline.TimelineItem;

import java.time.LocalDate;
import java.util.List;

/** 公开纪念页的数据。只读、无身份、可被任何人打开，所以字段要克制。 */
public record PublicView(
        PetPublic pet,
        int days,
        int candles,
        List<TributePublic> tributes,
        List<TimelineItem> timeline,
        int flowers,
        int guestCandles,
        List<GuestMessage> messages,
        boolean allowGuest,
        boolean moderate
) {

    public record PetPublic(
            String name,
            String type,
            String personality,
            String personalityLabel,
            LocalDate sinceDate,
            String photo,
            String ownerTitle
    ) {
    }

    public record TributePublic(String content, long createdAt) {
    }

    /** 访客留言：匿名时 name 为空，前端显示「一位访客」。 */
    public record GuestMessage(String name, String content, long createdAt) {
    }
}
