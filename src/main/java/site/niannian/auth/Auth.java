package site.niannian.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import site.niannian.common.BizException;

/** 取当前请求的匿名身份 uid。 */
public final class Auth {

    private Auth() {
    }

    public static String uid() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) {
            throw BizException.unauthorized();
        }
        HttpServletRequest req = attrs.getRequest();
        Object uid = req.getAttribute(GuestIdentityFilter.ATTR);
        if (uid == null) throw BizException.unauthorized();
        return uid.toString();
    }
}
