package site.niannian.mood;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.content.ContentText;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.List;

@RestController
public class MoodController {

    private final UserService userService;
    private final MoodService moodService;

    public MoodController(UserService userService, MoodService moodService) {
        this.userService = userService;
        this.moodService = moodService;
    }

    public record Items<T>(List<T> items) {
    }

    public record MoodRequest(String mood, String note) {
    }

    public record MoodCreated(boolean ok, Mood item, String soothe) {
    }

    @GetMapping("/api/moods")
    public ApiResponse<Items<Mood>> list() {
        User user = userService.current();
        return ApiResponse.ok(new Items<>(moodService.list(user.getId())));
    }

    /** 记一次心情，顺手把对应的安抚语一起返回，前端不用再请求一次。 */
    @PostMapping("/api/moods")
    public ApiResponse<MoodCreated> create(@RequestBody(required = false) MoodRequest req) {
        User user = userService.current();
        String mood = req == null ? null : req.mood();
        String note = req == null ? null : req.note();
        Mood item = moodService.create(user.getId(), mood, note);
        return ApiResponse.ok(new MoodCreated(true, item, ContentText.soothe(item.getMood())));
    }
}
