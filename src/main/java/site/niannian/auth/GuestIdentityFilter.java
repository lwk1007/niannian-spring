package site.niannian.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * 匿名身份：没登录也能用。首次访问发一个 32 位 hex 的 nn_uid cookie，
 * 后续所有写入都挂在它下面，不需要注册。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class GuestIdentityFilter extends OncePerRequestFilter {

    public static final String COOKIE = "nn_uid";
    public static final String ATTR = "nn.uid";

    private static final Pattern UID = Pattern.compile("[a-f0-9]{32}");
    private static final int ONE_YEAR = 365 * 24 * 60 * 60;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String uid = read(req);
        if (uid == null) {
            uid = UUID.randomUUID().toString().replace("-", "");
            Cookie c = new Cookie(COOKIE, uid);
            c.setHttpOnly(true);
            c.setPath("/");
            c.setMaxAge(ONE_YEAR);
            c.setAttribute("SameSite", "Lax");
            res.addCookie(c);
        }
        req.setAttribute(ATTR, uid);
        chain.doFilter(req, res);
    }

    private String read(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (COOKIE.equals(c.getName()) && c.getValue() != null && UID.matcher(c.getValue()).matches()) {
                return c.getValue();
            }
        }
        return null;
    }
}
