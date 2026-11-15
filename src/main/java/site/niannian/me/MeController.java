package site.niannian.me;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.auth.Auth;
import site.niannian.common.ApiResponse;
import site.niannian.common.StatsMapper;
import site.niannian.content.ContentCatalog;
import site.niannian.pet.Pet;
import site.niannian.pet.PetService;
import site.niannian.user.User;
import site.niannian.user.UserService;

@RestController
public class MeController {

    private final UserService userService;
    private final PetService petService;
    private final StatsMapper statsMapper;

    public MeController(UserService userService, PetService petService, StatsMapper statsMapper) {
        this.userService = userService;
        this.petService = petService;
        this.statsMapper = statsMapper;
    }

    @GetMapping("/api/me")
    public ApiResponse<MeView> me() {
        String uid = Auth.uid();
        User user = userService.ensure(uid);
        Pet pet = petService.findByUserId(user.getId());

        MeView.Counts counts = new MeView.Counts(
                statsMapper.countMoods(user.getId()),
                statsMapper.countLetters(user.getId()),
                statsMapper.countTributes(user.getId()),
                statsMapper.countCapsules(user.getId())
        );

        MeView.Options options = new MeView.Options(
                ContentCatalog.PERSONAS,
                ContentCatalog.TYPES,
                ContentCatalog.MOODS,
                ContentCatalog.OWNER_TITLES
        );

        return ApiResponse.ok(new MeView(uid, pet != null, petService.view(pet), counts, options));
    }
}
