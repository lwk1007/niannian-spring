package site.niannian.tribute;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.List;

@RestController
public class TributeController {

    private final UserService userService;
    private final TributeService tributeService;

    public TributeController(UserService userService, TributeService tributeService) {
        this.userService = userService;
        this.tributeService = tributeService;
    }

    public record Items(List<Tribute> items, int lit) {
    }

    public record TributeRequest(String content) {
    }

    public record Created(boolean ok, Tribute item, int lit) {
    }

    @GetMapping("/api/tributes")
    public ApiResponse<Items> list() {
        User user = userService.current();
        return ApiResponse.ok(new Items(tributeService.listDesc(user.getId()), tributeService.lit(user.getId())));
    }

    @PostMapping("/api/tributes")
    public ApiResponse<Created> create(@RequestBody(required = false) TributeRequest req) {
        User user = userService.current();
        Tribute item = tributeService.create(user.getId(), req == null ? null : req.content());
        return ApiResponse.ok(new Created(true, item, tributeService.lit(user.getId())));
    }
}
