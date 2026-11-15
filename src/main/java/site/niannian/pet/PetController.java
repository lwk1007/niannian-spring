package site.niannian.pet;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.common.ApiResponse;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.util.Map;

@RestController
public class PetController {

    private final UserService userService;
    private final PetService petService;

    public PetController(UserService userService, PetService petService) {
        this.userService = userService;
        this.petService = petService;
    }

    public record SavedPet(boolean ok, PetView pet) {
    }

    public record InteractRequest(String action) {
    }

    public record InteractResult(boolean ok, String line, PetView.Stats stats, Intimacy intimacy,
            boolean levelUp) {
    }

    /** 领养或修改，同一接口。第一次调用会写下"相遇"这条时间轴。 */
    @PostMapping("/api/pet")
    public ApiResponse<SavedPet> save(@RequestBody(required = false) PetRequest req) {
        User user = userService.current();
        Pet pet = petService.upsert(user.getId(), req == null ? new PetRequest(null, null, null, null,
                null, null, null, null, null) : req);
        return ApiResponse.ok(new SavedPet(true, petService.view(pet)));
    }

    /** 一键抹掉：宠物、心情、信、思念信、胶囊、事件、分享码全部删掉。 */
    @DeleteMapping("/api/pet")
    public ApiResponse<Map<String, Object>> remove() {
        User user = userService.current();
        petService.deleteAll(user.getId());
        return ApiResponse.ok(Map.of("ok", true));
    }

    @PostMapping("/api/pet/interact")
    public ApiResponse<InteractResult> interact(@RequestBody(required = false) InteractRequest req) {
        User user = userService.current();
        PetService.Interaction it = petService.interact(user.getId(), req == null ? null : req.action());
        return ApiResponse.ok(new InteractResult(true, it.line(), it.stats(), it.intimacy(), it.levelUp()));
    }

    public record WateredResult(boolean ok, Plant plant, boolean grew, String line) {
    }

    /** 给纪念植物浇一次水。一天限一次（重复浇水后端 429 兜底）。 */
    @PostMapping("/api/pet/plant/water")
    public ApiResponse<WateredResult> waterPlant() {
        User user = userService.current();
        PetService.Watered w = petService.waterPlant(user.getId());
        return ApiResponse.ok(new WateredResult(true, w.plant(), w.grew(), w.line()));
    }
}
