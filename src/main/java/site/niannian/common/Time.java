package site.niannian.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** 时间统一以毫秒时间戳出接口，前端 new Date(ts) 在任何浏览器里都不会偏时区。 */
public final class Time {

    private Time() {
    }

    public static long millis(LocalDateTime t) {
        return t == null ? 0L : t.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    public static long millis(LocalDate d) {
        return d == null ? 0L : d.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }
}
