package site.niannian.visitor;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.common.BizException;
import site.niannian.share.Share;
import site.niannian.share.ShareService;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.List;
import java.util.Map;

@RestController
public class VisitorTributeController {

    private final UserService userService;
    private final ShareService shareService;
    private final VisitorTributeService visitorTributeService;

    public VisitorTributeController(UserService userService, ShareService shareService,
                                    VisitorTributeService visitorTributeService) {
        this.userService = userService;
        this.shareService = shareService;
        this.visitorTributeService = visitorTributeService;
    }

    public record GuestSubmit(boolean ok, boolean pending) {
    }

    public record GuestReq(String kind, String content, String name) {
    }

    public record AdminItems(List<VisitorTribute> items, long pending,
                             long flowers, long candles) {
    }

    /** 访客提交：凭分享码即可，无需登录。留言 / 献花 / 点灯都走这里。 */
    @PostMapping("/api/public/{shareId}/tribute")
    public ApiResponse<GuestSubmit> submit(@PathVariable String shareId,
                                           @RequestBody(required = false) GuestReq req) {
        Share share = shareService.findByCode(shareId);
        if (share == null) throw new BizException(404, "这个纪念页不存在或已被主人关闭");
        if (share.getAllowGuest() == 0) throw new BizException(403, "主人暂未开放留言与献花");

        VisitorTribute t = visitorTributeService.add(share.getUserId(),
                req == null ? null : req.kind(),
                req == null ? null : req.content(),
                req == null ? null : req.name(),
                share.getModerate() == 1);
        return ApiResponse.ok(new GuestSubmit(true, t.getStatus() == VisitorTribute.STATUS_PENDING));
    }

    /** 主人侧：全部访客互动（含待审核），按时间倒序。 */
    @GetMapping("/api/visitor-tributes")
    public ApiResponse<AdminItems> list() {
        User user = userService.current();
        List<VisitorTribute> items = visitorTributeService.listAll(user.getId());
        return ApiResponse.ok(new AdminItems(items,
                visitorTributeService.pendingCount(user.getId()),
                visitorTributeService.countKind(user.getId(), VisitorTribute.KIND_FLOWER),
                visitorTributeService.countKind(user.getId(), VisitorTribute.KIND_CANDLE)));
    }

    /** 主人侧：审核留言（通过 / 隐藏）。 */
    @PutMapping("/api/visitor-tributes/{id}")
    public ApiResponse<Map<String, Object>> setStatus(@PathVariable Long id,
                                                      @RequestBody StatusReq req) {
        User user = userService.current();
        int status = Boolean.TRUE.equals(req.hide())
                ? VisitorTribute.STATUS_HIDDEN
                : VisitorTribute.STATUS_APPROVED;
        visitorTributeService.setStatus(user.getId(), id, status);
        return ApiResponse.ok(Map.of("ok", true));
    }

    public record StatusReq(Boolean hide) {
    }

    @DeleteMapping("/api/visitor-tributes/{id}")
    public ApiResponse<Map<String, Object>> delete(@PathVariable Long id) {
        User user = userService.current();
        visitorTributeService.delete(user.getId(), id);
        return ApiResponse.ok(Map.of("ok", true));
    }
}
