package site.niannian.share;

import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.util.HtmlUtils;
import site.niannian.common.Time;
import site.niannian.timeline.TimelineItem;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 公开纪念页走服务端渲染，不是 SPA。
 * 原因很实际：微信、iMessage 抓取预览图只读 HTML 里的 og 标签，前端渲染的页面抓不到。
 */
@Controller
public class SharePageController {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy.M.d");

    private static final Logger log = LoggerFactory.getLogger(SharePageController.class);

    private final ShareService shareService;

    public SharePageController(ShareService shareService) {
        this.shareService = shareService;
    }

    public record Row(String date, String title, String text) {
    }

    public record GuestRow(String name, String text, String date) {
    }

    @GetMapping("/s/{shareId}")
    public String page(@PathVariable String shareId, Model model, HttpServletResponse response) {
        PublicView v;
        try {
            v = shareService.publicViewByCode(shareId);
        } catch (RuntimeException e) {
            // 纪念页是 HTML 页面，出错时不能回 JSON 信封（@RestControllerAdvice 默认会），
            // 否则打开的人看到一串 {"success":false...}
            log.error("纪念页渲染失败 shareId={}", shareId, e);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return "share-error";
        }
        if (v == null) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return "share-404";
        }
        model.addAttribute("v", v);
        model.addAttribute("shareId", shareId);
        model.addAttribute("avatar", avatarHtml(v.pet()));
        model.addAttribute("rows", v.timeline().stream().map(SharePageController::row).toList());
        model.addAttribute("guestRows", v.messages().stream().map(SharePageController::guestRow).toList());
        return "share";
    }

    private static Row row(TimelineItem i) {
        LocalDateTime t = LocalDateTime.ofInstant(Instant.ofEpochMilli(i.at()), ZoneId.systemDefault());
        return new Row(t.format(DAY), i.title(), i.text() == null ? "" : i.text());
    }

    private static GuestRow guestRow(PublicView.GuestMessage m) {
        String name = (m.name() == null || m.name().isBlank()) ? "一位访客" : m.name();
        LocalDateTime t = LocalDateTime.ofInstant(Instant.ofEpochMilli(m.createdAt()), ZoneId.systemDefault());
        return new GuestRow(name, m.content(), t.format(DAY));
    }

    private static String avatarHtml(PublicView.PetPublic pet) {
        String photo = pet.photo();
        if (photo != null && !photo.isBlank()) {
            return "<img src=\"" + HtmlUtils.htmlEscape(photo) + "\" alt=\""
                    + HtmlUtils.htmlEscape(pet.name()) + "\">";
        }
        String type = pet.type() == null ? "cat" : pet.type();
        String fur = "#F1E1CB";
        String ink = "#4A3B2E";
        String ears = switch (type) {
            case "dog" -> "<ellipse cx=\"46\" cy=\"62\" rx=\"16\" ry=\"24\" fill=\"#E4D0B4\"/>"
                    + "<ellipse cx=\"114\" cy=\"62\" rx=\"16\" ry=\"24\" fill=\"#E4D0B4\"/>";
            case "other" -> "<ellipse cx=\"62\" cy=\"30\" rx=\"11\" ry=\"28\" fill=\"" + fur + "\"/>"
                    + "<ellipse cx=\"98\" cy=\"30\" rx=\"11\" ry=\"28\" fill=\"" + fur + "\"/>";
            default -> "<path d=\"M44 52 L38 18 L72 40 Z\" fill=\"" + fur + "\"/>"
                    + "<path d=\"M116 52 L122 18 L88 40 Z\" fill=\"" + fur + "\"/>";
        };
        return """
                <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" style="width:100%%;height:100%%">
                  <rect width="160" height="160" fill="#EFE6D5"/>
                  %s
                  <circle cx="80" cy="86" r="40" fill="%s"/>
                  <ellipse cx="66" cy="82" rx="5" ry="7" fill="%s"/>
                  <ellipse cx="94" cy="82" rx="5" ry="7" fill="%s"/>
                  <path d="M74 96 L86 96 L80 102 Z" fill="%s"/>
                  <path d="M80 102 q -5 6 -10 1" stroke="%s" stroke-width="1.6" fill="none" stroke-linecap="round"/>
                  <path d="M80 102 q 5 6 10 1" stroke="%s" stroke-width="1.6" fill="none" stroke-linecap="round"/>
                </svg>
                """.formatted(ears, fur, ink, ink, ink, ink, ink);
    }
}
