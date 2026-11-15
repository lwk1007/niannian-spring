package site.niannian.common;

/**
 * 业务异常。code 同时作为 HTTP 状态码返回，message 直接展示给用户。
 */
public class BizException extends RuntimeException {

    private final int code;

    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static BizException notFound(String what) {
        return new BizException(404, what + " 不存在");
    }

    public static BizException badRequest(String message) {
        return new BizException(400, message);
    }

    public static BizException unauthorized() {
        return new BizException(401, "Authentication required");
    }

    public static BizException forbidden(String message) {
        return new BizException(403, message);
    }
}
