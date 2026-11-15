package site.niannian.export;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import site.niannian.capsule.CapsuleService;
import site.niannian.common.ApiResponse;
import site.niannian.event.Event;
import site.niannian.event.EventService;
import site.niannian.letter.Letter;
import site.niannian.letter.LetterService;
import site.niannian.mood.Mood;
import site.niannian.mood.MoodService;
import site.niannian.pet.PetView;
import site.niannian.pet.PetService;
import site.niannian.tribute.Tribute;
import site.niannian.tribute.TributeService;
import site.niannian.user.User;
import site.niannian.user.UserService;

import java.time.OffsetDateTime;
import java.util.List;

/** 数据可导出：用户自己的东西，随时能整包带走。 */
@RestController
public class ExportController {

    private final UserService userService;
    private final PetService petService;
    private final MoodService moodService;
    private final LetterService letterService;
    private final TributeService tributeService;
    private final CapsuleService capsuleService;
    private final EventService eventService;

    public ExportController(UserService userService, PetService petService, MoodService moodService,
                            LetterService letterService, TributeService tributeService,
                            CapsuleService capsuleService, EventService eventService) {
        this.userService = userService;
        this.petService = petService;
        this.moodService = moodService;
        this.letterService = letterService;
        this.tributeService = tributeService;
        this.capsuleService = capsuleService;
        this.eventService = eventService;
    }

    public record ExportData(
            String exportedAt,
            PetView pet,
            List<Mood> moods,
            List<Letter> letters,
            List<Tribute> tributes,
            List<CapsuleService.CapsuleView> capsules,
            List<Event> events
    ) {
    }

    @GetMapping("/api/export")
    public ApiResponse<ExportData> export() {
        User user = userService.current();
        Long id = user.getId();
        return ApiResponse.ok(new ExportData(
                OffsetDateTime.now().toString(),
                petService.view(petService.findByUserId(id)),
                moodService.list(id),
                letterService.listDesc(id),
                tributeService.listDesc(id),
                capsuleService.list(id),
                eventService.listByUser(id)
        ));
    }
}
