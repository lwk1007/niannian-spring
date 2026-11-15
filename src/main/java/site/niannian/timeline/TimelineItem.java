package site.niannian.timeline;

/**
 * 时间轴的一行。id 用 "类型-主键" 拼成字符串，因为前端把它当 key 用，
 * 而不同类型的主键会重复（mood 1 和 letter 1 都是 1）。
 */
public record TimelineItem(String id, String type, long at, String title, String text) {
}
