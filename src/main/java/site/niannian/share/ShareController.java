package site.niannian.share;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.common.BizException;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.Map;

@RestController
public class ShareController {

    private final UserService userService;
    private final ShareService shareService;

    public ShareController(UserService userService, ShareService shareService) {
        this.userService = userService;
        this.shareService = shareService;
    }

    public record ShareRequest(Boolean includePrivate) {
    }

    public record ShareResult(boolean ok, String shareId, String path) {
    }

    @PostMapping("/api/share")
    public ApiResponse<ShareResult> open(@RequestBody(required = false) ShareRequest req) {
        User user = userService.current();
        boolean includePrivate = req != null && Boolean.TRUE.equals(req.includePrivate());
        Share share = shareService.getOrCreate(user.getId(), includePrivate);
        return ApiResponse.ok(new ShareResult(true, share.getShareCode(), "/s/" + share.getShareCode()));
    }

    @PostMapping("/api/share/off")
    public ApiResponse<Map<String, Object>> off() {
        User user = userService.current();
        shareService.disable(user.getId());
        return ApiResponse.ok(Map.of("ok", true));
    }

    public record GuestRequest(Boolean allowGuest, Boolean moderate) {
    }

    /** 设置访客互动：是否允许留言/献花/点灯、留言是否需审核。 */
    @PostMapping("/api/share/guest")
    public ApiResponse<Map<String, Object>> setGuest(@RequestBody(required = false) GuestRequest req) {
        User user = userService.current();
        boolean allowGuest = req == null || !Boolean.FALSE.equals(req.allowGuest());
        boolean moderate = req != null && Boolean.TRUE.equals(req.moderate());
        shareService.setGuest(user.getId(), allowGuest, moderate);
        return ApiResponse.ok(Map.of("ok", true));
    }

    /** 公开读：任何人凭链接都能拿，不需要 cookie。 */
    @GetMapping("/api/public/{shareId}")
    public ApiResponse<PublicView> publicView(@org.springframework.web.bind.annotation.PathVariable String shareId) {
        PublicView view = shareService.publicViewByCode(shareId);
        if (view == null) throw new BizException(404, "这个纪念页不存在或已被主人关闭");
        return ApiResponse.ok(view);
    }
}
