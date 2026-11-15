package site.niannian.letter;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.List;

@RestController
public class LetterController {

    private final UserService userService;
    private final LetterService letterService;
    private final AiLetterService aiLetterService;

    public LetterController(UserService userService, LetterService letterService,
                            AiLetterService aiLetterService) {
        this.userService = userService;
        this.letterService = letterService;
        this.aiLetterService = aiLetterService;
    }

    public record Items(List<Letter> items) {
    }

    public record Created(boolean ok, Letter item) {
    }

    public record AiStatus(boolean available) {
    }

    @GetMapping("/api/letters")
    public ApiResponse<Items> list() {
        User user = userService.current();
        return ApiResponse.ok(new Items(letterService.listDesc(user.getId())));
    }

    @PostMapping("/api/letters")
    public ApiResponse<Created> create() {
        User user = userService.current();
        return ApiResponse.ok(new Created(true, letterService.create(user.getId())));
    }

    /** 大模型写信：未配置时返回明确错误，前端据此引导。 */
    @PostMapping("/api/letters/ai")
    public ApiResponse<Created> createAi() {
        User user = userService.current();
        return ApiResponse.ok(new Created(true, letterService.createWithAi(user.getId())));
    }

    /** 告诉前端当前是否接好了大模型，好决定要不要露出「用 AI 写一封」。 */
    @GetMapping("/api/letters/ai")
    public ApiResponse<AiStatus> aiStatus() {
        return ApiResponse.ok(new AiStatus(aiLetterService.available()));
    }
}
