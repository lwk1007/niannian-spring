package site.niannian.common;

/**
 * 统一响应信封。所有 /api/* 成功与失败都套这一层，前端只需判断 success。
 *
 * <pre>
 * { "success": true,  "code": 200, "message": "success", "data": {...} }
 * { "success": false, "code": 401, "message": "Authentication required", "data": null }
 * </pre>
 */
public record ApiResponse<T>(boolean success, int code, String message, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, 200, "success", data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, 200, message, data);
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        return new ApiResponse<>(false, code, message, null);
    }
}
